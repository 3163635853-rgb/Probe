from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.mysql import insert as mysql_insert

from api.deps import get_current_user
from db.mysql import get_db
from models.growth import GrowthProfile, GrowthTask
from models.interview import InterviewSession

router = APIRouter(prefix="/api/growth", tags=["growth"])
CHINA_TZ = timezone(timedelta(hours=8))
LEVEL_STEP = 500
LEVEL_TITLES = ["初醒", "蓄力", "破局", "进阶", "锋芒", "卓越", "大师"]
DEFAULT_DIMENSIONS = ["逻辑表达", "专业知识", "沟通能力"]


class WeeklyGoalRequest(BaseModel):
    weekly_goal: int


def local_today() -> date:
    return datetime.now(CHINA_TZ).date()


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def local_day_start_utc_naive(day: date) -> datetime:
    local = datetime.combine(day, time.min, tzinfo=CHINA_TZ)
    return local.astimezone(timezone.utc).replace(tzinfo=None)


def local_date_from_db(value: datetime | None) -> date | None:
    if value is None:
        return None
    aware = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    return aware.astimezone(CHINA_TZ).date()


def level_snapshot(xp: int) -> dict[str, int | str]:
    level = max(1, xp // LEVEL_STEP + 1)
    level_floor = (level - 1) * LEVEL_STEP
    level_progress = xp - level_floor
    title = LEVEL_TITLES[min(level - 1, len(LEVEL_TITLES) - 1)]
    return {
        "level": level,
        "title": title,
        "xp": xp,
        "level_xp": level_progress,
        "next_level_xp": LEVEL_STEP,
        "progress_percent": min(100, round(level_progress / LEVEL_STEP * 100)),
    }


def normalize_dimension_score(value: Any) -> int | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number <= 10:
        number *= 10
    return max(0, min(100, round(number)))


def apply_streak(profile: GrowthProfile, today: date) -> None:
    if profile.last_active_date == today:
        return
    if profile.last_active_date == today - timedelta(days=1):
        profile.current_streak += 1
    else:
        profile.current_streak = 1
    profile.longest_streak = max(profile.longest_streak, profile.current_streak)
    profile.last_active_date = today


def complete_growth_task(profile: GrowthProfile, task: GrowthTask, today: date) -> bool:
    if task.status == "completed":
        return False
    task.status = "completed"
    task.progress = task.target_count
    task.completed_at = utc_now_naive()
    profile.xp += task.xp_reward
    apply_streak(profile, today)
    return True


async def get_or_create_profile(db: AsyncSession, user_id: int) -> GrowthProfile:
    result = await db.execute(
        select(GrowthProfile).where(GrowthProfile.user_id == user_id).with_for_update()
    )
    profile = result.scalar_one_or_none()
    if profile:
        return profile
    await db.execute(
        mysql_insert(GrowthProfile)
        .values(
            user_id=user_id,
            xp=0,
            current_streak=0,
            longest_streak=0,
            weekly_goal=3,
        )
        .prefix_with("IGNORE")
    )
    result = await db.execute(
        select(GrowthProfile).where(GrowthProfile.user_id == user_id).with_for_update()
    )
    return result.scalar_one()


def extract_dimension_averages(sessions: list[InterviewSession]) -> list[dict[str, int | str]]:
    values: dict[str, list[int]] = defaultdict(list)
    for session in sessions:
        report = session.report_json or {}
        dimensions = report.get("dimensions", {}) if isinstance(report, dict) else {}
        if not isinstance(dimensions, dict):
            continue
        for name, raw_score in dimensions.items():
            score = normalize_dimension_score(raw_score)
            if score is not None:
                values[str(name)].append(score)

    if not values:
        return [
            {"name": name, "score": 0, "status": "等待首次评估"}
            for name in DEFAULT_DIMENSIONS
        ]

    result = []
    for name, scores in values.items():
        avg = round(sum(scores) / len(scores))
        status = "优势维度" if avg >= 80 else "稳定提升" if avg >= 65 else "优先突破"
        result.append({"name": name, "score": avg, "status": status})
    return sorted(result, key=lambda item: int(item["score"]))


async def ensure_daily_tasks(
    db: AsyncSession,
    *,
    user_id: int,
    today: date,
    focus_dimension: str,
) -> list[GrowthTask]:
    result = await db.execute(
        select(GrowthTask)
        .where(GrowthTask.user_id == user_id, GrowthTask.task_date == today)
        .order_by(GrowthTask.id)
    )
    tasks = list(result.scalars().all())
    existing_types = {task.task_type for task in tasks}
    definitions = [
        {
            "task_type": "interview",
            "title": "完成一次模拟面试",
            "description": "用真实对话完成今天的主训练",
            "dimension": None,
            "xp_reward": 50,
        },
        {
            "task_type": "review",
            "title": "复盘最近一份报告",
            "description": "读完优势、短板和逐题建议",
            "dimension": None,
            "xp_reward": 20,
        },
        {
            "task_type": "focus",
            "title": f"突破 · {focus_dimension}",
            "description": "围绕薄弱维度做一次专项思考",
            "dimension": focus_dimension,
            "xp_reward": 30,
        },
    ]
    for definition in definitions:
        if definition["task_type"] in existing_types:
            continue
        await db.execute(
            mysql_insert(GrowthTask)
            .values(
                user_id=user_id,
                task_date=today,
                target_count=1,
                progress=0,
                status="pending",
                **definition,
            )
            .prefix_with("IGNORE")
        )
    result = await db.execute(
        select(GrowthTask)
        .where(GrowthTask.user_id == user_id, GrowthTask.task_date == today)
        .order_by(GrowthTask.id)
    )
    return list(result.scalars().all())


def serialize_task(task: GrowthTask) -> dict[str, Any]:
    return {
        "id": task.id,
        "task_type": task.task_type,
        "title": task.title,
        "description": task.description,
        "dimension": task.dimension,
        "target_count": task.target_count,
        "progress": task.progress,
        "xp_reward": task.xp_reward,
        "status": task.status,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


@router.get("/overview")
async def growth_overview(
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    today = local_today()
    week_start = today - timedelta(days=6)
    session_start = local_day_start_utc_naive(week_start)

    profile = await get_or_create_profile(db, user.id)
    recent_result = await db.execute(
        select(InterviewSession)
        .where(
            InterviewSession.user_id == user.id,
            InterviewSession.status == "completed",
            InterviewSession.ended_at.isnot(None),
            InterviewSession.ended_at >= session_start,
        )
        .order_by(desc(InterviewSession.ended_at))
    )
    weekly_sessions = list(recent_result.scalars().all())

    report_result = await db.execute(
        select(InterviewSession)
        .where(
            InterviewSession.user_id == user.id,
            InterviewSession.status == "completed",
            InterviewSession.report_json.isnot(None),
        )
        .order_by(desc(InterviewSession.ended_at))
        .limit(8)
    )
    report_sessions = list(report_result.scalars().all())
    focus_dimensions = extract_dimension_averages(report_sessions)
    focus_name = str(focus_dimensions[0]["name"])

    tasks = await ensure_daily_tasks(
        db,
        user_id=user.id,
        today=today,
        focus_dimension=focus_name,
    )
    completed_today = sum(
        1 for session in weekly_sessions if local_date_from_db(session.ended_at) == today
    )
    for task in tasks:
        if task.task_type == "interview":
            task.progress = min(task.target_count, completed_today)
            if task.progress >= task.target_count:
                complete_growth_task(profile, task, today)

    activity_map: dict[date, list[int]] = defaultdict(list)
    for session in weekly_sessions:
        session_date = local_date_from_db(session.ended_at)
        if session_date and session.final_score is not None:
            activity_map[session_date].append(session.final_score)

    weekly_activity = []
    for offset in range(7):
        day = week_start + timedelta(days=offset)
        scores = activity_map.get(day, [])
        weekly_activity.append(
            {
                "date": day.isoformat(),
                "weekday": "一二三四五六日"[day.weekday()],
                "count": len(scores),
                "avg_score": round(sum(scores) / len(scores)) if scores else 0,
                "is_today": day == today,
            }
        )

    completed_tasks = sum(1 for task in tasks if task.status == "completed")
    weekly_completed = len(weekly_sessions)
    await db.commit()

    return {
        "code": 0,
        "data": {
            "profile": {
                **level_snapshot(profile.xp),
                "current_streak": profile.current_streak,
                "longest_streak": profile.longest_streak,
                "weekly_goal": profile.weekly_goal,
                "weekly_completed": weekly_completed,
                "weekly_progress_percent": min(
                    100, round(weekly_completed / max(1, profile.weekly_goal) * 100)
                ),
            },
            "weekly_activity": weekly_activity,
            "focus_dimensions": focus_dimensions[:4],
            "daily_tasks": [serialize_task(task) for task in tasks],
            "daily_completed": completed_tasks,
            "daily_total": len(tasks),
        },
    }


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: int,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    today = local_today()
    profile = await get_or_create_profile(db, user.id)
    result = await db.execute(
        select(GrowthTask)
        .where(GrowthTask.id == task_id, GrowthTask.user_id == user.id)
        .with_for_update()
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail={"code": 40406, "message": "成长任务不存在"})
    if task.task_date != today:
        raise HTTPException(status_code=409, detail={"code": 40906, "message": "只能完成今天的成长任务"})
    if task.task_type == "interview" and task.progress < task.target_count:
        raise HTTPException(status_code=409, detail={"code": 40907, "message": "完成一次面试后会自动领取奖励"})

    complete_growth_task(profile, task, today)
    await db.commit()
    return {
        "code": 0,
        "data": {"task": serialize_task(task), "profile": level_snapshot(profile.xp)},
    }


@router.put("/weekly-goal")
async def update_weekly_goal(
    req: WeeklyGoalRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.weekly_goal < 1 or req.weekly_goal > 14:
        raise HTTPException(status_code=422, detail={"code": 42201, "message": "每周目标必须在 1 到 14 次之间"})
    user, _ = auth
    profile = await get_or_create_profile(db, user.id)
    profile.weekly_goal = req.weekly_goal
    await db.commit()
    return {"code": 0, "data": {"weekly_goal": profile.weekly_goal}}
