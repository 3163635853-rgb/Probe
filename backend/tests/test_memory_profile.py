from types import SimpleNamespace

from memory.profile import build_profile, render_profile


def test_cross_interview_profile_aggregates_reports():
    sessions = [
        SimpleNamespace(
            final_score=72,
            report_json={
                "strengths": ["结构清晰", "表达自然"],
                "improvements": ["补充业务结果"],
                "next_focus": ["数据量化"],
                "dimensions": {"逻辑表达": 8.2, "专业知识": 65},
            },
        ),
        SimpleNamespace(
            final_score=84,
            report_json={
                "strengths": ["结构清晰"],
                "improvements": ["数据量化"],
                "next_focus": ["补充业务结果"],
                "dimensions": {"逻辑表达": 86, "专业知识": 7.1},
            },
        ),
    ]

    profile = build_profile(sessions, total_interviews=5)
    assert profile["total_interviews"] == 5
    assert profile["analysed_sessions"] == 2
    assert profile["average_score"] == 78
    assert profile["strong_points"][0] == "结构清晰"
    assert set(profile["weak_points"][:2]) == {"补充业务结果", "数据量化"}
    assert profile["dimensions"][0]["name"] == "专业知识"

    prompt_profile = render_profile(profile)
    assert "已完成 5 场面试" in prompt_profile
    assert "高频改进项" in prompt_profile
    assert "优先能力维度" in prompt_profile


def test_empty_profile_does_not_pollute_planner_prompt():
    assert render_profile({"analysed_sessions": 0}) == ""
