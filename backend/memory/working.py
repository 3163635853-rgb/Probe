"""工作记忆 — Redis 存储，面试期间有效"""
from db.redis import redis_client

SESSION_TTL = 7200  # 2h


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
