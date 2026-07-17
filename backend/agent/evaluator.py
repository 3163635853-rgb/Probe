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
    result = await chat_json(messages, EVAL_PARAMS)

    # 校验 score 范围，防止 prompt 注入篡改分数
    score = result.get("score", 5)
    if not isinstance(score, (int, float)) or score < 0 or score > 10:
        result["score"] = 5
    else:
        result["score"] = int(score)

    evidence = result.get("evidence") if isinstance(result.get("evidence"), list) else []
    result["evidence"] = [
        {
            "type": "strength" if item.get("type") == "strength" else "weakness",
            "quote": str(item.get("quote") or "")[:160],
            "reason": str(item.get("reason") or "")[:240],
        }
        for item in evidence
        if isinstance(item, dict) and (item.get("quote") or item.get("reason"))
    ][:8]
    structure = result.get("structure") if isinstance(result.get("structure"), dict) else {}
    result["structure"] = {
        "framework": str(structure.get("framework") or "未识别")[:80],
        "complete": bool(structure.get("complete", False)),
        "missing": [str(item)[:120] for item in (structure.get("missing") or []) if str(item).strip()][:6]
        if isinstance(structure.get("missing"), list) else [],
    }
    result["strengths"] = [str(item)[:200] for item in result.get("strengths", []) if str(item).strip()][:6]
    result["weaknesses"] = [str(item)[:200] for item in result.get("weaknesses", []) if str(item).strip()][:6]
    result["suggestion"] = str(result.get("suggestion") or "")[:500]
    result["dimension"] = str(result.get("dimension") or "专业知识")[:32]
    return result
