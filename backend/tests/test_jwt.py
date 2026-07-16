from datetime import datetime, timezone

import utils.jwt as jwt_utils


def test_jwt_round_trip(monkeypatch):
    monkeypatch.setattr(jwt_utils, "SECRET", "test-secret-that-is-at-least-32-bytes")
    token, expires = jwt_utils.create_token(42, "user-uuid")
    payload = jwt_utils.decode_token(token)
    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["uuid"] == "user-uuid"
    assert expires > datetime.now(timezone.utc)
    assert jwt_utils.should_renew(payload) is False


def test_invalid_jwt_is_rejected():
    assert jwt_utils.decode_token("not-a-token") is None
