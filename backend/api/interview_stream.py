import asyncio
import json
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Query, Header, HTTPException
from fastapi.responses import StreamingResponse
import logging
from sqlalchemy import select

logger = logging.getLogger(__name__)

from db.mysql import AsyncSessionLocal
from db.redis import redis_client
from models.user import User
from models.interview import InterviewSession, InterviewRound
from models.config import Industry, Position
from agent.core import (
    AgentState, save_state, get_state, load_context, save_context,
)
from agent.planner import plan
from agent.evaluator import evaluate
from agent.prober import probe
from agent.reporter import report
from utils.jwt import decode_token

router = APIRouter(prefix="/api/interview", tags=["interview_stream"])

HEARTBEAT_INTERVAL = 15  # seconds
IDLE_TIMEOUT = 300       # 5min no answer → reminder
ABANDON_TIMEOUT = 900    # 15min → paused


async def _push_event(session_id: str, seq: int, event: str, data: dict) -> str:
    """格式化 SSE 事件并存入 Redis"""
    payload = json.dumps(data, ensure_ascii=False)
    log_entry = f"{seq}|{event}|{payload}"
    await redis_client.rpush(f"sse_log:{session_id}", log_entry)
    await redis_client.expire(f"sse_log:{session_id}", 7200)
    return f"id: {seq}\nevent: {event}\ndata: {payload}\n\n"


