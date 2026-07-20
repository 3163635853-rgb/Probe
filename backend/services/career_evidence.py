from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.career import ExperienceStory, Resume


async def build_candidate_evidence(
    db: AsyncSession,
    *,
    user_id: int,
    resume_id: int | None = None,
    max_stories: int = 8,
) -> str:
    resume = await db.get(Resume, resume_id) if resume_id else None
    if resume and resume.user_id != user_id:
        resume = None
    if resume is None:
        resume_result = await db.execute(
            select(Resume).where(Resume.user_id == user_id, Resume.is_active.is_(True)).order_by(Resume.updated_at.desc()).limit(1)
        )
        resume = resume_result.scalar_one_or_none()
    result = await db.execute(
        select(ExperienceStory)
        .where(ExperienceStory.user_id == user_id)
        .order_by(ExperienceStory.is_favorite.desc(), ExperienceStory.updated_at.desc())
        .limit(max_stories)
    )
    stories = list(result.scalars().all())
    resume_text = (resume.raw_text if resume else "")[:5000]
    story_text = "\n".join(
        f"[{item.uuid}] {item.title} | S:{item.situation or ''} | T:{item.task or ''} | A:{item.action or ''} | R:{item.result or ''} | 标签:{','.join(item.tags or [])}"
        for item in stories
    )
    if not resume_text and not story_text:
        return ""
    return f"简历摘录：\n{resume_text or '无'}\nSTAR证据：\n{story_text or '无'}"[:9000]
