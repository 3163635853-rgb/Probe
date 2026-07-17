"""Practice loops, answer optimization, and comparison helpers."""
from __future__ import annotations

import json
import re

from services.llm import EVAL_PARAMS, chat_json


def compare_answers(original: str, retry: str, original_score: int, retry_score: int, evaluation: dict) -> dict:
    original_terms = set(re.findall(r"[A-Za-z0-9]+|[\u4e00-\u9fff]{2,}", original.lower()))
    retry_terms = set(re.findall(r"[A-Za-z0-9]+|[\u4e00-\u9fff]{2,}", retry.lower()))
    added = list(retry_terms - original_terms)
    numeric_before = len(re.findall(r"\d+(?:\.\d+)?%?", original))
    numeric_after = len(re.findall(r"\d+(?:\.\d+)?%?", retry))
    return {
        "score_before": original_score,
        "score_after": retry_score,
        "score_delta": retry_score - original_score,
        "length_before": len(original),
        "length_after": len(retry),
        "new_key_phrases": added[:12],
        "added_quantification": max(0, numeric_after - numeric_before),
        "resolved_weaknesses": [
            weakness for weakness in evaluation.get("weaknesses", [])
            if any(token in retry for token in re.findall(r"[\u4e00-\u9fff]{2,}", str(weakness)))
        ][:5],
    }


async def optimize_answer(question: str, answer: str, evaluation: dict, stories: list[dict] | None = None) -> dict:
    prompt = f"""你是面试回答教练。只能使用候选人已经提供的事实，不得编造经历或数字。
问题：{question}
原回答：{answer}
点评：{json.dumps(evaluation, ensure_ascii=False)}
可用 STAR 素材：{json.dumps(stories or [], ensure_ascii=False)[:5000]}
请输出严格 JSON：
{{
  "structured": "保留原事实、结构更完整的版本",
  "concise": "60秒以内的精简版本",
  "star": "适合行为题时的 STAR 版本，不适合则与 structured 相同",
  "outline": ["回答步骤"],
  "fact_warnings": ["原回答中需要用户确认、不能擅自补充的事实"]
}}"""
    try:
        result = await chat_json([{"role": "user", "content": prompt}], EVAL_PARAMS)
        return {
            "structured": str(result.get("structured") or answer)[:5000],
            "concise": str(result.get("concise") or answer)[:3000],
            "star": str(result.get("star") or result.get("structured") or answer)[:5000],
            "outline": [str(item)[:200] for item in result.get("outline", []) if str(item).strip()][:8],
            "fact_warnings": [str(item)[:240] for item in result.get("fact_warnings", []) if str(item).strip()][:8],
        }
    except Exception:
        suggestion = str(evaluation.get("suggestion") or "先给结论，再补充行动和结果")
        return {
            "structured": f"建议结构：结论 → 背景与目标 → 我的行动 → 结果与复盘。\n原回答：{answer}",
            "concise": answer[:800],
            "star": f"S/T：补充背景和目标。\nA：{answer}\nR：补充可验证结果。",
            "outline": ["先给结论", "说明背景和目标", "突出个人行动", "给出量化结果", suggestion],
            "fact_warnings": ["不要补充原回答中不存在的数字或职责"],
        }
