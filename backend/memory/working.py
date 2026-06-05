"""工作记忆 — Redis 存储，面试期间有效"""
import json
from db.redis import redis_client

SESSION_TTL = 7200  # 2h


async def save_round(session_id: str, round_data: dict):
    """保存单轮数据到上下文"""
    ctx_key = f"agent_ctx:{session_id}"
    raw = await redis_client.get(ctx_key)
    ctx = json.loads(raw) if raw else {"recent_rounds": []}

    ctx["recent_rounds"].append(round_data)
    # 只保留最近 3 轮完整数据
    ctx["recent_rounds"] = ctx["recent_rounds"][-3:]

    await redis_client.set(ctx_key, json.dumps(ctx, ensure_ascii=False), ex=SESSION_TTL)


async def get_context(session_id: str) -> dict:
    """获取最近 3 轮 + 评估摘要"""
    ctx_key = f"agent_ctx:{session_id}"
    raw = await redis_client.get(ctx_key)
    if not raw:
        return {"recent_rounds": [], "user_profile": ""}
    return json.loads(raw)


async def mark_asked(session_id: str, question_id: int):
    """标记题目已问"""
    key = f"asked:{session_id}"
    await redis_client.sadd(key, str(question_id))
    await redis_client.expire(key, SESSION_TTL)


async def is_asked(session_id: str, question_id: int) -> bool:
    key = f"asked:{session_id}"
    return await redis_client.sismember(key, str(question_id))


async def get_asked_ids(session_id: str) -> set[int]:
    """获取所有已问题目 ID"""
    key = f"asked:{session_id}"
    members = await redis_client.smembers(key)
    return {int(m) for m in members}
