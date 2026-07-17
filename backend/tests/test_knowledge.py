from types import SimpleNamespace

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
