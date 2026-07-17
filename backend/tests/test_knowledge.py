from types import SimpleNamespace

import pytest

from api.interview_stream import _generate_question
from knowledge.retriever import FAISSRetriever, QuestionResult
from knowledge.service import _lexical_score


def test_lexical_knowledge_fallback_prefers_matching_questions():
    matching = SimpleNamespace(
        question="请说明产品留存率下降时如何分析用户分层",
        question_type="scenario",
        tags=["产品", "留存", "用户分析"],
    )
    unrelated = SimpleNamespace(
        question="请解释 Python 协程调度机制",
        question_type="tech",
        tags=["Python"],
    )
    query = "产品 用户 留存 分析"
    assert _lexical_score(query, matching) > _lexical_score(query, unrelated)


def test_faiss_allows_industry_general_question_for_specific_position():
    retriever = FAISSRetriever(dim=2)
    retriever.build_index(
        [[1.0, 0.0]],
        [{
            "id": 9,
            "question": "通用行为题",
            "question_type": "behavior",
            "difficulty": 3,
            "industry_id": 1,
            "position_id": None,
            "reference_answer": "STAR",
            "scoring_criteria": "结构完整",
        }],
    )
    results = retriever.search([1.0, 0.0], position_id=99, top_k=1)
    assert results[0].reference_answer == "STAR"
    assert results[0].scoring_criteria == "结构完整"


@pytest.mark.asyncio
async def test_generated_knowledge_question_returns_rubric(monkeypatch):
    async def fake_retrieve(**kwargs):
        return [QuestionResult(
            id=7, question="题库问题", score=1.0, question_type="tech",
            difficulty=3, industry_id=1, position_id=None,
            reference_answer="参考答案", scoring_criteria="评分标准",
        )]

    async def fake_get_asked_ids(_session_id):
        return set()

    async def fake_mark_asked(_session_id, _question_id):
        return None

    monkeypatch.setattr("knowledge.service.retrieve_question", fake_retrieve)
    monkeypatch.setattr("memory.working.get_asked_ids", fake_get_asked_ids)
    monkeypatch.setattr("memory.working.mark_asked", fake_mark_asked)

    result = await _generate_question(
        {"topic": "架构", "type": "tech", "dimension": "专业知识"},
        "technical", 3, "", [], session_uuid="session", industry_id=1, position_id=2,
    )
    assert result == ("题库问题", "knowledge_base", 7, "参考答案", "评分标准")
