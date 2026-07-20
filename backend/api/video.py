import asyncio
import uuid as uuid_lib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from openai import AsyncOpenAI
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from config import settings
from db.mysql import get_db
from models.career import CoachReview, VideoAnalysis
from models.interview import InterviewSession
from models.user import User
from services.video_analysis import analyze_audio_track, analyze_delivery, analyze_video_frames
from utils.jwt import decode_token

router = APIRouter(prefix="/api/video", tags=["video"])
VIDEO_DIR = Path(settings.UPLOAD_STORAGE_DIR) / "videos"
ALLOWED_MEDIA = {"mp4", "mov", "webm", "mkv", "m4a", "mp3", "wav"}
MAX_VIDEO_SIZE = 150 * 1024 * 1024


async def transcribe_file(path: Path) -> str:
    if not settings.TRANSCRIPTION_API_KEY:
        return ""
    client = AsyncOpenAI(api_key=settings.TRANSCRIPTION_API_KEY, base_url=settings.TRANSCRIPTION_BASE_URL)
    with path.open("rb") as media:
        response = await client.audio.transcriptions.create(model=settings.TRANSCRIPTION_MODEL, file=media)
    return response.text or ""


def serialize_analysis(item: VideoAnalysis, session_uuid: str = "") -> dict:
    return {
        "uuid": item.uuid,
        "session_id": item.session_id,
        "session_uuid": session_uuid,
        "file_type": item.file_type,
        "duration_sec": item.duration_sec,
        "transcript": item.transcript or "",
        "delivery_metrics": item.delivery_metrics or {},
        "visual_metrics": item.visual_metrics or {},
        "overall_score": item.overall_score,
        "status": item.status,
        "error_message": item.error_message,
        "media_url": f"/api/video/{item.uuid}/media",
        "created_at": item.created_at.isoformat(),
    }


@router.post("/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    transcript: str = Form(""),
    session_uuid: str = Form(""),
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if extension not in ALLOWED_MEDIA:
        raise HTTPException(status_code=400, detail={"code": 40040, "message": "不支持的媒体格式"})
    session_id = None
    if session_uuid:
        session_result = await db.execute(select(InterviewSession).where(InterviewSession.uuid == session_uuid, InterviewSession.user_id == user.id))
        session = session_result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail={"code": 40440, "message": "面试不存在"})
        session_id = session.id
    analysis_uuid = str(uuid_lib.uuid4())
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    path = VIDEO_DIR / f"{analysis_uuid}.{extension}"
    total_size = 0
    try:
        with path.open("wb") as target:
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > MAX_VIDEO_SIZE:
                    raise HTTPException(status_code=400, detail={"code": 40041, "message": "媒体文件不能为空且不能超过 150MB"})
                target.write(chunk)
        if total_size == 0:
            raise HTTPException(status_code=400, detail={"code": 40041, "message": "媒体文件不能为空且不能超过 150MB"})
    except Exception:
        path.unlink(missing_ok=True)
        raise
    visual = await asyncio.to_thread(analyze_video_frames, path) if extension in {"mp4", "mov", "webm", "mkv"} else {"available": False, "reason": "audio only"}
    duration = visual.get("duration_sec")
    if not duration:
        try:
            import mutagen
            media_info = mutagen.File(path)
            duration = round(media_info.info.length) if media_info and media_info.info else None
        except Exception:
            duration = None
    resolved_transcript = transcript.strip()
    transcription_error = ""
    if not resolved_transcript:
        try:
            resolved_transcript = await transcribe_file(path)
        except Exception as exc:
            transcription_error = str(exc)[:300]
    delivery = analyze_delivery(resolved_transcript, duration)
    audio_metrics = await asyncio.to_thread(analyze_audio_track, path)
    delivery.update(audio_metrics)
    visual_score = visual.get("visual_score") if visual.get("available") else None
    overall = round(delivery["score"] * 0.65 + visual_score * 0.35) if visual_score is not None else delivery["score"]
    item = VideoAnalysis(
        uuid=analysis_uuid, user_id=user.id, session_id=session_id, file_path=str(path), file_type=extension,
        duration_sec=duration, transcript=resolved_transcript, delivery_metrics=delivery, visual_metrics=visual,
        overall_score=overall, status="completed", error_message=transcription_error or None,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"code": 0, "data": serialize_analysis(item, session_uuid)}


@router.get("/analyses")
async def list_analyses(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(VideoAnalysis, InterviewSession.uuid).outerjoin(InterviewSession, InterviewSession.id == VideoAnalysis.session_id).where(VideoAnalysis.user_id == user.id).order_by(desc(VideoAnalysis.created_at)).limit(50))
    return {"code": 0, "data": [serialize_analysis(item, session_uuid or "") for item, session_uuid in result.all()]}


@router.get("/{analysis_uuid}")
async def get_analysis(analysis_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(VideoAnalysis, InterviewSession.uuid).outerjoin(InterviewSession, InterviewSession.id == VideoAnalysis.session_id).where(VideoAnalysis.uuid == analysis_uuid, VideoAnalysis.user_id == user.id))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail={"code": 40441, "message": "视频分析不存在"})
    return {"code": 0, "data": serialize_analysis(row[0], row[1] or "")}


@router.get("/{analysis_uuid}/media")
async def get_media(analysis_uuid: str, authorization: str | None = Header(None), token: str = "", db: AsyncSession = Depends(get_db)):
    raw_token = token or (authorization[7:] if authorization and authorization.startswith("Bearer ") else "")
    payload = decode_token(raw_token) if raw_token else None
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail={"code": 40001, "message": "认证失败"})
    viewer_id = int(payload["sub"])
    result = await db.execute(select(VideoAnalysis).where(VideoAnalysis.uuid == analysis_uuid))
    item = result.scalar_one_or_none()
    if not item or not Path(item.file_path).is_file():
        raise HTTPException(status_code=404, detail={"code": 40441, "message": "媒体不存在"})
    allowed = item.user_id == viewer_id
    viewer = await db.get(User, viewer_id)
    if viewer and viewer.is_admin:
        allowed = True
    if not allowed:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        review_result = await db.execute(select(CoachReview.id).where(
            CoachReview.video_analysis_id == item.id,
            CoachReview.coach_user_id == viewer_id,
            CoachReview.status.in_(["claimed", "completed"]),
            CoachReview.consent_granted_at.is_not(None),
            CoachReview.media_access_expires_at.is_not(None),
            CoachReview.media_access_expires_at > now,
        ))
        allowed = review_result.scalar_one_or_none() is not None
    if not allowed:
        raise HTTPException(status_code=403, detail={"code": 40341, "message": "没有录像访问权限"})
    media_types = {"mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm", "mkv": "video/x-matroska", "mp3": "audio/mpeg", "m4a": "audio/mp4", "wav": "audio/wav"}
    return FileResponse(item.file_path, media_type=media_types.get(item.file_type, "application/octet-stream"))
