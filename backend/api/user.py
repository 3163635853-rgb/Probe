from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from db.mysql import get_db
from models.user import User
from api.deps import get_current_user

router = APIRouter(prefix="/api/user", tags=["user"])


class PushTokenRequest(BaseModel):
    token: str
    platform: str  # ios / android
    device_id: Optional[str] = None


@router.post("/push-token")
async def register_push_token(
    req: PushTokenRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """上报推送 Token，App 启动时 + 推送权限授权后调用"""
    user, _ = auth
    db_user = await db.get(User, user.id)
    db_user.push_token = req.token
    db_user.platform = req.platform
    if req.device_id:
        db_user.device_id = req.device_id
    await db.commit()
    return {"code": 0, "data": {"registered": True}}
