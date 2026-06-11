from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, func

from db.mysql import get_db
from models.notification import Notification
from api.deps import get_current_user

router = APIRouter(prefix="/api/notification", tags=["notification"])


@router.get("/list")
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    unread_only: bool = Query(False),
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    offset = (page - 1) * page_size

    where = [Notification.user_id == user.id]
    if unread_only:
        where.append(Notification.is_read == False)

    count_result = await db.execute(
        select(func.count()).select_from(Notification).where(*where)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Notification).where(*where)
        .order_by(desc(Notification.created_at))
        .offset(offset).limit(page_size)
    )
    notifications = result.scalars().all()

    return {
        "code": 0,
        "data": {
            "items": [
                {
                    "id": n.id,
                    "title": n.title,
                    "content": n.content,
                    "type": n.type,
                    "is_read": n.is_read,
                    "related_url": n.related_url,
                    "created_at": n.created_at.isoformat(),
                }
                for n in notifications
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": offset + page_size < total,
        },
    }


@router.get("/unread-count")
async def unread_count(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user.id, Notification.is_read == False
        )
    )
    count = result.scalar() or 0
    return {"code": 0, "data": {"count": count}}


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"code": 0, "data": {"read": True}}


@router.put("/read-all")
async def mark_all_read(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"code": 0, "data": {"updated": result.rowcount}}
