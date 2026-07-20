import json
import time
from enum import Enum
from dataclasses import dataclass, field

from db.redis import redis_client
from config import settings


class AgentState(str, Enum):
    IDLE = "IDLE"
    PLANNING = "PLANNING"
    QUESTIONING = "QUESTIONING"
    EVALUATING = "EVALUATING"
    DECIDING = "DECIDING"
    PROBING = "PROBING"
    REPORTING = "REPORTING"
    DONE = "DONE"


@dataclass
class AgentContext:
    session_id: str
    user_id: int
    industry_id: int | None = None
    position_id: int | None = None
    mode_code: str = "mixed"
    difficulty: int = 3
    jd_text: str = ""
    plan: list[dict] = field(default_factory=list)
    plan_index: int = 0
    current_round: int = 0
    max_rounds: int = 10
    started_at: float = field(default_factory=time.time)
    recent_rounds: list[dict] = field(default_factory=list)
    user_profile: str = ""
    resume_context: str = ""
    company_name: str = ""
    interview_stage: str = ""
    interviewer_role: str = ""
    training_focus: str = ""
    rubric_context: str = ""
    organization_id: int | None = None
    rubric_id: int | None = None
    pass_score: int | None = None


# Redis keys
def _session_key(session_id: str) -> str:
    return f"session:{session_id}"


def _ctx_key(session_id: str) -> str:
    return f"agent_ctx:{session_id}"


SESSION_TTL = settings.SESSION_TTL


async def save_state(session_id: str, state: AgentState, round_num: int, plan: list | None = None):
    key = _session_key(session_id)
    mapping = {"state": state.value, "round": str(round_num), "started_at": str(time.time())}
    if plan is not None:
        mapping["plan"] = json.dumps(plan, ensure_ascii=False)
    await redis_client.hset(key, mapping=mapping)
    await redis_client.expire(key, SESSION_TTL)


async def save_context(session_id: str, ctx: AgentContext):
    key = _ctx_key(session_id)
    data = {
        "recent_rounds": ctx.recent_rounds[-3:],
        "plan": ctx.plan,
        "plan_index": ctx.plan_index,
        "current_round": ctx.current_round,
        "user_profile": ctx.user_profile,
        "difficulty": ctx.difficulty,
        "mode_code": ctx.mode_code,
        "jd_text": ctx.jd_text,
        "industry_id": ctx.industry_id,
        "position_id": ctx.position_id,
        "resume_context": ctx.resume_context,
        "company_name": ctx.company_name,
        "interview_stage": ctx.interview_stage,
        "interviewer_role": ctx.interviewer_role,
        "training_focus": ctx.training_focus,
        "rubric_context": ctx.rubric_context,
        "organization_id": ctx.organization_id,
        "rubric_id": ctx.rubric_id,
        "pass_score": ctx.pass_score,
    }
    await redis_client.set(key, json.dumps(data, ensure_ascii=False), ex=SESSION_TTL)


async def load_context(session_id: str) -> dict | None:
    key = _ctx_key(session_id)
    raw = await redis_client.get(key)
    if not raw:
        return None
    return json.loads(raw)


# Lua 脚本: 原子扣配额 + 设 active_session
DEDUCT_QUOTA_LUA = """
local quota = tonumber(redis.call('GET', KEYS[1]) or '0')
if quota <= 0 then return -1 end
if redis.call('EXISTS', KEYS[2]) == 1 then return -2 end
redis.call('DECR', KEYS[1])
redis.call('SET', KEYS[2], ARGV[1], 'EX', 7200)
return quota - 1
"""

_deduct_script = None


async def deduct_quota(user_id: int, session_id: str, month: str) -> int:
    """返回剩余配额，-1=配额不足，-2=已有活跃面试"""
    global _deduct_script
    if _deduct_script is None:
        _deduct_script = redis_client.register_script(DEDUCT_QUOTA_LUA)
    result = await _deduct_script(
        keys=[f"quota:{user_id}:{month}", f"active_session:{user_id}"],
        args=[session_id],
    )
    return int(result)
