import pytest
from datetime import datetime

from agent import evaluator
from models.base import Base
from api.enterprise import organization_sessions_query
from services.video_analysis import analyze_audio_track


@pytest.mark.asyncio
async def test_evaluator_normalizes_candidate_consistency(monkeypatch):
    async def fake_chat_json(messages, params):
        assert "候选人证据库开始" in messages[-1]["content"]
        return {
            "score": 8,
            "dimension": "影响力",
            "strengths": ["行动具体"],
            "weaknesses": ["结果可再明确"],
            "suggestion": "补充结果口径",
            "evidence": [{"type": "strength", "quote": "我推动了三个团队", "reason": "体现个人行动"}],
            "structure": {"framework": "STAR", "complete": True, "missing": []},
            "consistency": {"status": "potential_conflict", "matched_story": "会员增长", "issues": ["回答称 20%，简历记录 18%"]},
        }

    monkeypatch.setattr(evaluator, "chat_json", fake_chat_json)
    result = await evaluator.evaluate("讲一次增长经历", "我推动了三个团队，增长 20%", 3, candidate_evidence="会员增长结果为 18%")
    assert result["score"] == 8
    assert result["consistency"]["status"] == "potential_conflict"
    assert result["consistency"]["matched_story"] == "会员增长"


def test_closed_loop_models_are_registered():
    assert "drill_attempts" in Base.metadata.tables
    assert "video_analysis_id" in Base.metadata.tables["coach_reviews"].columns
    assert "consent_granted_at" in Base.metadata.tables["coach_reviews"].columns
    assert "organization_question_id" in Base.metadata.tables["interview_rounds"].columns


def test_enterprise_dashboard_query_is_tenant_scoped():
    statement = organization_sessions_query(42, [1, 2], datetime(2026, 1, 1))
    sql = str(statement)
    assert "interview_sessions.organization_id" in sql
    assert "interview_sessions.user_id" in sql


def test_audio_analysis_degrades_when_ffmpeg_is_missing(monkeypatch, tmp_path):
    monkeypatch.setattr("services.video_analysis.shutil.which", lambda _: None)
    result = analyze_audio_track(tmp_path / "answer.mp4")
    assert result["audio_metrics_available"] is False
