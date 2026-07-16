from datetime import date, timedelta
from types import SimpleNamespace

from api.growth import (
    apply_streak,
    complete_growth_task,
    level_snapshot,
    normalize_dimension_score,
)


def test_level_snapshot_progression():
    level = level_snapshot(1240)
    assert level["level"] == 3
    assert level["level_xp"] == 240
    assert level["progress_percent"] == 48
    assert level["title"] == "破局"


def test_dimension_score_normalization():
    assert normalize_dimension_score(8.5) == 85
    assert normalize_dimension_score(72) == 72
    assert normalize_dimension_score(200) == 100
    assert normalize_dimension_score("bad") is None


def test_streak_and_task_reward_are_idempotent():
    today = date(2026, 7, 16)
    profile = SimpleNamespace(
        xp=100,
        current_streak=2,
        longest_streak=4,
        last_active_date=today - timedelta(days=1),
    )
    task = SimpleNamespace(
        status="pending",
        progress=0,
        target_count=1,
        completed_at=None,
        xp_reward=30,
    )

    assert complete_growth_task(profile, task, today) is True
    assert profile.xp == 130
    assert profile.current_streak == 3
    assert profile.longest_streak == 4
    assert task.status == "completed"

    assert complete_growth_task(profile, task, today) is False
    assert profile.xp == 130


def test_streak_resets_after_gap():
    today = date(2026, 7, 16)
    profile = SimpleNamespace(
        current_streak=8,
        longest_streak=8,
        last_active_date=today - timedelta(days=3),
    )
    apply_streak(profile, today)
    assert profile.current_streak == 1
    assert profile.longest_streak == 8