@router.get("/{uuid}/stream")
async def interview_stream(uuid: str, token: str = Query(...), last_event_id: int = Header(0, alias="last-event-id")):
    """SSE 面试流"""
    # 验证 token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail={"code": 40001, "message": "token 无效"})

    user_id = int(payload["sub"])

    # 验证 session
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(InterviewSession).where(
                InterviewSession.uuid == uuid,
                InterviewSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail={"code": 40401, "message": "面试不存在"})

    async def event_generator():
        seq = last_event_id
        last_activity = time.time()

        # 重连恢复: 从 Redis sse_log 重放
        if last_event_id > 0:
            logs = await redis_client.lrange(f"sse_log:{uuid}", 0, -1)
            for log_entry in logs:
                parts = log_entry.split("|", 2)
                if len(parts) == 3 and int(parts[0]) > last_event_id:
                    yield f"id: {parts[0]}\nevent: {parts[1]}\ndata: {parts[2]}\n\n"
                    seq = max(seq, int(parts[0]))

        # Connected event
        seq += 1
        yield await _push_event(uuid, seq, "connected", {"session_uuid": uuid, "resumed_from": last_event_id})

        # 运行 Agent 循环
        async for event_str in _run_agent_loop(uuid, user_id, session.id, seq):
            yield event_str
            last_activity = time.time()
            seq += 1

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _run_agent_loop(session_uuid: str, user_id: int, session_db_id: int, start_seq: int):
    """Agent 主循环，yield SSE 事件字符串"""
    seq = start_seq

    # 加载上下文
    ctx_data = await load_context(session_uuid)
    if not ctx_data:
        return

    difficulty = ctx_data.get("difficulty", 3)
    mode_code = ctx_data.get("mode_code", "mixed")
    jd_text = ctx_data.get("jd_text", "")
    plan_data = ctx_data.get("plan")
    plan_index = ctx_data.get("plan_index", 0)
    current_round = ctx_data.get("current_round", 0)
    recent_rounds = ctx_data.get("recent_rounds", [])

    # 获取行业/岗位名称
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(InterviewSession).where(InterviewSession.id == session_db_id))
        session_obj = result.scalar_one_or_none()
        industry_name = ""
        position_name = ""
        if session_obj:
            if session_obj.industry_id:
                ind = await db.get(Industry, session_obj.industry_id)
                industry_name = ind.name if ind else ""
            if session_obj.position_id:
                pos = await db.get(Position, session_obj.position_id)
                position_name = pos.name if pos else ""

    # PLANNING: 生成面试大纲
    if not plan_data:
        seq += 1
        yield await _push_event(session_uuid, seq, "status", {"state": "PLANNING", "progress": "0/10", "elapsed": 0})

        try:
            plan_result = await plan(
                industry=industry_name,
                position=position_name,
                mode_code=mode_code,
                difficulty=difficulty,
                jd_text=jd_text,
            )
            plan_data = plan_result.get("outline", [])
            max_rounds = plan_result.get("total_rounds", 10)
        except Exception as e:
            logger.warning(f"Plan generation failed, using default: {e}")
            plan_data = [{"round": i + 1, "type": "tech", "topic": "通用", "difficulty": difficulty} for i in range(10)]
            max_rounds = 10

        await save_state(session_uuid, AgentState.QUESTIONING, 0, plan_data)

    max_rounds = len(plan_data) if plan_data else 10

    # 主循环
    for round_idx in range(plan_index, max_rounds):
        current_round = round_idx + 1
        plan_item = plan_data[round_idx] if round_idx < len(plan_data) else {}

        # 出题
        await save_state(session_uuid, AgentState.QUESTIONING, current_round)

        question_text, q_source = await _generate_question(
            plan_item, mode_code, difficulty, jd_text, recent_rounds,
            session_uuid=session_uuid,
            industry_id=ctx_data.get("industry_id") if ctx_data else None,
            position_id=ctx_data.get("position_id") if ctx_data else None,
        )

        seq += 1
        yield await _push_event(session_uuid, seq, "question", {
            "round": current_round,
            "content": question_text,
            "type": "initial",
            "dimension": plan_item.get("dimension", "专业知识"),
        })

        # 等待用户回答
        answer = await _wait_for_answer(session_uuid)
        if answer == "__END__":
            break
        if answer == "__REMINDER__":
            seq += 1
            yield await _push_event(session_uuid, seq, "reminder", {"message": "还在吗？如果需要更多时间思考，请继续作答"})
            # 继续等到真正超时
            answer = await _wait_for_answer(session_uuid, timeout=600)
            if answer in ("__END__", "__REMINDER__"):
                break

        skipped = answer == "__SKIP__"
        answer_text = "" if skipped else answer

        # 评估
        await save_state(session_uuid, AgentState.EVALUATING, current_round)
        seq += 1
        yield await _push_event(session_uuid, seq, "thinking", {"content": "正在分析你的回答..."})

        eval_result = await evaluate(
            question=question_text,
            answer=answer_text,
            difficulty=difficulty,
        )
        score = eval_result.get("score", 0)

        seq += 1
        yield await _push_event(session_uuid, seq, "evaluation", {
            "round": current_round,
            "score": score,
            "brief": eval_result.get("suggestion", ""),
            "visible": False,
        })

        # 写入 DB
        async with AsyncSessionLocal() as db:
            ir = InterviewRound(
                session_id=session_db_id,
                round_num=current_round,
                question_type="initial",
                question=question_text,
                answer=answer_text if not skipped else None,
                skipped=skipped,
                evaluation=eval_result,
                score=score,
                question_source=q_source,
            )
            db.add(ir)
            # 更新 session total_rounds
            sess = await db.get(InterviewSession, session_db_id)
            if sess:
                sess.total_rounds = current_round
            await db.commit()

        # 记录到 recent_rounds
        recent_rounds.append({
            "round_num": current_round,
            "question": question_text,
            "answer": answer_text,
            "score": score,
            "evaluation": eval_result,
        })

        # 追问决策
        await save_state(session_uuid, AgentState.DECIDING, current_round)
        if not skipped and score < 8:
            probe_result = await probe(
                question=question_text,
                answer=answer_text,
                score=score,
                evaluation=eval_result,
            )
            if probe_result.get("should_probe"):
                probe_q = probe_result.get("question", "")
                if probe_q:
                    seq += 1
                    yield await _push_event(session_uuid, seq, "question", {
                        "round": current_round,
                        "content": probe_q,
                        "type": "probe",
                        "dimension": plan_item.get("dimension", "专业知识"),
                    })

                    # 等追问的回答
                    probe_answer = await _wait_for_answer(session_uuid)
                    if probe_answer == "__END__":
                        break
                    if probe_answer != "__SKIP__":
                        # 评估追问回答（不单独记录分数，合并到本轮）
                        pass

        # 保存上下文
        ctx_data["plan"] = plan_data
        ctx_data["plan_index"] = round_idx + 1
        ctx_data["current_round"] = current_round
        ctx_data["recent_rounds"] = recent_rounds[-3:]
        await redis_client.set(f"agent_ctx:{session_uuid}", json.dumps(ctx_data, ensure_ascii=False), ex=7200)

        # Status update
        seq += 1
        yield await _push_event(session_uuid, seq, "status", {
            "state": "QUESTIONING",
            "progress": f"{current_round}/{max_rounds}",
            "elapsed": 0,
        })

    # REPORTING
    await save_state(session_uuid, AgentState.REPORTING, current_round)
    seq += 1
    yield await _push_event(session_uuid, seq, "status", {"state": "REPORTING", "progress": f"{current_round}/{max_rounds}", "elapsed": 0})

    # 从 DB 查全部轮次用于生成报告
    all_rounds_for_report = recent_rounds  # fallback
    try:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import asc
            rounds_result = await db.execute(
                select(InterviewRound)
                .where(InterviewRound.session_id == session_db_id)
                .order_by(asc(InterviewRound.round_num))
            )
            db_rounds = rounds_result.scalars().all()
            if db_rounds:
                all_rounds_for_report = [
                    {
                        "round_num": r.round_num,
                        "question": r.question,
                        "answer": r.answer or "",
                        "score": r.score or 0,
                        "evaluation": r.evaluation or {},
                    }
                    for r in db_rounds
                ]
    except Exception as e:
        logger.warning(f"Failed to load rounds from DB for report: {e}")

    # 生成报告
    try:
        report_data = await report(rounds=all_rounds_for_report, mode_code=mode_code, difficulty=difficulty)
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        report_data = {
            "overall_score": 0,
            "dimensions": {},
            "summary": "报告生成失败，请重试",
            "strengths": [],
            "improvements": [],
            "next_focus": [],
        }

    # 写入 DB
    async with AsyncSessionLocal() as db:
        sess = await db.get(InterviewSession, session_db_id)
        if sess:
            sess.status = "completed"
            sess.report_json = report_data
            sess.final_score = report_data.get("overall_score", 0)
            sess.ended_at = datetime.now(timezone.utc)
            if sess.started_at:
                sess.duration_sec = int((sess.ended_at - sess.started_at).total_seconds())
            await db.commit()

    # 清理 Redis
    await redis_client.delete(f"active_session:{user_id}")

    seq += 1
    yield await _push_event(session_uuid, seq, "report", {
        "session_uuid": session_uuid,
        "overall_score": report_data.get("overall_score", 0),
        "report_url": f"/api/interview/{session_uuid}/report",
    })

    await save_state(session_uuid, AgentState.DONE, current_round)
    seq += 1
    yield await _push_event(session_uuid, seq, "done", {})


