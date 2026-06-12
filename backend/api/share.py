from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import RedirectResponse

from db.mysql import get_db
from models.interview import InterviewSession
from api.deps import get_current_user

router = APIRouter(prefix="/api/share", tags=["share"])


class GenerateImageRequest(BaseModel):
    session_uuid: str
    template: str = "radar"  # radar / score_card / achievement


class RecordShareRequest(BaseModel):
    share_id: int
    channel: str  # wechat_moments / wechat_friend / xiaohongshu / douyin / link


@router.post("/generate-image")
async def generate_share_image(
    req: GenerateImageRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """生成分享图（当前返回占位 URL，后续接入真实图片生成）"""
    user, _ = auth

    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.uuid == req.session_uuid,
            InterviewSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail={"code": 40401, "message": "面试不存在"})

    # TODO: 实际调用图片生成服务
    image_url = f"/api/share/image/{req.session_uuid}_{req.template}.png"

    return {
        "code": 0,
        "data": {
            "image_url": image_url,
            "share_id": session.id,
        },
    }


@router.post("/record")
async def record_share(
    req: RecordShareRequest,
    auth: tuple = Depends(get_current_user),
):
    """记录分享行为"""
    user, _ = auth
    # TODO: 写入 share_records 表
    return {"code": 0, "data": {"recorded": True}}


@router.get("/callback/{share_id}")
async def share_callback(share_id: int):
    """分享链接被点击（无需登录）"""
    # TODO: 更新 click_count
    return RedirectResponse(url="/", status_code=302)
