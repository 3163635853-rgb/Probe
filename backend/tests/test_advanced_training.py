from services.practice import compare_answers
from services.resume_parser import parse_resume_text, stories_from_resume
from services.technical import analyze_python_code, analyze_whiteboard, execute_readonly_sql
from services.video_analysis import analyze_delivery


def test_resume_parser_builds_evidence_ready_profile():
    parsed = parse_resume_text("""张三 产品经理\n工作经历\n2023.01-2025.06 负责会员增长项目，付费率提升 18%\n技能：数据分析、项目管理、Python\n""")
    assert "Python" in parsed["skills"]
    assert parsed["quantified_achievements"]
    assert parsed["completeness"]["has_metrics"] is True
    stories = stories_from_resume(parsed, 7)
    assert stories and stories[0]["metrics"]["source_resume_id"] == 7


def test_answer_comparison_detects_score_and_quantification_gain():
    comparison = compare_answers("我们做了一个活动", "我负责活动转化路径，两周内转化率从 12% 提升到 18%", 6, 8, {"weaknesses": ["缺少量化结果"]})
    assert comparison["score_delta"] == 2
    assert comparison["added_quantification"] >= 2


def test_delivery_analysis_exposes_explainable_training_metrics():
    metrics = analyze_delivery("嗯，我先说明结论。然后我负责推进项目，最终转化率提升 18%。", 30)
    assert metrics["filler_count"] >= 2
    assert metrics["answer_duration_sec"] == 30
    assert "pause_estimate" in metrics
    assert "long_sentence_count" in metrics
    assert 0 <= metrics["score"] <= 100


def test_technical_sandbox_and_static_analysis():
    code = analyze_python_code("def f(items):\n    for row in items:\n        for value in row:\n            print(value)\n")
    assert code["valid"] is True
    assert code["complexity_hint"] == "O(n^2)"
    assert execute_readonly_sql("DELETE FROM users")["valid"] is False
    query = execute_readonly_sql("SELECT name FROM users ORDER BY id")
    assert query["valid"] is True
    board = analyze_whiteboard('{"nodes":[{"id":"api"}],"edges":[],"considerations":["降级"]}')
    assert board["valid"] is True
