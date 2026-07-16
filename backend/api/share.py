from __future__ import annotations

import asyncio
import uuid as uuid_lib
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from config import settings
from db.mysql import get_db
from models.config import Position
from models.interview import InterviewSession
from models.share import ShareRecord
from services.share_image import render_share_image

router = APIRouter(prefix="/api/share", tags=["share"])

TEMPLATES = {"radar", "score_card", "achievement"}
CHANNELS = {"wechat_moments", "wechat_friend", "xiaohongshu", "douyin", "link"}
MODE_NAMES = {"tech": "技术面", "behavioral": "行为面", "scenario": "情景面", "pressure": "压力面", "mixed": "综合面"}


class GenerateImageRequest(BaseModel):
    session_uuid: str
    template: Literal["radar", "score_card", "achievement"] = "radar"


class RecordShareRequest(BaseModel):
    share_id: int
    channel: Literal["wechat_moments", "wechat_friend", "xiaohongshu", "douyin", "link"]


def _storage_root() -> Path:
    return Path(settings.SHARE_STORAGE_DIR).resolve()


@router.post("/generate-image")
async def generate_share_image(
    req: GenerateImageRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
    if session.status != "completed" or session.final_score is None:
        raise HTTPException(status_code=409, detail={"code": 40903, "message": "面试报告尚未生成"})

    position_name = "目标岗位"
    if session.position_id:
        position = await db.get(Position, session.position_id)
        if position:
            position_name = position.name

    share_uuid = str(uuid_lib.uuid4())
    image_url = f"{settings.PUBLIC_API_URL.rstrip('/')}/api/share/image/{share_uuid}.png"
    output_path = _storage_root() / f"{share_uuid}.png"
    record = ShareRecord(
        uuid=share_uuid,
        user_id=user.id,
        session_id=session.id,
        template=req.template,
        image_path=str(output_path),
        image_url=image_url,
        share_count=0,
        click_count=0,
    )
    db.add(record)
    await db.flush()
    callback_url = f"{settings.PUBLIC_API_URL.rstrip('/')}/api/share/callback/{record.id}"

    try:
        await asyncio.to_thread(
            render_share_image,
            output_path=output_path,
            score=session.final_score,
            position=position_name,
            mode=MODE_NAMES.get(session.mode_code, session.mode_code),
            dimensions=session.report_json,
            callback_url=callback_url,
            template=req.template,
        )
        await db.commit()
    except Exception as exc:
        await db.rollback()
        output_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail={"code": 50003, "message": "分享图生成失败"}) from exc

    return {"code": 0, "data": {"image_url": image_url, "share_id": record.id}}


@router.get("/image/{share_uuid}.png")
async def get_share_image(share_uuid: str, db: AsyncSession = Depends(get_db)):
    try:
        normalized = str(uuid_lib.UUID(share_uuid))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail={"code": 40404, "message": "图片不存在"}) from exc
    result = await db.execute(select(ShareRecord).where(ShareRecord.uuid == normalized))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail={"code": 40404, "message": "图片不存在"})
    path = Path(record.image_path).resolve()
    root = _storage_root()
    if root not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail={"code": 40404, "message": "图片不存在"})
    return FileResponse(path, media_type="image/png", filename=f"probe-{share_uuid}.png")


@router.post("/record")
async def record_share(
    req: RecordShareRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        select(ShareRecord)
        .where(ShareRecord.id == req.share_id, ShareRecord.user_id == user.id)
        .with_for_update()
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail={"code": 40405, "message": "分享记录不存在"})
    record.channel = req.channel
    record.share_count += 1
    record.last_shared_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    return {"code": 0, "data": {"recorded": True, "share_count": record.share_count}}


@router.get("/callback/{share_id}")
async def share_callback(share_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ShareRecord).where(ShareRecord.id == share_id).with_for_update()
    )
    record = result.scalar_one_or_none()
    if record:
        record.click_count += 1
        await db.commit()
    target = f"{settings.PUBLIC_WEB_URL.rstrip('/')}/?share={share_id}"
    return RedirectResponse(url=target, status_code=302)
