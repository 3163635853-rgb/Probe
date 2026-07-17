from __future__ import annotations

import json
import secrets
import uuid as uuid_lib
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Literal, Mapping, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from api.quota import ensure_quota_initialized, _quota_key
from config import settings
from db.mysql import get_db
from db.redis import redis_client
from models.coupon import Coupon, UserCoupon
from models.payment import Payment, Subscription
from models.user import User
from services.wechat_pay import WeChatPayError, wechat_pay_client

router = APIRouter(prefix="/api/payment", tags=["payment"])
logger = structlog.get_logger()

PLANS = [
    {"product_type": "monthly", "name": "月卡", "price": 29.00, "original_price": 29.00, "description": "无限面试+完整报告"},
    {"product_type": "yearly", "name": "年卡", "price": 199.00, "original_price": 348.00, "description": "月卡全部+专属题库"},
    {"product_type": "single", "name": "单次", "price": 5.00, "original_price": 5.00, "description": "单次面试"},
]

ORDER_TTL_MINUTES = 15


class CreateOrderRequest(BaseModel):
    product_type: str
    coupon_id: Optional[int] = None
    payment_method: Literal["jsapi", "h5"] = "jsapi"


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def money(value: object) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_coupon_discount(coupon: Coupon, amount: Decimal, product_type: str) -> Decimal:
    if coupon.coupon_type != "discount":
        raise ValueError("该优惠券不能用于购买套餐")
    applicable = coupon.applicable_products
    if isinstance(applicable, list) and applicable and product_type not in applicable:
        raise ValueError("该优惠券不适用于当前套餐")
    if amount < money(coupon.min_amount):
        raise ValueError("订单金额未达到优惠券使用门槛")
    percent = max(0, min(100, int(coupon.value)))
    return (amount * Decimal(percent) / Decimal(100)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


async def _select_coupon(
    db: AsyncSession,
    *,
    user_id: int,
    user_coupon_id: int,
    product_type: str,
    plan_price: Decimal,
) -> tuple[UserCoupon, Coupon, Decimal]:
    result = await db.execute(
        select(UserCoupon, Coupon)
        .join(Coupon, Coupon.id == UserCoupon.coupon_id)
        .where(UserCoupon.id == user_coupon_id, UserCoupon.user_id == user_id)
        .with_for_update()
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"code": 40402, "message": "优惠券不存在"})
    user_coupon, coupon = row
    now = utcnow()

    if user_coupon.status == "locked" and user_coupon.used_payment_id:
        locked_payment = await db.get(Payment, user_coupon.used_payment_id)
        if locked_payment and locked_payment.status in ("failed", "cancelled"):
            user_coupon.status = "unused"
            user_coupon.used_payment_id = None
        elif locked_payment and locked_payment.expires_at and locked_payment.expires_at <= now:
            locked_payment.status = "cancelled"
            user_coupon.status = "unused"
            user_coupon.used_payment_id = None

    if user_coupon.status != "unused":
        raise HTTPException(status_code=409, detail={"code": 40902, "message": "优惠券已被使用或占用"})
    if user_coupon.expire_at <= now or (coupon.expire_at and coupon.expire_at <= now):
        user_coupon.status = "expired"
        raise HTTPException(status_code=400, detail={"code": 40203, "message": "优惠券已过期"})
    if not coupon.is_active or (coupon.start_at and coupon.start_at > now):
        raise HTTPException(status_code=400, detail={"code": 40203, "message": "优惠券当前不可用"})
    try:
        discount = calculate_coupon_discount(coupon, plan_price, product_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"code": 40203, "message": str(exc)}) from exc
    return user_coupon, coupon, discount


@router.get("/plans")
async def get_plans():
    return {"code": 0, "data": PLANS}


