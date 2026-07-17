from services.llm import chat_json, PLAN_PARAMS
from agent.prompts import PLANNER_PROMPT


async def plan(
    industry: str,
    position: str,
    mode_code: str,
    difficulty: int,
    jd_text: str = "",
    user_profile: str = "",
    resume_context: str = "",
    company_name: str = "",
    interview_stage: str = "",
    interviewer_role: str = "",
    training_focus: str = "",
    rubric_context: str = "",
) -> dict:
    """生成面试大纲"""
    user_msg = f"""行业: {industry}
岗位: {position}
面试模式: {mode_code}
难度等级: {difficulty}/5
JD: {jd_text or '无'}
候选人历史短板: {user_profile or '无'}
候选人简历与经历素材: {resume_context or '无'}
目标公司: {company_name or '未指定'}
面试轮次: {interview_stage or '未指定'}
面试官角色: {interviewer_role or '未指定'}
专项训练重点: {training_focus or '无'}
自定义评分标准: {rubric_context or '默认标准'}

请生成面试大纲。"""

    messages = [
        {"role": "system", "content": PLANNER_PROMPT},
        {"role": "user", "content": user_msg},
    ]
    return await chat_json(messages, PLAN_PARAMS)
