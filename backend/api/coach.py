import uuid as uuid_lib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from db.mysql import get_db
from models.career import CoachReview
from models.interview import InterviewSession
from models.user import User
from services.notifications import create_notification, push_to_user

router = APIRouter(prefix="/api/coach", tags=["coach"])


class ReviewRequest(BaseModel):
    session_uuid: str
    focus: str = Field("", max_length=2000)


class ReviewSubmitRequest(BaseModel):
    rating: int = Field(ge=1, le=10)
    comments: str = Field(min_length=10, max_length=20000)
    annotations: list[dict] = Field(default_factory=list)


def serialize_review(item: CoachReview, session_uuid: str = "") -> dict:
    return {
        "uuid": item.uuid, "session_uuid": session_uuid, "status": item.status, "focus": item.focus or "",
        "rating": item.rating, "comments": item.comments or "", "annotations": item.annotations or [],
        "coach_user_id": item.coach_user_id, "created_at": item.created_at.isoformat(),
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
    }


@router.post("/reviews")
async def request_review(req: ReviewRequest, auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    session_result = await db.execute(select(InterviewSession).where(InterviewSession.uuid == req.session_uuid, InterviewSession.user_id == user.id, InterviewSession.status == "completed"))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail={"code": 40460, "message": "已完成的面试不存在"})
    existing = await db.execute(select(CoachReview).where(CoachReview.user_id == user.id, CoachReview.session_id == session.id, CoachReview.status.in_(["pending", "claimed"])))
    item = existing.scalar_one_or_none()
    if not item:
        item = CoachReview(uuid=str(uuid_lib.uuid4()), user_id=user.id, session_id=session.id, status="pending", focus=req.focus)
        db.add(item)
        await db.commit()
        await db.refresh(item)
    return {"code": 0, "data": serialize_review(item, session.uuid)}


@router.get("/reviews")
async def my_reviews(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    result = await db.execute(select(CoachReview, InterviewSession).join(InterviewSession, InterviewSession.id == CoachReview.session_id).where(CoachReview.user_id == user.id).order_by(desc(CoachReview.created_at)))
    return {"code": 0, "data": [serialize_review(item, session.uuid) for item, session in result.all()]}


@router.get("/queue")
async def coach_queue(auth: tuple = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user, _ = auth
    if not user.is_coach and not user.is_admin:
        raise HTTPException(status_code=403, detail={"code": 40360, "message": "需要教练权限"})
    result = await db.execute(select(CoachReview, InterviewSession, User).join(InterviewSession, InterviewSession.id == CoachReview.session_id).join(User, User.id == CoachReview.user_id).where(CoachReview.status.in_(["pending", "claimed"])).order_by(CoachReview.created_at).limit(100))
    return {"code": 0, "data": [{**serialize_review(item, session.uuid), "candidate": {"uuid": candidate.uuid, "nickname": candidate.nickname}, "score": session.final_score} for item, session, candidate in result.all()]}


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
    await create_notification(db, user_id=item.user_id, title="真人教练点评已完成", content="你的面试已经收到真人教练反馈。", type_name="coach", related_url=f"/coach/reviews/{item.uuid}")
    await db.commit()
    try:
        await push_to_user(db, user_id=item.user_id, title="真人教练点评已完成", content="点击查看具体建议和逐题批注。", related_url="/notifications")
    except Exception:
        pass
    return {"code": 0, "data": serialize_review(item)}
