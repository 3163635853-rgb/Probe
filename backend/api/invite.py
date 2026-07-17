import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from db.mysql import get_db
from db.redis import redis_client
from models.invite import InviteCode, InviteRecord
from services.notifications import create_notification, push_to_user

router = APIRouter(prefix="/api/invite", tags=["invite"])

REWARD_QUOTA = 3
MAX_INVITE_REWARD = 30

# Redis 内原子完成双方配额和幂等标记。数据库提交失败时重试只补记账，不会重复加配额。
GRANT_REWARD_LUA = """
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('INCRBY', KEYS[2], ARGV[1])
if ARGV[2] == '1' then
  redis.call('INCRBY', KEYS[3], ARGV[1])
end
redis.call('SET', KEYS[1], '1')
return 1
"""
_grant_reward_script = None


class RedeemRequest(BaseModel):
    code: str


def _quota_key(user_id: int) -> str:
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    return f"quota:{user_id}:{month}"


async def _grant_pending_reward(
    db: AsyncSession,
    *,
    record: InviteRecord,
    invite: InviteCode,
) -> tuple[bool, bool]:
    """返回 (本次是否执行 Redis 发奖, 邀请者是否获得奖励)。"""
    global _grant_reward_script
    if record.reward_given:
        return False, False

    rewarded_result = await db.execute(
        select(func.count()).select_from(InviteRecord).where(
            InviteRecord.inviter_user_id == record.inviter_user_id,
            InviteRecord.inviter_reward_given.is_(True),
        )
    )
    rewarded_count = int(rewarded_result.scalar() or 0)
    reward_inviter = bool(
        record.inviter_user_id
        and rewarded_count < MAX_INVITE_REWARD // REWARD_QUOTA
    )

    if _grant_reward_script is None:
        _grant_reward_script = redis_client.register_script(GRANT_REWARD_LUA)
    applied = int(await _grant_reward_script(
        keys=[
            f"invite_reward:{record.id}",
            _quota_key(record.invitee_user_id),
            _quota_key(record.inviter_user_id),
        ],
        args=[REWARD_QUOTA, "1" if reward_inviter else "0"],
    ))

    record.reward_given = True
    record.inviter_reward_given = reward_inviter
    invitee_title = "邀请奖励已到账"
    invitee_content = f"你已获得 {REWARD_QUOTA} 次免费面试机会。"
    related_url = f"/invite?reward={record.id}"
    await create_notification(
        db,
        user_id=record.invitee_user_id,
        title=invitee_title,
        content=invitee_content,
        type_name="invite",
        related_url=related_url,
    )
    if reward_inviter:
        await create_notification(
            db,
            user_id=record.inviter_user_id,
            title="好友接受了你的邀请",
            content=f"奖励的 {REWARD_QUOTA} 次免费面试机会已到账。",
            type_name="invite",
            related_url=related_url,
        )
    await db.commit()

    # Push 失败不回滚已经持久化的权益与站内通知。
    try:
        await push_to_user(
            db,
            user_id=record.invitee_user_id,
            title=invitee_title,
            content=invitee_content,
            related_url=related_url,
        )
        if reward_inviter:
            await push_to_user(
                db,
                user_id=record.inviter_user_id,
                title="好友接受了你的邀请",
                content=f"奖励的 {REWARD_QUOTA} 次免费面试机会已到账。",
                related_url=related_url,
            )
    except Exception:
        pass
    return applied == 1, reward_inviter


@router.get("/my-code")
async def get_my_code(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        select(InviteCode).where(InviteCode.inviter_user_id == user.id)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        invite = InviteCode(
            code=secrets.token_urlsafe(6).upper()[:8],
            inviter_user_id=user.id,
            reward_type="quota",
            reward_value=REWARD_QUOTA,
            max_uses=-1,
        )
        db.add(invite)
        await db.commit()
        await db.refresh(invite)

    records_result = await db.execute(
        select(InviteRecord).where(InviteRecord.inviter_user_id == user.id)
    )
    records = list(records_result.scalars().all())
    return {
        "code": 0,
        "data": {
            "code": invite.code,
            "reward_description": f"每邀请1人，双方各得{REWARD_QUOTA}次免费面试",
            "total_invited": len(records),
            "total_reward": sum(1 for item in records if item.inviter_reward_given) * REWARD_QUOTA,
        },
    }


@router.post("/redeem")
async def redeem_invite(
    req: RedeemRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        select(InviteCode)
        .where(InviteCode.code == req.code.upper(), InviteCode.is_active.is_(True))
        .with_for_update()
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "邀请码无效"})
    if invite.inviter_user_id == user.id:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "不能使用自己的邀请码"})

    existing_result = await db.execute(
        select(InviteRecord)
        .where(InviteRecord.invitee_user_id == user.id)
        .with_for_update()
    )
    record = existing_result.scalar_one_or_none()
    if record and record.reward_given:
        raise HTTPException(status_code=409, detail={"code": 40203, "message": "你已使用过邀请码"})
    if record and record.invite_code_id != invite.id:
        raise HTTPException(status_code=409, detail={"code": 40203, "message": "已有待发放的邀请奖励"})

    if not record:
        if invite.max_uses > 0 and invite.used_count >= invite.max_uses:
            raise HTTPException(status_code=400, detail={"code": 40102, "message": "邀请码已达上限"})
        record = InviteRecord(
            invite_code_id=invite.id,
            inviter_user_id=invite.inviter_user_id,
            invitee_user_id=user.id,
            reward_given=False,
        )
        db.add(record)
        invite.used_count += 1
        await db.commit()
        await db.refresh(record)

    try:
        await _grant_pending_reward(db, record=record, invite=invite)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=503,
            detail={"code": 50302, "message": "奖励暂未到账，请稍后重试"},
        ) from exc

    return {"code": 0, "data": {"reward": f"+{REWARD_QUOTA}次面试机会"}}


@router.post("/retry-reward")
async def retry_reward(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """补发数据库已记录但 Redis 未确认的邀请奖励。"""
    user, _ = auth
    result = await db.execute(
        select(InviteRecord)
        .where(InviteRecord.invitee_user_id == user.id)
        .with_for_update()
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail={"code": 40407, "message": "没有待处理的邀请奖励"})
    if record.reward_given:
        return {"code": 0, "data": {"reward_given": True}}
    invite = await db.get(InviteCode, record.invite_code_id)
    if not invite:
        raise HTTPException(status_code=404, detail={"code": 40408, "message": "邀请码记录不存在"})
    try:
        await _grant_pending_reward(db, record=record, invite=invite)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=503, detail={"code": 50302, "message": "奖励补发失败，请稍后重试"}) from exc
    return {"code": 0, "data": {"reward_given": True}}


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
    records = list(result.scalars().all())
    invitee_ids = {record.invitee_user_id for record in records}
    user_map = {}
    if invitee_ids:
        users_result = await db.execute(select(User).where(User.id.in_(invitee_ids)))
        user_map = {item.id: item.nickname for item in users_result.scalars().all()}

    return {
        "code": 0,
        "data": [
            {
                "invitee_nickname": user_map.get(record.invitee_user_id, "未知用户"),
                "reward_given": record.reward_given,
                "created_at": record.created_at.isoformat(),
            }
            for record in records
        ],
    }
