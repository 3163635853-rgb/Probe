from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from db.mysql import get_db
from models.interview import InterviewSession
from models.feedback import Feedback
from api.deps import get_current_user

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    session_uuid: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    feedback_type: str = "interview"


@router.post("")
async def submit_feedback(
    req: FeedbackRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth

    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail={"code": 40102, "message": "rating 必须为 1-5"})

    session_id = None
    if req.session_uuid:
        result = await db.execute(
            select(InterviewSession).where(
                InterviewSession.uuid == req.session_uuid,
                InterviewSession.user_id == user.id,
            )
        )
        session = result.scalar_one_or_none()
        if session:
            session_id = session.id

    fb = Feedback(
        user_id=user.id,
        session_id=session_id,
        rating=req.rating,
        comment=req.comment[:2000] if req.comment else None,
        feedback_type=req.feedback_type,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)

    return {"code": 0, "data": {"id": fb.id}}
