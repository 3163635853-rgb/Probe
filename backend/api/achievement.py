from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.mysql import get_db
from models.achievement import Achievement, UserAchievement
from api.deps import get_current_user

router = APIRouter(prefix="/api/achievement", tags=["achievement"])


@router.get("/list")
async def list_achievements(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth

    # 查所有成就
    result = await db.execute(select(Achievement).where(Achievement.is_active.is_(True)))
    all_achievements = result.scalars().all()

    # 查用户已达成
    ua_result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == user.id)
    )
    achieved = {ua.achievement_id: ua.achieved_at for ua in ua_result.scalars().all()}

    return {
        "code": 0,
        "data": [
            {
                "code": a.code,
                "name": a.name,
                "description": a.description,
                "icon": a.icon,
                "achieved": a.id in achieved,
                "achieved_at": achieved[a.id].isoformat() if a.id in achieved else None,
            }
            for a in all_achievements
        ],
    }


async def check_and_grant_achievements(user_id: int, db: AsyncSession):
    """面试结束后调用，检查是否达成新成就"""
    from models.user import User
    from models.interview import InterviewSession

    user = await db.get(User, user_id)
    if not user:
        return []

    # 查所有未达成的成就
    ua_result = await db.execute(
        select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id)
    )
    achieved_ids = {row[0] for row in ua_result.all()}

    result = await db.execute(select(Achievement).where(Achievement.is_active.is_(True)))
    all_achievements = result.scalars().all()

    # 用户面试统计
    from sqlalchemy import func
    count_result = await db.execute(
        select(func.count()).select_from(InterviewSession).where(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed",
        )
    )
    interview_count = count_result.scalar() or 0

    max_score_result = await db.execute(
        select(func.max(InterviewSession.final_score)).where(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed",
        )
    )
    max_score = max_score_result.scalar() or 0

    newly_granted = []
    for a in all_achievements:
        if a.id in achieved_ids:
            continue

        granted = False
        if a.condition_type == "interview_count" and interview_count >= a.condition_value:
            granted = True
        elif a.condition_type == "score" and max_score >= a.condition_value:
            granted = True

        if granted:
            ua = UserAchievement(user_id=user_id, achievement_id=a.id)
            db.add(ua)
            newly_granted.append(a.name)

    if newly_granted:
        await db.commit()

    return newly_granted
