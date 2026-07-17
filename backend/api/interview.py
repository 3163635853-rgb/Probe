import uuid as uuid_lib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from config import settings


async def _get_ongoing_session(db: AsyncSession, uuid: str, user_id: int) -> "InterviewSession":
    """获取用户拥有的进行中 session，不存在则 404"""
    from models.interview import InterviewSession
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.uuid == uuid,
            InterviewSession.user_id == user_id,
            InterviewSession.status == "ongoing",
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail={"code": 40401, "message": "面试不存在或已结束"})
    return session
from pydantic import BaseModel
from typing import Optional

from db.mysql import get_db
from db.redis import redis_client
from models.user import User
from models.interview import InterviewSession, InterviewRound
from models.config import Industry, Position
from api.deps import get_current_user
from api.quota import ensure_quota_initialized, _quota_key
from agent.core import deduct_quota, save_state, save_context, AgentState, AgentContext

router = APIRouter(prefix="/api/interview", tags=["interview"])


class StartRequest(BaseModel):
    industry_id: int
    position_id: int
    mode: str = "mixed"
    difficulty: int = 3
    jd_text: Optional[str] = None


class AnswerRequest(BaseModel):
    content: str
    type: str = "text"


@router.post("/start")
async def start_interview(
    req: StartRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    await ensure_quota_initialized(user)

    # 创建 session UUID 先生成，保证 Lua 脚本写入正确值
    session_uuid = str(uuid_lib.uuid4())

    # 原子扣配额
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    result = await deduct_quota(user.id, session_uuid, month)
    if result == -1:
        raise HTTPException(status_code=403, detail={"code": 40201, "message": "配额不足，本月免费次数已用完"})
    if result == -2:
        raise HTTPException(status_code=409, detail={"code": 40202, "message": "已有进行中的面试"})

    # 创建 session
    session = InterviewSession(
        uuid=session_uuid,
        user_id=user.id,
        industry_id=req.industry_id,
        position_id=req.position_id,
        mode_code=req.mode,
        difficulty=req.difficulty,
        jd_text=req.jd_text,
        status="ongoing",
    )
    db.add(session)
    try:
        await db.commit()
    except Exception:
        # DB 提交失败：补偿回滚 Redis 配额
        await redis_client.incr(f"quota:{user.id}:{month}")
        await redis_client.delete(f"active_session:{user.id}")
        raise HTTPException(status_code=500, detail={"code": 50001, "message": "创建面试失败，请重试"})
    await db.refresh(session)

    # 更新 active_session 为真实 session_uuid
    await redis_client.set(f"active_session:{user.id}", session_uuid, ex=settings.SESSION_TTL)

    # 初始化 Agent 状态
    await save_state(session_uuid, AgentState.PLANNING, 0)

    ctx = AgentContext(
        session_id=session_uuid,
        user_id=user.id,
        industry_id=req.industry_id,
        position_id=req.position_id,
        mode_code=req.mode,
        difficulty=req.difficulty,
        jd_text=req.jd_text or "",
    )
    await save_context(session_uuid, ctx)

    from utils.jwt import create_token as _create_token
    sse_token, _ = _create_token(user.id, user.uuid)

    return {
        "code": 0,
        "data": {
            "session_uuid": session_uuid,
            "stream_url": f"/api/interview/{session_uuid}/stream?token={sse_token}",
        },
    }


@router.post("/{uuid}/answer")
async def submit_answer(
    uuid: str,
    req: AnswerRequest,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    session = await _get_ongoing_session(db, uuid, user.id)

    # 限制回答长度
    content = req.content[:5000]

    # 写入 Redis 供 Agent 消费
    await redis_client.set(f"answer:{uuid}", content, ex=300)

    return {"code": 0, "data": {"received": True, "round": session.total_rounds + 1}}


@router.post("/{uuid}/skip")
async def skip_question(
    uuid: str,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    session = await _get_ongoing_session(db, uuid, user.id)

    await redis_client.set(f"answer:{uuid}", "__SKIP__", ex=300)

    return {"code": 0, "data": {"skipped": True, "round": session.total_rounds + 1}}


@router.post("/{uuid}/end")
async def end_interview(
    uuid: str,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    session = await _get_ongoing_session(db, uuid, user.id)

    # 通知 Agent 循环结束（如果它还在 _wait_for_answer）
    await redis_client.set(f"answer:{uuid}", "__END__", ex=300)

    # 直接更新 DB 状态，不依赖 Agent 循环处理
    from datetime import datetime, timezone
    session.status = "completed"
    session.ended_at = datetime.now(timezone.utc)
    if session.started_at:
        session.duration_sec = int((session.ended_at - session.started_at).total_seconds())
    await db.commit()

    # 清理 active session
    await redis_client.delete(f"active_session:{user.id}")

    return {"code": 0, "data": {"status": "reporting"}}


@router.get("/{uuid}/report")
async def get_report(
    uuid: str,
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.uuid == uuid, InterviewSession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail={"code": 40401, "message": "面试不存在"})
    if not session.report_json:
        raise HTTPException(status_code=404, detail={"code": 40402, "message": "报告尚未生成"})

    # 获取 rounds
    rounds_result = await db.execute(
        select(InterviewRound)
        .where(InterviewRound.session_id == session.id)
        .order_by(InterviewRound.round_num, InterviewRound.probe_depth, InterviewRound.id)
    )
    rounds = rounds_result.scalars().all()

    # 行业/岗位名称
    industry_name = ""
    position_name = ""
    if session.industry_id:
        ind = await db.get(Industry, session.industry_id)
        industry_name = ind.name if ind else ""
    if session.position_id:
        pos = await db.get(Position, session.position_id)
        position_name = pos.name if pos else ""

    report = {**(session.report_json or {})}
    report.update({
        "session_uuid": session.uuid,
        "industry": industry_name,
        "position": position_name,
        "mode": session.mode_code,
        "difficulty": session.difficulty,
        "duration_sec": session.duration_sec,
        "total_rounds": session.total_rounds,
        "rounds": [
            {
                "round": r.round_num,
                "question_type": r.question_type,
                "probe_depth": r.probe_depth,
                "question": r.question,
                "answer": r.answer,
                "score": r.score,
                "evaluation": r.evaluation,
            }
            for r in rounds
        ],
        "share_image_url": None,
        "created_at": session.started_at.isoformat() if session.started_at else None,
    })

    return {"code": 0, "data": report}


@router.get("/history")
async def interview_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    offset = (page - 1) * page_size

    # Count
    from sqlalchemy import func
    count_result = await db.execute(
        select(func.count()).select_from(InterviewSession).where(InterviewSession.user_id == user.id)
    )
    total = count_result.scalar() or 0

    # Items
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .order_by(desc(InterviewSession.started_at))
        .offset(offset)
        .limit(page_size)
    )
    sessions = result.scalars().all()

    # Batch load industry/position names to avoid N+1
    industry_ids = {s.industry_id for s in sessions if s.industry_id}
    position_ids = {s.position_id for s in sessions if s.position_id}
    ind_map = {}
    pos_map = {}
    if industry_ids:
        ind_result = await db.execute(select(Industry).where(Industry.id.in_(industry_ids)))
        ind_map = {i.id: i.name for i in ind_result.scalars().all()}
    if position_ids:
        pos_result = await db.execute(select(Position).where(Position.id.in_(position_ids)))
        pos_map = {p.id: p.name for p in pos_result.scalars().all()}

    items = []
    for s in sessions:
        items.append({
            "session_uuid": s.uuid,
            "industry": ind_map.get(s.industry_id, ""),
            "position": pos_map.get(s.position_id, ""),
            "mode": s.mode_code,
            "status": s.status,
            "final_score": s.final_score,
            "duration_sec": s.duration_sec,
            "total_rounds": s.total_rounds,
            "started_at": s.started_at.isoformat() if s.started_at else None,
        })

    return {
        "code": 0,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": offset + page_size < total,
        },
    }


@router.get("/active")
async def get_active(auth: tuple = Depends(get_current_user)):
    user, _ = auth
    session_uuid = await redis_client.get(f"active_session:{user.id}")
    if not session_uuid:
        return {"code": 0, "data": None}

    state_data = await redis_client.hgetall(f"session:{session_uuid}")
    if not state_data:
        return {"code": 0, "data": None}

    from utils.jwt import create_token as _create_token
    sse_token, _ = _create_token(user.id, user.uuid)

    return {
        "code": 0,
        "data": {
            "session_uuid": session_uuid,
            "state": state_data.get("state", "IDLE"),
            "round": int(state_data.get("round", "0")),
            "started_at": state_data.get("started_at"),
            "stream_url": f"/api/interview/{session_uuid}/stream?token={sse_token}",
        },
    }


@router.get("/stats")
async def interview_stats(
    limit: int = Query(20, ge=1, le=50),
    auth: tuple = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """最近 N 次面试的分数趋势"""
    user, _ = auth

    result = await db.execute(
        select(
            InterviewSession.uuid,
            InterviewSession.final_score,
            InterviewSession.mode_code,
            InterviewSession.started_at,
        )
        .where(
            InterviewSession.user_id == user.id,
            InterviewSession.status == "completed",
            InterviewSession.final_score.isnot(None),
        )
        .order_by(desc(InterviewSession.started_at))
        .limit(limit)
    )
    rows = result.all()

    items = [
        {
            "session_uuid": r.uuid,
            "score": r.final_score,
            "mode": r.mode_code,
            "date": r.started_at.isoformat() if r.started_at else None,
        }
        for r in reversed(rows)
    ]

    scores = [r.final_score for r in rows if r.final_score]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    return {
        "code": 0,
        "data": {
            "items": items,
            "total_completed": len(rows),
            "avg_score": avg_score,
            "best_score": max(scores) if scores else 0,
        },
    }