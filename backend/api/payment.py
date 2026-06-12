import uuid as uuid_lib
import time
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import Optional

from config import settings
from db.mysql import get_db
from models.user import User
from models.payment import Payment, Subscription
from api.deps import get_current_user

router = APIRouter(prefix="/api/payment", tags=["payment"])

# 定价方案
PLANS = [
    {"product_type": "monthly", "name": "月卡", "price": 29.00, "original_price": 29.00, "description": "无限面试+完整报告"},
    {"product_type": "yearly", "name": "年卡", "price": 199.00, "original_price": 348.00, "description": "月卡全部+专属题库"},
    {"product_type": "single", "name": "单次", "price": 5.00, "original_price": 5.00, "description": "单次面试"},
]


class CreateOrderRequest(BaseModel):
    product_type: str
    coupon_id: Optional[int] = None


@router.get("/plans")
async def get_plans():
    return {"code": 0, "data": PLANS}


@router.post("/create")
async def create_order(
    req: CreateOrderRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth

    plan = next((p for p in PLANS if p["product_type"] == req.product_type), None)
    if not plan:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "无效的产品类型"})

    order_no = f"PROBE{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}{secrets.token_hex(4)}"
    payment = Payment(
        uuid=str(uuid_lib.uuid4()),
        user_id=user.id,
        order_no=order_no,
        product_type=req.product_type,
        original_amount=plan["original_price"],
        discount_amount=0,
        pay_amount=plan["price"],
        status="pending",
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    # TODO: 实际对接微信支付 JSAPI，这里返回 mock
    return {
        "code": 0,
        "data": {
            "order_uuid": payment.uuid,
            "order_no": order_no,
            "pay_amount": float(payment.pay_amount),
            "discount_amount": 0,
            "wx_pay_params": None,  # 生产环境返回真实微信支付参数
        },
    }


@router.post("/webhook")
async def payment_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """微信支付回调（生产环境需验签）"""
    if not settings.DEBUG:
        # TODO: 实现微信支付签名验证
        raise HTTPException(status_code=403, detail={"code": 40301, "message": "签名验证未实现"})

    body = await request.json()
    order_no = body.get("order_no", "")
    transaction_id = body.get("transaction_id", "")

    result = await db.execute(select(Payment).where(Payment.order_no == order_no))
    payment = result.scalar_one_or_none()
    if not payment or payment.status != "pending":
        return {"code": 0, "message": "ignored"}

    # 更新支付状态
    payment.status = "paid"
    payment.wx_transaction_id = transaction_id
    payment.paid_at = datetime.now(timezone.utc)

    # 创建/续期订阅
    if payment.product_type in ("monthly", "yearly"):
        days = 30 if payment.product_type == "monthly" else 365
        now = datetime.now(timezone.utc)

        # 查现有订阅
        sub_result = await db.execute(
            select(Subscription).where(
                Subscription.user_id == payment.user_id,
                Subscription.status == "active",
            )
        )
        existing_sub = sub_result.scalar_one_or_none()

        if existing_sub and existing_sub.expire_at > now:
            # 续期
            existing_sub.expire_at = existing_sub.expire_at + timedelta(days=days)
            new_expire = existing_sub.expire_at
        else:
            # 新建
            new_expire = now + timedelta(days=days)
            sub = Subscription(
                user_id=payment.user_id,
                plan=payment.product_type,
                status="active",
                started_at=now,
                expire_at=new_expire,
            )
            db.add(sub)

        # 更新用户会员
        user = await db.get(User, payment.user_id)
        if user:
            user.membership_type = payment.product_type
            user.membership_expire_at = new_expire

    await db.commit()
    return {"code": 0, "message": "success"}


@router.get("/orders")
async def get_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(func.count()).select_from(Payment).where(Payment.user_id == user.id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Payment)
        .where(Payment.user_id == user.id)
        .order_by(desc(Payment.created_at))
        .offset(offset).limit(page_size)
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


@router.get("/subscription/current")
async def get_subscription(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        ).order_by(desc(Subscription.expire_at)).limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return {"code": 0, "data": None}

    now = datetime.now(timezone.utc)
    return {
        "code": 0,
        "data": {
            "plan": sub.plan,
            "status": sub.status,
            "started_at": sub.started_at.isoformat(),
            "expire_at": sub.expire_at.isoformat(),
            "auto_renew": sub.auto_renew,
            "days_remaining": max(0, (sub.expire_at - now).days),
        },
    }
