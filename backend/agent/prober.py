from services.llm import chat_json, EVAL_PARAMS
from agent.prompts import PROBER_PROMPT


async def probe(
    question: str,
    answer: str,
    score: int,
    evaluation: dict,
    probe_depth: int = 0,
) -> dict:
    """决定是否追问，返回 {should_probe, question, probe_reason}"""
    if probe_depth >= 2:
        return {"should_probe": False, "question": None, "probe_reason": "已达最大追问深度"}

    user_msg = f"""原始问题: {question}
候选人回答: {answer}
当前评分: {score}/10
评估分析: strengths={evaluation.get('strengths', [])}, weaknesses={evaluation.get('weaknesses', [])}
当前追问层级: {probe_depth}

请决定是否需要追问。"""

    messages = [
        {"role": "system", "content": PROBER_PROMPT},
        {"role": "user", "content": user_msg},
    ]
    return await chat_json(messages, EVAL_PARAMS)
