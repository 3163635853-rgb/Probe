from datetime import datetime, timezone

from services.notifications import push_data_for_url
from services.reminders import china_day_window_utc


def test_notification_routes_are_client_actionable():
    assert push_data_for_url("/interview/abc/report") == {
        "screen": "report",
        "session_uuid": "abc",
    }
    assert push_data_for_url("/invite?reward=1")["screen"] == "invite"
    assert push_data_for_url("/achievements")["screen"] == "achievements"
    assert push_data_for_url(None)["screen"] == "/notifications"


def test_china_day_window_is_converted_to_utc():
    start, end = china_day_window_utc(datetime(2026, 7, 17, 13, 0, tzinfo=timezone.utc))
    assert start == datetime(2026, 7, 16, 16, 0)
    assert end == datetime(2026, 7, 17, 16, 0)
