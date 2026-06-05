from services.llm import chat_json, EVAL_PARAMS
from agent.prompts import EVALUATOR_PROMPT


async def evaluate(
    question: str,
    answer: str,
    difficulty: int,
    reference_answer: str = "",
    scoring_criteria: str = "",
) -> dict:
    """评估单轮回答，返回 {score, dimension, strengths, weaknesses, suggestion}"""
    if not answer or not answer.strip():
        return {
            "score": 0,
            "dimension": "专业知识",
            "strengths": [],
            "weaknesses": ["未作答"],
            "suggestion": "建议尝试回答，即使不确定也可以说出思路",
        }

    user_msg = f"""面试问题: {question}
候选人回答: {answer}
难度等级: {difficulty}/5
参考答案: {reference_answer or '无'}
评分标准: {scoring_criteria or '无'}

请评估此回答。"""

    messages = [
        {"role": "system", "content": EVALUATOR_PROMPT},
        {"role": "user", "content": user_msg},
    ]
    return await chat_json(messages, EVAL_PARAMS)
