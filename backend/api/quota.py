from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from api.deps import get_current_user
from db.redis import redis_client
from config import settings
from models.user import User

router = APIRouter(prefix="/api/quota", tags=["quota"])


def _quota_key(user_id: int) -> str:
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    return f"quota:{user_id}:{month}"


def _total_for_plan(membership_type: str) -> int:
    if membership_type in ("monthly", "yearly"):
        return 9999  # unlimited
    return settings.FREE_MONTHLY_QUOTA


async def ensure_quota_initialized(user: User) -> None:
    """首次请求时从 membership_type 计算并写入 Redis"""
    key = _quota_key(user.id)
    exists = await redis_client.exists(key)
    if not exists:
        total = _total_for_plan(user.membership_type)
        # TTL: 到本月底
        now = datetime.now(timezone.utc)
        if now.month == 12:
            end = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            end = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        ttl = int((end - now).total_seconds())
        await redis_client.set(key, total, ex=ttl)


@router.get("/status")
async def quota_status(auth: tuple = Depends(get_current_user)):
    user, _ = auth
    await ensure_quota_initialized(user)

    key = _quota_key(user.id)
    remaining = int(await redis_client.get(key) or 0)
    total = _total_for_plan(user.membership_type)
    used = total - remaining if total < 9999 else 0

    # Check active session
    active = await redis_client.exists(f"active_session:{user.id}")

    return {
        "code": 0,
        "data": {
            "plan": user.membership_type,
            "quota_total": total if total < 9999 else -1,
            "quota_used": used,
            "quota_remaining": remaining if total < 9999 else -1,
            "reset_at": _next_month_start().isoformat(),
            "can_start_interview": remaining > 0 and not active,
        },
    }


def _next_month_start() -> datetime:
    now = datetime.now(timezone.utc)
    if now.month == 12:
        return now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
