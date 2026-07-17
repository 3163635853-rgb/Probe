import json
import math
from services.llm import chat_json, EVAL_PARAMS
from agent.prompts import REPORTER_PROMPT


def normalize_report(data: dict) -> dict:
    """约束 LLM 报告结构，避免异常类型污染数据库和客户端。"""
    raw_dimensions = data.get("dimensions") if isinstance(data.get("dimensions"), dict) else {}
    dimensions: dict[str, int] = {}
    for name, value in raw_dimensions.items():
        try:
            score = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(score):
            dimensions[str(name)[:32]] = max(0, min(10, round(score)))

    try:
        overall = float(data.get("overall_score"))
    except (TypeError, ValueError):
        overall = (sum(dimensions.values()) / len(dimensions) * 10) if dimensions else 0
    if not math.isfinite(overall):
        overall = 0

    def string_list(key: str, limit: int) -> list[str]:
        value = data.get(key)
        if not isinstance(value, list):
            return []
        return [str(item).strip()[:200] for item in value if str(item).strip()][:limit]

    return {
        "overall_score": max(0, min(100, round(overall))),
        "dimensions": dimensions,
        "summary": str(data.get("summary") or "暂无总结")[:500],
        "strengths": string_list("strengths", 6),
        "improvements": string_list("improvements", 6),
        "next_focus": string_list("next_focus", 5),
    }


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
{json.dumps(rounds_summary, ensure_ascii=False, indent=2)}

请生成面试报告。"""

    messages = [
        {"role": "system", "content": REPORTER_PROMPT},
        {"role": "user", "content": user_msg},
    ]
    return normalize_report(await chat_json(messages, EVAL_PARAMS))