@router.post("/create")
async def create_order(
    req: CreateOrderRequest,
    request: Request,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    plan = next((p for p in PLANS if p["product_type"] == req.product_type), None)
    if not plan:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "无效的产品类型"})
    if req.payment_method == "jsapi" and not user.openid:
        raise HTTPException(status_code=400, detail={"code": 40103, "message": "请先使用微信登录后再购买"})
    try:
        wechat_pay_client.require_configured()
    except WeChatPayError as exc:
        logger.error("wechat_pay_not_configured", error=str(exc))
        raise HTTPException(status_code=503, detail={"code": 50301, "message": "支付服务暂不可用"}) from exc

    now = utcnow()
    order_no = f"PROBE{now.strftime('%Y%m%d%H%M%S')}{secrets.token_hex(4)}"
    original_amount = money(plan["original_price"])
    plan_price = money(plan["price"])
    coupon_discount = Decimal("0.00")
    user_coupon: UserCoupon | None = None

    if req.coupon_id is not None:
        user_coupon, _, coupon_discount = await _select_coupon(
            db,
            user_id=user.id,
            user_coupon_id=req.coupon_id,
            product_type=req.product_type,
            plan_price=plan_price,
        )
    pay_amount = max(Decimal("0.01"), plan_price - coupon_discount)
    discount_amount = original_amount - pay_amount

    payment = Payment(
        uuid=str(uuid_lib.uuid4()),
        user_id=user.id,
        order_no=order_no,
        product_type=req.product_type,
        original_amount=original_amount,
        discount_amount=discount_amount,
        pay_amount=pay_amount,
        coupon_id=req.coupon_id,
        status="pending",
        expires_at=now + timedelta(minutes=ORDER_TTL_MINUTES),
    )
    db.add(payment)
    await db.flush()
    if user_coupon:
        user_coupon.status = "locked"
        user_coupon.used_payment_id = payment.id
    await db.commit()

    try:
        wx_pay_params = None
        h5_url = None
        if req.payment_method == "jsapi":
            wx_pay_params = await wechat_pay_client.create_jsapi_order(
                order_no=order_no,
                description=f"Probe {plan['name']}",
                amount_cents=int(pay_amount * 100),
                payer_openid=user.openid or "",
            )
        else:
            forwarded_for = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            client_ip = forwarded_for or (request.client.host if request.client else "127.0.0.1")
            h5_url = await wechat_pay_client.create_h5_order(
                order_no=order_no,
                description=f"Probe {plan['name']}",
                amount_cents=int(pay_amount * 100),
                payer_client_ip=client_ip,
            )
    except Exception as exc:
        logger.error("wechat_pay_create_failed", order_no=order_no, error=str(exc))
        payment.status = "failed"
        if user_coupon:
            user_coupon.status = "unused"
            user_coupon.used_payment_id = None
        await db.commit()
        raise HTTPException(status_code=502, detail={"code": 50201, "message": "微信支付下单失败，请稍后重试"}) from exc

    return {
        "code": 0,
        "data": {
            "order_uuid": payment.uuid,
            "order_no": order_no,
            "pay_amount": float(pay_amount),
            "discount_amount": float(discount_amount),
            "expires_at": payment.expires_at.isoformat(),
            "payment_method": req.payment_method,
            "wx_pay_params": wx_pay_params,
            "h5_url": h5_url,
        },
    }


async def _apply_paid_order(db: AsyncSession, payment: Payment, transaction: Mapping[str, Any]) -> None:
    if payment.status == "paid":
        return
    now = utcnow()
    payment.status = "paid"
    payment.wx_transaction_id = str(transaction.get("transaction_id") or "")[:64]
    payment.paid_at = now

    if payment.coupon_id:
        coupon_result = await db.execute(
            select(UserCoupon)
            .where(UserCoupon.id == payment.coupon_id, UserCoupon.user_id == payment.user_id)
            .with_for_update()
        )
        user_coupon = coupon_result.scalar_one_or_none()
        if user_coupon:
            user_coupon.status = "used"
            user_coupon.used_at = now
            user_coupon.used_payment_id = payment.id

    if payment.product_type in ("monthly", "yearly"):
        days = 30 if payment.product_type == "monthly" else 365
        sub_result = await db.execute(
            select(Subscription)
            .where(Subscription.user_id == payment.user_id, Subscription.status == "active")
            .order_by(desc(Subscription.expire_at))
            .limit(1)
            .with_for_update()
        )
        existing_sub = sub_result.scalar_one_or_none()
        if existing_sub and existing_sub.expire_at > now:
            existing_sub.expire_at += timedelta(days=days)
            existing_sub.plan = payment.product_type
            new_expire = existing_sub.expire_at
        else:
            new_expire = now + timedelta(days=days)
            db.add(
                Subscription(
                    user_id=payment.user_id,
                    plan=payment.product_type,
                    status="active",
                    started_at=now,
                    expire_at=new_expire,
                )
            )
        user = await db.get(User, payment.user_id)
        if user:
            user.membership_type = payment.product_type
            user.membership_expire_at = new_expire


