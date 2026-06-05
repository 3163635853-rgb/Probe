from services.llm import chat_json, PLAN_PARAMS
from agent.prompts import PLANNER_PROMPT


async def plan(
    industry: str,
    position: str,
    mode_code: str,
    difficulty: int,
    jd_text: str = "",
    user_profile: str = "",
) -> dict:
    """生成面试大纲"""
    user_msg = f"""行业: {industry}
岗位: {position}
面试模式: {mode_code}
难度等级: {difficulty}/5
JD: {jd_text or '无'}
候选人历史短板: {user_profile or '无'}

请生成面试大纲。"""

    messages = [
        {"role": "system", "content": PLANNER_PROMPT},
        {"role": "user", "content": user_msg},
    ]
    return await chat_json(messages, PLAN_PARAMS)
