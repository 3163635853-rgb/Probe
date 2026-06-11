from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from db.mysql import get_db
from models.user import User
from utils.jwt import decode_token, should_renew, create_token


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, Optional[str]]:
    """返回 (user, new_token_or_None)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": 40001, "message": "未登录或 token 已过期"})

    token = authorization[7:]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail={"code": 40001, "message": "未登录或 token 已过期"})

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=401, detail={"code": 40001, "message": "无效 token"})
    user_id = int(user_id_str)
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail={"code": 40001, "message": "用户不存在"})

    # Auto-renew
    new_token = None
    if should_renew(payload):
        new_token, _ = create_token(user.id, user.uuid)

    return user, new_token