async def _fulfill_redis_entitlement(payment: Payment, db: AsyncSession) -> None:
    user = await db.get(User, payment.user_id)
    if not user:
        return
    await ensure_quota_initialized(user)
    key = _quota_key(user.id)
    if payment.product_type in ("monthly", "yearly"):
        ttl = await redis_client.ttl(key)
        if ttl and ttl > 0:
            await redis_client.set(key, 9999, ex=ttl)
        else:
            await redis_client.set(key, 9999)
    elif payment.product_type == "single":
        await redis_client.incr(key)


@router.post("/webhook")
async def payment_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body_bytes = await request.body()
    body = body_bytes.decode("utf-8")
    try:
        wechat_pay_client.verify_signature(request.headers, body)
        event = json.loads(body)
        if event.get("event_type") != "TRANSACTION.SUCCESS":
            return {"code": "SUCCESS", "message": "成功"}
        transaction = wechat_pay_client.decrypt_callback_resource(event.get("resource") or {})
    except (WeChatPayError, json.JSONDecodeError) as exc:
        logger.warning("wechat_pay_webhook_rejected", error=str(exc))
        return JSONResponse(status_code=401, content={"code": "FAIL", "message": "签名或报文无效"})

    order_no = str(transaction.get("out_trade_no") or "")
    result = await db.execute(
        select(Payment).where(Payment.order_no == order_no).with_for_update()
    )
    payment = result.scalar_one_or_none()
    if not payment:
        return JSONResponse(status_code=404, content={"code": "FAIL", "message": "订单不存在"})

    amount = transaction.get("amount") or {}
    if (
        transaction.get("trade_state") != "SUCCESS"
        or transaction.get("appid") != settings.WX_APP_ID
        or transaction.get("mchid") != settings.WECHAT_PAY_MCH_ID
        or int(amount.get("total") or -1) != int(money(payment.pay_amount) * 100)
    ):
        logger.warning("wechat_pay_transaction_mismatch", order_no=order_no)
        return JSONResponse(status_code=400, content={"code": "FAIL", "message": "订单信息不匹配"})

    try:
        await _apply_paid_order(db, payment, transaction)
        await db.commit()
        if payment.fulfilled_at is None:
            await _fulfill_redis_entitlement(payment, db)
            payment.fulfilled_at = utcnow()
            await db.commit()

        from services.notifications import create_notification, push_to_user
        product_names = {"single": "单次面试", "monthly": "月度会员", "yearly": "年度会员"}
        product_name = product_names.get(payment.product_type, payment.product_type)
        title = "支付成功，权益已到账"
        content = f"{product_name}已生效，可立即开始新的面试训练。"
        related_url = f"/orders?order={payment.uuid}"
        _, notification_created = await create_notification(
            db,
            user_id=payment.user_id,
            title=title,
            content=content,
            type_name="payment",
            related_url=related_url,
        )
        await db.commit()
        if notification_created:
            try:
                await push_to_user(
                    db,
                    user_id=payment.user_id,
                    title=title,
                    content=content,
                    related_url="/membership",
                )
            except Exception:
                pass
    except Exception as exc:
        await db.rollback()
        logger.error("wechat_pay_fulfillment_failed", order_no=order_no, error=str(exc))
        return JSONResponse(status_code=500, content={"code": "FAIL", "message": "订单处理失败"})

    return {"code": "SUCCESS", "message": "成功"}


@router.get("/orders")
async def get_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    offset = (page - 1) * page_size
    count_result = await db.execute(select(func.count()).select_from(Payment).where(Payment.user_id == user.id))
    total = count_result.scalar() or 0
    result = await db.execute(
        select(Payment).where(Payment.user_id == user.id).order_by(desc(Payment.created_at)).offset(offset).limit(page_size)
    )
    payments = result.scalars().all()
    return {
        "code": 0,
        "data": {
            "items": [
                {
                    "order_uuid": p.uuid,
                    "product_type": p.product_type,
                    "pay_amount": float(p.pay_amount),
                    "status": p.status,
                    "created_at": p.created_at.isoformat(),
                    "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                }
                for p in payments
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": offset + page_size < total,
        },
    }
