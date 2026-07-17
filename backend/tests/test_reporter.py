from agent.reporter import normalize_report


def test_report_normalization_clamps_llm_output():
    report = normalize_report({
        "overall_score": "108.4",
        "dimensions": {"专业知识": 12, "逻辑表达": "7.4", "bad": "x"},
        "summary": 123,
        "strengths": ["清晰", ""],
        "improvements": "not-a-list",
        "next_focus": ["系统设计"],
    })
    assert report["overall_score"] == 100
    assert report["dimensions"] == {"专业知识": 10, "逻辑表达": 7}
    assert report["summary"] == "123"
    assert report["strengths"] == ["清晰"]
    assert report["improvements"] == []
