from main import app
from models.base import Base
from db.seed import ACHIEVEMENTS


def test_application_routes_and_models_are_registered():
    paths = {route.path for route in app.routes}
    assert "/api/payment/webhook" in paths
    assert "/api/share/image/{share_uuid}.png" in paths
    assert "/health" in paths
    assert "/api/career/resumes" in paths
    assert "/api/practice/rounds/{round_id}/retry" in paths
    assert "/api/video/analyze" in paths
    assert "/api/coach/reviews" in paths
    assert "/api/enterprise/organizations" in paths
    assert "/api/technical/evaluate" in paths
    assert "share_records" in Base.metadata.tables
    assert "inviter_reward_given" in Base.metadata.tables["invite_records"].columns
    assert any(
        constraint.name == "uk_user_achievement"
        for constraint in Base.metadata.tables["user_achievements"].constraints
    )

    assert len(Base.metadata.tables) >= 30


def test_default_achievement_catalog_covers_usage_and_score_milestones():
    codes = {item["code"] for item in ACHIEVEMENTS}
    assert {"first_interview", "ten_interviews", "score_80", "score_90"} <= codes
    assert all(item["condition_type"] in {"interview_count", "score"} for item in ACHIEVEMENTS)
