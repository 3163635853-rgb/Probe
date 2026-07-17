"""站内通知和 Expo Push 的统一服务。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.notification import Notification
from models.user import User
from services.push import send_push


def push_data_for_url(related_url: str | None) -> dict[str, str]:
    if not related_url:
        return {"screen": "/notifications"}
    if related_url.startswith("/interview/") and related_url.endswith("/report"):
        session_uuid = related_url.split("/")[2]
        return {"screen": "report", "session_uuid": session_uuid}
    if related_url == "/achievements":
        return {"screen": "achievements"}
    if related_url.startswith("/invite"):
        return {"screen": "invite"}
    if related_url == "/growth":
        return {"screen": "growth"}
    if related_url == "/membership" or related_url.startswith("/orders"):
        return {"screen": "membership"}
    return {"screen": "notifications"}


async def create_notification(
    db: AsyncSession,
    *,
    user_id: int,
    title: str,
    content: str,
    type_name: str,
    related_url: str | None = None,
    deduplicate: bool = True,
) -> tuple[Notification, bool]:
    """创建通知。相同用户/type/title/url 默认幂等。"""
    if deduplicate:
        result = await db.execute(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.type == type_name,
                Notification.title == title,
                Notification.related_url == related_url,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing, False

    notification = Notification(
        user_id=user_id,
        title=title[:128],
        content=content,
        type=type_name[:16],
        related_url=related_url,
        is_read=False,
    )
    db.add(notification)
    await db.flush()
    return notification, True


async def push_to_user(
    db: AsyncSession,
    *,
    user_id: int,
    title: str,
    content: str,
    related_url: str | None = None,
    data: dict[str, Any] | None = None,
) -> None:
    user = await db.get(User, user_id)
    if not user or not user.push_token:
        return
    payload = push_data_for_url(related_url)
    if data:
        payload.update({str(k): str(v) for k, v in data.items()})
    await send_push(user.push_token, title=title, body=content, data=payload)


async def notification_exists_since(
    db: AsyncSession,
    *,
    user_id: int,
    type_name: str,
    since: datetime,
) -> bool:
    result = await db.execute(
        select(Notification.id).where(
            Notification.user_id == user_id,
            Notification.type == type_name,
            Notification.created_at >= since,
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None
