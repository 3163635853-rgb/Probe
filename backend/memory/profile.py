"""跨面试能力画像。

画像持久化在 users.weak_points，避免为已有字段再增加一张表。每次报告生成后
从最近的已完成面试重新聚合，下一场面试规划时注入 Planner。
"""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any, Iterable

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.interview import InterviewSession
from models.user import User

PROFILE_SESSION_LIMIT = 12


def _as_strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _normalise_score(value: Any) -> int | None:
    try:
        score = float(value)
    except (TypeError, ValueError):
        return None
    if score <= 10:
        score *= 10
    return max(0, min(100, round(score)))


def build_profile(sessions: Iterable[InterviewSession], total_interviews: int | None = None) -> dict[str, Any]:
    """从最近的报告构建稳定、可序列化的用户能力画像。"""
    session_list = list(sessions)
    strengths: Counter[str] = Counter()
    weaknesses: Counter[str] = Counter()
    dimensions: dict[str, list[int]] = defaultdict(list)
    scores: list[int] = []

    for session in session_list:
        if session.final_score is not None:
            scores.append(int(session.final_score))
        report = session.report_json if isinstance(session.report_json, dict) else {}
        for item in _as_strings(report.get("strengths")):
            strengths[item] += 1
        for key in ("improvements", "next_focus"):
            for item in _as_strings(report.get(key)):
                weaknesses[item] += 1
        raw_dimensions = report.get("dimensions")
        if isinstance(raw_dimensions, dict):
            for name, raw_score in raw_dimensions.items():
                score = _normalise_score(raw_score)
                if score is not None:
                    dimensions[str(name)].append(score)

    dimension_summary = [
        {"name": name, "score": round(sum(values) / len(values))}
        for name, values in dimensions.items()
        if values
    ]
    dimension_summary.sort(key=lambda item: int(item["score"]))

    return {
        "version": 1,
        "total_interviews": total_interviews if total_interviews is not None else len(session_list),
        "analysed_sessions": len(session_list),
        "average_score": round(sum(scores) / len(scores)) if scores else None,
        "strong_points": [item for item, _ in strengths.most_common(5)],
        "weak_points": [item for item, _ in weaknesses.most_common(5)],
        "dimensions": dimension_summary[:8],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def render_profile(profile: dict[str, Any] | None) -> str:
    """生成可安全注入 Planner 的紧凑文本。"""
    if not profile or not profile.get("analysed_sessions"):
        return ""
    parts = [f"已完成 {profile.get('total_interviews', 0)} 场面试"]
    if profile.get("average_score") is not None:
        parts.append(f"近期平均分 {profile['average_score']}/100")
    weak = _as_strings(profile.get("weak_points"))
    strong = _as_strings(profile.get("strong_points"))
    dimensions = profile.get("dimensions") if isinstance(profile.get("dimensions"), list) else []
    low_dimensions = [
        f"{item.get('name')} {item.get('score')}分"
        for item in dimensions[:3]
        if isinstance(item, dict) and item.get("name") and item.get("score") is not None
    ]
    if weak:
        parts.append("高频改进项：" + "；".join(weak[:4]))
    if low_dimensions:
        parts.append("优先能力维度：" + "；".join(low_dimensions))
    if strong:
        parts.append("已有优势：" + "；".join(strong[:3]))
    return "\n".join(parts)


async def refresh_user_profile(db: AsyncSession, user_id: int) -> dict[str, Any]:
    """重算并持久化用户画像，同时修正累计面试次数。"""
    user = await db.get(User, user_id)
    if not user:
        return {}

    count_result = await db.execute(
        select(func.count()).select_from(InterviewSession).where(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed",
        )
    )
    total = int(count_result.scalar() or 0)
    result = await db.execute(
        select(InterviewSession)
        .where(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed",
            InterviewSession.report_json.isnot(None),
        )
        .order_by(desc(InterviewSession.ended_at))
        .limit(PROFILE_SESSION_LIMIT)
    )
    profile = build_profile(result.scalars().all(), total_interviews=total)
    user.total_interviews = total
    user.weak_points = profile
    await db.flush()
    return profile


async def load_user_profile(db: AsyncSession, user_id: int) -> tuple[dict[str, Any], str]:
    user = await db.get(User, user_id)
    if not user:
        return {}, ""
    profile = user.weak_points if isinstance(user.weak_points, dict) else {}
    if not profile and user.total_interviews:
        profile = await refresh_user_profile(db, user_id)
    return profile, render_profile(profile)
