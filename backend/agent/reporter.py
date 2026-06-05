from services.llm import chat_json, EVAL_PARAMS
from agent.prompts import REPORTER_PROMPT


async def report(rounds: list[dict], mode_code: str, difficulty: int) -> dict:
    """生成面试报告"""
    rounds_summary = []
    for r in rounds:
        rounds_summary.append({
            "round": r.get("round_num"),
            "question": r.get("question", "")[:200],
            "answer": (r.get("answer") or "")[:200],
            "score": r.get("score", 0),
            "evaluation": r.get("evaluation", {}),
        })

    user_msg = f"""面试模式: {mode_code}
难度等级: {difficulty}/5
轮次数据:
{__import__('json').dumps(rounds_summary, ensure_ascii=False, indent=2)}

请生成面试报告。"""

    messages = [
        {"role": "system", "content": REPORTER_PROMPT},
        {"role": "user", "content": user_msg},
    ]
    return await chat_json(messages, EVAL_PARAMS)
