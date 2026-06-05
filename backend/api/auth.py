import uuid as uuid_lib
import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional

from db.mysql import get_db
from models.user import User
from api.deps import get_current_user
from utils.jwt import create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nickname: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateRequest(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """邮箱注册"""
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "密码至少6位"})

    # 检查邮箱是否已注册
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail={"code": 40103, "message": "该邮箱已注册"})

    user = User(
        uuid=str(uuid_lib.uuid4()),
        email=req.email,
        password_hash=_hash_password(req.password),
        nickname=req.nickname or req.email.split("@")[0],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

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
                "membership_expire_at": None,
            },
            "is_new_user": True,
        },
    }


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """邮箱密码登录"""
    result = await db.execute(
        select(User).where(User.email == req.email, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not _verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail={"code": 40001, "message": "邮箱或密码错误"})

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
            "is_new_user": False,
        },
    }


@router.get("/me")
async def get_me(auth: tuple = Depends(get_current_user)):
    user, new_token = auth

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
