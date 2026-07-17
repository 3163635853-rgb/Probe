"""知识题库检索：FAISS 优先，数据库词法检索兜底。"""
from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy import or_, select

from db.mysql import AsyncSessionLocal
from knowledge.embedder import embed
from knowledge.retriever import QuestionResult, retriever
from models.knowledge import KnowledgeQuestion


def _tokens(text: str) -> set[str]:
    latin = re.findall(r"[a-zA-Z0-9+#.]{2,}", text.lower())
    chinese = [text[i : i + 2] for i in range(max(0, len(text) - 1)) if "\u4e00" <= text[i] <= "\u9fff"]
    return set(latin + chinese)


def _lexical_score(query: str, question: KnowledgeQuestion) -> float:
    query_tokens = _tokens(query)
    haystack = " ".join([
        question.question or "",
        question.question_type or "",
        " ".join(question.tags or []) if isinstance(question.tags, list) else str(question.tags or ""),
    ])
    target = _tokens(haystack)
    if not query_tokens:
        return 0.0
    return len(query_tokens & target) / len(query_tokens)


async def retrieve_question(
    *,
    query_text: str,
    top_k: int = 1,
    industry_id: int | None = None,
    position_id: int | None = None,
    difficulty: int | None = None,
    exclude_ids: set[int] | None = None,
) -> list[QuestionResult]:
    """检索题目。向量服务或索引不可用时仍能从 MySQL 题库出题。"""
    excluded = exclude_ids or set()
    if retriever.index is not None and retriever.index.ntotal > 0:
        try:
            query_vector = await embed(query_text)
            results = retriever.search(
                query_vector=query_vector,
                top_k=top_k,
                industry_id=industry_id,
                position_id=position_id,
                difficulty=difficulty,
                exclude_ids=excluded,
            )
            if results:
                return results
        except Exception:
            # Embedding 服务异常时继续使用数据库兜底，不影响面试主流程。
            pass

    async with AsyncSessionLocal() as db:
        conditions = [KnowledgeQuestion.status == "active"]
        if industry_id is not None:
            conditions.append(KnowledgeQuestion.industry_id == industry_id)
        if position_id is not None:
            # 岗位专属题优先，同时允许行业通用题。
            conditions.append(
                or_(KnowledgeQuestion.position_id == position_id, KnowledgeQuestion.position_id.is_(None))
            )
        if difficulty is not None:
            conditions.append(KnowledgeQuestion.difficulty.between(max(1, difficulty - 1), min(5, difficulty + 1)))
        if excluded:
            conditions.append(KnowledgeQuestion.id.notin_(excluded))
        result = await db.execute(select(KnowledgeQuestion).where(*conditions).limit(200))
        candidates = list(result.scalars().all())

    candidates.sort(key=lambda item: (_lexical_score(query_text, item), item.position_id is not None), reverse=True)
    return [
        QuestionResult(
            id=item.id,
            question=item.question,
            score=_lexical_score(query_text, item),
            question_type=item.question_type,
            difficulty=item.difficulty,
            industry_id=item.industry_id,
            position_id=item.position_id,
        )
        for item in candidates[:top_k]
    ]


def knowledge_status() -> dict[str, int | bool]:
    return {
        "faiss_loaded": retriever.index is not None and retriever.index.ntotal > 0,
        "faiss_vectors": int(retriever.index.ntotal) if retriever.index is not None else 0,
        "embedding_dim": retriever.dim,
    }
