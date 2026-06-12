from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from db.mysql import get_db
from models.coupon import Coupon, UserCoupon
from api.deps import get_current_user

router = APIRouter(prefix="/api/coupon", tags=["coupon"])


@router.get("/mine")
async def my_coupons(
    status: str = Query("unused"),
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    where = [UserCoupon.user_id == user.id]
    if status != "all":
        where.append(UserCoupon.status == status)

    result = await db.execute(select(UserCoupon).where(*where))
    user_coupons = result.scalars().all()

    # 批量查 coupon 信息
    coupon_ids = {uc.coupon_id for uc in user_coupons}
    coupon_map = {}
    if coupon_ids:
        c_result = await db.execute(select(Coupon).where(Coupon.id.in_(coupon_ids)))
        coupon_map = {c.id: c for c in c_result.scalars().all()}

    items = []
    for uc in user_coupons:
        c = coupon_map.get(uc.coupon_id)
        items.append({
            "id": uc.id,
            "name": c.name if c else "",
            "coupon_type": c.coupon_type if c else "",
            "value": c.value if c else 0,
            "status": uc.status,
            "expire_at": uc.expire_at.isoformat(),
        })

    return {"code": 0, "data": items}


class RedeemRequest(BaseModel):
    code: str


@router.post("/redeem")
async def redeem_coupon(
    req: RedeemRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """兑换优惠券码"""
    user, _ = auth

    # 查优惠券（用 name 当兑换码，简化）
    result = await db.execute(
        select(Coupon).where(Coupon.name == req.code, Coupon.is_active.is_(True))
    )
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "优惠券码无效"})

    now = datetime.now(timezone.utc)
    if coupon.expire_at and coupon.expire_at < now:
        raise HTTPException(status_code=400, detail={"code": 40203, "message": "优惠券已过期"})
    if coupon.total_stock > 0 and coupon.issued_count >= coupon.total_stock:
        raise HTTPException(status_code=400, detail={"code": 40203, "message": "优惠券已领完"})

    # 检查是否已领过
    existing = await db.execute(
        select(UserCoupon).where(
            UserCoupon.user_id == user.id, UserCoupon.coupon_id == coupon.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"code": 40203, "message": "你已领取过该优惠券"})

    # 发券 — 原子更新防超发
    from sqlalchemy import update
    expire = coupon.expire_at or (now + timedelta(days=30))

    if coupon.total_stock > 0:
        result = await db.execute(
            update(Coupon)
            .where(Coupon.id == coupon.id, Coupon.issued_count < Coupon.total_stock)
            .values(issued_count=Coupon.issued_count + 1)
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=400, detail={"code": 40203, "message": "优惠券已领完"})
    else:
        coupon.issued_count += 1

    uc = UserCoupon(
        user_id=user.id,
        coupon_id=coupon.id,
        status="unused",
        expire_at=expire,
    )
    db.add(uc)
    await db.commit()

    return {
        "code": 0,
        "data": {"coupon_id": coupon.id, "name": coupon.name, "expire_at": expire.isoformat()},
    }