async def _generate_question(plan_item: dict, mode_code: str, difficulty: int, jd_text: str, recent_rounds: list, session_uuid: str = "", industry_id: int | None = None, position_id: int | None = None) -> tuple[str, str]:
    """根据计划项生成面试题。返回 (question_text, source)"""
    from services.llm import chat, CHAT_PARAMS
    from knowledge.retriever import retriever
    from knowledge.embedder import embed
    from memory.working import get_asked_ids

    topic = plan_item.get("topic", "通用技术")
    q_type = plan_item.get("type", "tech")
    dim = plan_item.get("dimension", "专业知识")

    # 先尝试从题库检索
    source = "ai"
    try:
        asked_ids = await get_asked_ids(session_uuid) if session_uuid else set()
        if retriever.index and retriever.index.ntotal > 0:
            query_text = f"{topic} {q_type} {dim}"
            query_vec = await embed(query_text)
            results = retriever.search(
                query_vector=query_vec,
                top_k=1,
                industry_id=industry_id,
                position_id=position_id,
                difficulty=difficulty,
                exclude_ids=asked_ids,
            )
            if results:
                from memory.working import mark_asked
                await mark_asked(session_uuid, results[0].id)
                return results[0].question, "knowledge_base"
    except Exception as e:
        logger.debug(f"Knowledge retrieval failed, falling back to AI: {e}")

    # AI 生成
    context = ""
    if recent_rounds:
        last = recent_rounds[-1]
        context = f"上一题是关于'{last.get('question', '')[:50]}'，候选人表现{'较好' if last.get('score', 0) >= 7 else '一般'}。"

    prompt = f"""你是一位面试官，请出一道面试题。
类型: {q_type}
考察维度: {dim}
话题方向: {topic}
难度: {difficulty}/5
JD参考: {jd_text[:200] if jd_text else '无'}
上下文: {context or '这是第一题'}

直接输出面试问题，不要有任何前缀或解释。简洁自然，像真实面试官在说话。"""

    messages = [{"role": "user", "content": prompt}]
    return await chat(messages, CHAT_PARAMS), source


async def _wait_for_answer(session_uuid: str, timeout: int = 900) -> str:
    """轮询等待用户回答，timeout=15min，带心跳和 reminder"""
    key = f"answer:{session_uuid}"
    start = time.time()
    last_ping = time.time()
    reminder_sent = False

    while time.time() - start < timeout:
        answer = await redis_client.getdel(key)
        if answer:
            return answer

        elapsed = time.time() - start

        # 15s 心跳
        if time.time() - last_ping >= HEARTBEAT_INTERVAL:
            await redis_client.rpush(f"sse_log:{session_uuid}", f"0|ping|")
            last_ping = time.time()

        # 5min idle → reminder
        if not reminder_sent and elapsed >= IDLE_TIMEOUT:
            reminder_sent = True
            return "__REMINDER__"

        await asyncio.sleep(1)
    return "__END__"  # 超时自动结束
