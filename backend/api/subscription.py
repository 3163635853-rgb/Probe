from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from db.mysql import get_db
from models.payment import Subscription
from api.deps import get_current_user

router = APIRouter(prefix="/api/subscription", tags=["subscription"])


@router.get("/current")
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


class AutoRenewRequest(BaseModel):
    auto_renew: bool


@router.put("/auto-renew")
async def toggle_auto_renew(
    req: AutoRenewRequest,
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
        raise HTTPException(status_code=404, detail={"code": 40301, "message": "当前无有效订阅"})

    sub.auto_renew = req.auto_renew
    await db.commit()

    return {"code": 0, "data": {"auto_renew": sub.auto_renew}}
