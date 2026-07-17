from main import app
from models.base import Base


def test_application_routes_and_models_are_registered():
    paths = {route.path for route in app.routes}
    assert "/api/payment/webhook" in paths
    assert "/api/share/image/{share_uuid}.png" in paths
    assert "/health" in paths
    assert "share_records" in Base.metadata.tables
    assert "inviter_reward_given" in Base.metadata.tables["invite_records"].columns

    assert len(Base.metadata.tables) == 21
