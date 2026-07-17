import uuid as uuid_lib
import bcrypt
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional

from config import settings
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


class WechatLoginRequest(BaseModel):
    code: str
    channel: Literal["web", "mobile", "miniprogram"] = "miniprogram"


@router.post("/wechat")
async def wechat_login(req: WechatLoginRequest, db: AsyncSession = Depends(get_db)):
    """微信登录：支持开放平台 Web OAuth 和小程序 code2session。"""
    web_app_id = settings.WX_WEB_APP_ID or settings.WX_APP_ID
    web_secret = settings.WX_WEB_APP_SECRET or settings.WX_APP_SECRET
    mobile_app_id = settings.WX_MOBILE_APP_ID or web_app_id
    mobile_secret = settings.WX_MOBILE_APP_SECRET or web_secret
    if req.channel == "web":
        app_id, app_secret = web_app_id, web_secret
    elif req.channel == "mobile":
        app_id, app_secret = mobile_app_id, mobile_secret
    else:
        app_id, app_secret = settings.WX_APP_ID, settings.WX_APP_SECRET

    if settings.DEBUG and not app_id:
        openid = f"dev_{req.channel}_{req.code}"
        union_id = None
        nickname = "微信测试用户"
        avatar = None
    elif not app_id or not app_secret:
        raise HTTPException(status_code=503, detail={"code": 50003, "message": "微信登录未配置"})
    else:
        async with httpx.AsyncClient(timeout=10) as client:
            if req.channel in ("web", "mobile"):
                resp = await client.get(
                    "https://api.weixin.qq.com/sns/oauth2/access_token",
                    params={
                        "appid": app_id,
                        "secret": app_secret,
                        "code": req.code,
                        "grant_type": "authorization_code",
                    },
                )
            else:
                resp = await client.get(
                    "https://api.weixin.qq.com/sns/jscode2session",
                    params={
                        "appid": app_id,
                        "secret": app_secret,
                        "js_code": req.code,
                        "grant_type": "authorization_code",
                    },
                )
            try:
                data = resp.json()
            except ValueError as exc:
                raise HTTPException(status_code=502, detail={"code": 50004, "message": "微信服务响应异常"}) from exc
            if resp.status_code >= 400 or "openid" not in data:
                raise HTTPException(status_code=401, detail={"code": 40001, "message": "微信授权失败"})
            openid = data["openid"]
            union_id = data.get("unionid")
            nickname = "微信用户"
            avatar = None

            # Web OAuth 可继续拉取公开资料；失败不影响登录。
            if req.channel in ("web", "mobile") and data.get("access_token"):
                try:
                    profile_resp = await client.get(
                        "https://api.weixin.qq.com/sns/userinfo",
                        params={
                            "access_token": data["access_token"],
                            "openid": openid,
                            "lang": "zh_CN",
                        },
                    )
                    profile_data = profile_resp.json()
                    if not profile_data.get("errcode"):
                        nickname = profile_data.get("nickname") or nickname
                        avatar = profile_data.get("headimgurl")
                        union_id = profile_data.get("unionid") or union_id
                except Exception:
                    pass

    identity_filter = User.openid == openid
    if union_id:
        identity_filter = or_(identity_filter, User.union_id == union_id)
    result = await db.execute(select(User).where(identity_filter))
    user = result.scalar_one_or_none()
    is_new = False

    if not user:
        user = User(
            uuid=str(uuid_lib.uuid4()),
            openid=openid,
            union_id=union_id,
            nickname=nickname,
            avatar=avatar,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        is_new = True
    else:
        if union_id and not user.union_id:
            user.union_id = union_id
        if avatar and not user.avatar:
            user.avatar = avatar
        await db.commit()

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


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """邮箱注册"""
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "密码至少6位"})
    if len(req.password) > 72:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "密码不能超过72位"})

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
    # 重新从当前 session 加载 user
    db_user = await db.get(User, user.id)
    if req.nickname is not None:
        db_user.nickname = req.nickname
    if req.avatar is not None:
        db_user.avatar = req.avatar
    await db.commit()

    response = JSONResponse(content={"code": 0, "data": {"updated": True}})
    if new_token:
        response.headers["X-New-Token"] = new_token
    return response


@router.post("/ticket")
async def create_ticket(auth: tuple = Depends(get_current_user)):
    """生成一次性短期 ticket，用于 SSE 连接认证（30s 有效，使用后即删）"""
    import secrets
    from db.redis import redis_client

    user, _ = auth
    ticket = secrets.token_urlsafe(32)
    # 存 Redis，30s 过期
    await redis_client.set(f"ticket:{ticket}", str(user.id), ex=30)
    return {"code": 0, "data": {"ticket": ticket, "expires_in": 30}}
