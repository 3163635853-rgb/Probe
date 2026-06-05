import uuid as uuid_lib
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from db.mysql import get_db
from models.user import User
from api.deps import get_current_user
from utils.jwt import create_token
from config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class WechatLoginRequest(BaseModel):
    code: str
    invite_code: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None


@router.post("/wechat")
async def wechat_login(req: WechatLoginRequest, db: AsyncSession = Depends(get_db)):
    """微信登录 (开发模式: code 直接当 openid 用)"""
    # Dev mock: skip wechat API, use code as openid
    if settings.DEBUG or not settings.WX_APP_ID:
        openid = f"dev_{req.code}"
    else:
        # TODO: 调微信 API 换 openid
        openid = f"dev_{req.code}"

    # 查或建用户
    result = await db.execute(select(User).where(User.openid == openid))
    user = result.scalar_one_or_none()
    is_new = False

    if not user:
        user = User(
            uuid=str(uuid_lib.uuid4()),
            openid=openid,
            nickname=f"用户{openid[-4:]}",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        is_new = True

    token, expires_at = create_token(user.id, user.uuid)

    return {
        "code": 0,
        "data": {
            "token": token,
            "expires_at": expires_at.isoformat(),
            "user": {
                "uuid": user.uuid,
                "nickname": user.nickname,
                "avatar": user.avatar,
                "membership_type": user.membership_type,
                "membership_expire_at": user.membership_expire_at.isoformat() if user.membership_expire_at else None,
            },
            "is_new_user": is_new,
        },
    }


@router.get("/me")
async def get_me(auth: tuple = Depends(get_current_user)):
    user, new_token = auth

    # 获取配额
    from api.quota import ensure_quota_initialized, _quota_key
    from db.redis import redis_client
    await ensure_quota_initialized(user)
    remaining = int(await redis_client.get(_quota_key(user.id)) or 0)

    data = {
        "uuid": user.uuid,
        "nickname": user.nickname,
        "avatar": user.avatar,
        "phone": user.phone,
        "membership_type": user.membership_type,
        "membership_expire_at": user.membership_expire_at.isoformat() if user.membership_expire_at else None,
        "quota_remaining": remaining,
        "total_interviews": user.total_interviews,
        "created_at": user.created_at.isoformat(),
    }
    response = JSONResponse(content={"code": 0, "data": data})
    if new_token:
        response.headers["X-New-Token"] = new_token
    return response


@router.put("/profile")
async def update_profile(
    req: ProfileUpdateRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, new_token = auth
    if req.nickname is not None:
        user.nickname = req.nickname
    if req.avatar is not None:
        user.avatar = req.avatar
    await db.commit()

    response = JSONResponse(content={"code": 0, "data": {"updated": True}})
    if new_token:
        response.headers["X-New-Token"] = new_token
    return response
