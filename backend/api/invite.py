import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from db.mysql import get_db
from db.redis import redis_client
from models.invite import InviteCode, InviteRecord
from api.deps import get_current_user
from config import settings

router = APIRouter(prefix="/api/invite", tags=["invite"])

REWARD_QUOTA = 3  # 每邀请1人，双方各得3次


@router.get("/my-code")
async def get_my_code(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth

    # 查现有邀请码
    result = await db.execute(
        select(InviteCode).where(InviteCode.inviter_user_id == user.id)
    )
    invite = result.scalar_one_or_none()

    if not invite:
        # 自动生成
        code = secrets.token_urlsafe(6).upper()[:8]
        invite = InviteCode(
            code=code,
            inviter_user_id=user.id,
            reward_type="quota",
            reward_value=REWARD_QUOTA,
            max_uses=-1,
        )
        db.add(invite)
        await db.commit()
        await db.refresh(invite)

    # 统计
    records_result = await db.execute(
        select(InviteRecord).where(InviteRecord.inviter_user_id == user.id)
    )
    records = records_result.scalars().all()

    return {
        "code": 0,
        "data": {
            "code": invite.code,
            "reward_description": f"每邀请1人，双方各得{REWARD_QUOTA}次免费面试",
            "total_invited": len(records),
            "total_reward": sum(1 for r in records if r.reward_given) * REWARD_QUOTA,
        },
    }


class RedeemRequest(BaseModel):
    code: str


@router.post("/redeem")
async def redeem_invite(
    req: RedeemRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """兑换邀请码"""
    user, _ = auth

    # 查邀请码
    result = await db.execute(
        select(InviteCode).where(InviteCode.code == req.code.upper(), InviteCode.is_active.is_(True))
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "邀请码无效"})

    # 不能用自己的码
    if invite.inviter_user_id == user.id:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "不能使用自己的邀请码"})

    # 检查是否已使用过
    existing = await db.execute(
        select(InviteRecord).where(InviteRecord.invitee_user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"code": 40203, "message": "你已使用过邀请码"})

    # 检查使用次数
    if invite.max_uses > 0 and invite.used_count >= invite.max_uses:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "邀请码已达上限"})

    # 记录
    record = InviteRecord(
        invite_code_id=invite.id,
        inviter_user_id=invite.inviter_user_id,
        invitee_user_id=user.id,
        reward_given=True,
    )
    db.add(record)
    invite.used_count += 1
    await db.commit()

    # 发奖: 给双方加配额（DB 事务成功后才操作 Redis）
    from datetime import datetime, timezone
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    await redis_client.incrby(f"quota:{user.id}:{month}", REWARD_QUOTA)
    if invite.inviter_user_id:
        await redis_client.incrby(f"quota:{invite.inviter_user_id}:{month}", REWARD_QUOTA)

    return {
        "code": 0,
        "data": {"reward": f"+{REWARD_QUOTA}次面试机会"},
    }


@router.get("/records")
async def get_records(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    from models.user import User

    result = await db.execute(
        select(InviteRecord).where(InviteRecord.inviter_user_id == user.id)
    )
    records = result.scalars().all()

    # 批量查 invitee 信息
    invitee_ids = {r.invitee_user_id for r in records}
    user_map = {}
    if invitee_ids:
        u_result = await db.execute(select(User).where(User.id.in_(invitee_ids)))
        user_map = {u.id: u.nickname for u in u_result.scalars().all()}

    items = []
    for r in records:
        items.append({
            "invitee_nickname": user_map.get(r.invitee_user_id, "未知用户"),
            "reward_given": r.reward_given,
            "created_at": r.created_at.isoformat(),
        })

    return {"code": 0, "data": items}
