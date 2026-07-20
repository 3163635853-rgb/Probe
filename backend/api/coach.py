import uuid as uuid_lib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from db.mysql import get_db
from models.career import CoachReview, VideoAnalysis
from models.interview import InterviewSession
from models.user import User
from services.notifications import create_notification, push_to_user

router = APIRouter(prefix="/api/coach", tags=["coach"])


class ReviewRequest(BaseModel):
    session_uuid: str
    focus: str = Field("", max_length=2000)
    video_uuid: str = ""
    consent_video: bool = False


class ReviewSubmitRequest(BaseModel):
    rating: int = Field(ge=1, le=10)
    comments: str = Field(min_length=10, max_length=20000)
    annotations: list[dict] = Field(default_factory=list)


def serialize_review(item: CoachReview, session_uuid: str = "", video: VideoAnalysis | None = None) -> dict:
    return {
        "uuid": item.uuid, "session_uuid": session_uuid, "status": item.status, "focus": item.focus or "",
        "rating": item.rating, "comments": item.comments or "", "annotations": item.annotations or [],
        "coach_user_id": item.coach_user_id, "created_at": item.created_at.isoformat(),
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        "video": ({"uuid": video.uuid, "duration_sec": video.duration_sec, "overall_score": video.overall_score, "media_url": f"/api/video/{video.uuid}/media"} if video else None),
        "video_consent": item.consent_granted_at is not None,
        "media_access_expires_at": item.media_access_expires_at.isoformat() if item.media_access_expires_at else None,
    }


@router.post("/reviews")
async def request_review(req: ReviewRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    session_result = await db.execute(select(InterviewSession).where(InterviewSession.uuid == req.session_uuid, InterviewSession.user_id == user.id, InterviewSession.status == "completed"))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail={"code": 40460, "message": "已完成的面试不存在"})
    video = None
    if req.video_uuid:
        if not req.consent_video:
            raise HTTPException(status_code=422, detail={"code": 42260, "message": "提交录像前必须明确授权教练查看"})
        video_result = await db.execute(select(VideoAnalysis).where(VideoAnalysis.uuid == req.video_uuid, VideoAnalysis.user_id == user.id, VideoAnalysis.session_id == session.id))
        video = video_result.scalar_one_or_none()
        if not video:
            raise HTTPException(status_code=404, detail={"code": 40462, "message": "该面试的录像不存在"})
    claimed_result = await db.execute(select(CoachReview.id).where(CoachReview.user_id == user.id, CoachReview.session_id == session.id, CoachReview.status == "claimed"))
    if claimed_result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail={"code": 40962, "message": "教练已领取任务，不能更换录像或授权"})
    existing = await db.execute(select(CoachReview).where(CoachReview.user_id == user.id, CoachReview.session_id == session.id, CoachReview.status == "pending"))
    item = existing.scalar_one_or_none()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not item:
        item = CoachReview(uuid=str(uuid_lib.uuid4()), user_id=user.id, session_id=session.id, status="pending")
        db.add(item)
    item.focus = req.focus
    item.video_analysis_id = video.id if video else None
    item.consent_granted_at = now if video else None
    item.media_access_expires_at = None
    await db.commit()
    await db.refresh(item)
    return {"code": 0, "data": serialize_review(item, session.uuid, video)}


@router.get("/reviews")
async def my_reviews(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(CoachReview, InterviewSession, VideoAnalysis).join(InterviewSession, InterviewSession.id == CoachReview.session_id).outerjoin(VideoAnalysis, VideoAnalysis.id == CoachReview.video_analysis_id).where(CoachReview.user_id == user.id).order_by(desc(CoachReview.created_at)))
    return {"code": 0, "data": [serialize_review(item, session.uuid, video) for item, session, video in result.all()]}


@router.get("/queue")
async def coach_queue(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    if not user.is_coach and not user.is_admin:
        raise HTTPException(status_code=403, detail={"code": 40360, "message": "需要教练权限"})
    result = await db.execute(select(CoachReview, InterviewSession, User, VideoAnalysis).join(InterviewSession, InterviewSession.id == CoachReview.session_id).join(User, User.id == CoachReview.user_id).outerjoin(VideoAnalysis, VideoAnalysis.id == CoachReview.video_analysis_id).where(CoachReview.status.in_(["pending", "claimed"])).order_by(CoachReview.created_at).limit(100))
    return {"code": 0, "data": [{**serialize_review(item, session.uuid, video), "candidate": {"uuid": candidate.uuid, "nickname": candidate.nickname}, "score": session.final_score} for item, session, candidate, video in result.all()]}


@router.post("/reviews/{review_uuid}/claim")
async def claim_review(review_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    if not user.is_coach and not user.is_admin:
        raise HTTPException(status_code=403, detail={"code": 40360, "message": "需要教练权限"})
    result = await db.execute(select(CoachReview).where(CoachReview.uuid == review_uuid).with_for_update())
    item = result.scalar_one_or_none()
    if not item or item.status not in {"pending", "claimed"}:
        raise HTTPException(status_code=409, detail={"code": 40960, "message": "点评任务不可领取"})
    if item.coach_user_id and item.coach_user_id != user.id:
        raise HTTPException(status_code=409, detail={"code": 40961, "message": "任务已被其他教练领取"})
    item.coach_user_id, item.status = user.id, "claimed"
    if item.video_analysis_id and item.consent_granted_at:
        item.media_access_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)
    await db.commit()
    return {"code": 0, "data": {"claimed": True}}


@router.put("/reviews/{review_uuid}")
async def submit_review(review_uuid: str, req: ReviewSubmitRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    coach, _ = auth
    if not coach.is_coach and not coach.is_admin:
        raise HTTPException(status_code=403, detail={"code": 40360, "message": "需要教练权限"})
    result = await db.execute(select(CoachReview).where(CoachReview.uuid == review_uuid).with_for_update())
    item = result.scalar_one_or_none()
    if not item or item.coach_user_id not in {None, coach.id}:
        raise HTTPException(status_code=404, detail={"code": 40461, "message": "点评任务不存在"})
    item.coach_user_id = coach.id
    item.status = "completed"
    item.rating = req.rating
    item.comments = req.comments
    item.annotations = req.annotations[:100]
    item.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    if item.video_analysis_id and item.consent_granted_at:
        item.media_access_expires_at = item.completed_at + timedelta(days=30)
    await create_notification(db, user_id=item.user_id, title="真人教练点评已完成", content="你的面试已经收到真人教练反馈。", type_name="coach", related_url=f"/coach/reviews/{item.uuid}")
    await db.commit()
    try:
        await push_to_user(db, user_id=item.user_id, title="真人教练点评已完成", content="点击查看具体建议和逐题批注。", related_url="/notifications")
    except Exception:
        pass
    video = await db.get(VideoAnalysis, item.video_analysis_id) if item.video_analysis_id else None
    return {"code": 0, "data": serialize_review(item, video=video)}


@router.delete("/reviews/{review_uuid}")
async def cancel_or_revoke_review(review_uuid: str, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(CoachReview).where(CoachReview.uuid == review_uuid, CoachReview.user_id == user.id).with_for_update())
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail={"code": 40461, "message": "点评任务不存在"})
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    item.media_access_expires_at = now
    if item.status in {"pending", "claimed"}:
        item.status = "cancelled"
    await db.commit()
    return {"code": 0, "data": {"cancelled": item.status == "cancelled", "video_access_revoked": True}}
