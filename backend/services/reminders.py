"""每日训练提醒后台任务。单实例 Compose 部署下由后端进程定时执行。"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, time, timedelta, timezone

from sqlalchemy import select

from config import settings
from db.mysql import AsyncSessionLocal
from models.interview import InterviewSession
from models.user import User
from services.notifications import create_notification, notification_exists_since, push_to_user

logger = logging.getLogger(__name__)
CHINA_TZ = timezone(timedelta(hours=8))


def china_day_window_utc(now: datetime | None = None) -> tuple[datetime, datetime]:
    current = now or datetime.now(timezone.utc)
    local = current.astimezone(CHINA_TZ)
    local_start = datetime.combine(local.date(), time.min, tzinfo=CHINA_TZ)
    start = local_start.astimezone(timezone.utc).replace(tzinfo=None)
    end = (local_start + timedelta(days=1)).astimezone(timezone.utc).replace(tzinfo=None)
    return start, end


async def run_daily_reminders_once(now: datetime | None = None) -> int:
    """为今天还没有训练的用户创建一次站内通知并发送 Push。"""
    current = now or datetime.now(timezone.utc)
    local_now = current.astimezone(CHINA_TZ)
    if local_now.hour < settings.DAILY_REMINDER_HOUR:
        return 0

    day_start, day_end = china_day_window_utc(current)
    created = 0
    push_jobs: list[int] = []
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.deleted_at.is_(None), User.push_token.isnot(None))
        )
        users = list(result.scalars().all())
        for user in users:
            completed = await db.execute(
                select(InterviewSession.id).where(
                    InterviewSession.user_id == user.id,
                    InterviewSession.status == "completed",
                    InterviewSession.ended_at >= day_start,
                    InterviewSession.ended_at < day_end,
                ).limit(1)
            )
            if completed.scalar_one_or_none() is not None:
                continue
            if await notification_exists_since(
                db, user_id=user.id, type_name="reminder", since=day_start
            ):
                continue
            _, was_created = await create_notification(
                db,
                user_id=user.id,
                title="今天还没有完成面试训练",
                content="用一场短面试保持手感，完成后还能推进连续训练记录。",
                type_name="reminder",
                related_url="/growth",
                deduplicate=False,
            )
            if was_created:
                created += 1
                push_jobs.append(user.id)
        await db.commit()

        for user_id in push_jobs:
            try:
                await push_to_user(
                    db,
                    user_id=user_id,
                    title="今天还没有完成面试训练",
                    content="用一场短面试保持手感，完成后还能推进连续训练记录。",
                    related_url="/growth",
                )
            except Exception as exc:
                logger.warning("daily reminder push failed for user %s: %s", user_id, exc)
    return created


async def reminder_loop() -> None:
    while True:
        try:
            await run_daily_reminders_once()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("daily reminder job failed: %s", exc)
        await asyncio.sleep(settings.DAILY_REMINDER_INTERVAL_SEC)
