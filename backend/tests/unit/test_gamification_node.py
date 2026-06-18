"""
Unit tests for GamificationNode.

All Supabase calls are mocked — zero real DB hits.
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.graph.state import NexusState
from src.graph.nodes.gamification import (
    BADGE_CONDITIONS,
    POINT_ACTIONS,
    _check_badges,
    _compute_streak,
    _check_streak_milestone,
    gamification_node,
)


# ── Shared test helper ────────────────────────────────────────────────────────

def make_state(**overrides) -> NexusState:
    base: NexusState = {
        "user_id": "test-user",
        "session_id": "test-session",
        "skill_name": "Python",
        "skill_score": 0.0,
        "skill_level": "beginner",
        "personality_profile": None,
        "quiz_skipped": False,
        "roadmap": None,
        "roadmap_version": 1,
        "current_level_index": 0,
        "roadmap_locked": False,
        "user_roadmap_feedback": None,
        "regeneration_count": 0,
        "skip_assessment": False,
        "fail_count": 0,
        "sublevel_reject_count": 0,
        "test_history": [],
        "points": 0,
        "badges": [],
        "streak_days": 0,
        "next_action": "",
        "task_type": "",
        "error_message": None,
        "error_node": None,
        "feature_flags": {"gamification_enabled": True},
    }
    return {**base, **overrides}


# ── _compute_streak ───────────────────────────────────────────────────────────

def test_streak_first_visit():
    assert _compute_streak(None, 0) == 1

def test_streak_consecutive_day():
    from datetime import date, timedelta
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    assert _compute_streak(yesterday, 3) == 4

def test_streak_same_day():
    from datetime import date
    today = date.today().isoformat()
    assert _compute_streak(today, 5) == 5

def test_streak_gap_resets():
    assert _compute_streak("2020-01-01T00:00:00", 10) == 1

def test_streak_milestone_detection():
    assert _check_streak_milestone(7, 6) is True    # crossed 7
    assert _check_streak_milestone(8, 6) is True    # also crossed 7 (6→8 passes through it)
    assert _check_streak_milestone(7, 7) is False   # already at milestone, didn't cross
    assert _check_streak_milestone(9, 8) is False   # between milestones
    assert _check_streak_milestone(14, 13) is True  # crossed 14


# ── _check_badges ─────────────────────────────────────────────────────────────

def test_first_skill_badge_awarded_when_roadmap_exists():
    state = make_state(roadmap={"levels": [{"index": 0}]})
    new_badges = _check_badges(state)
    assert "⭐ First skill" in new_badges

def test_first_skill_badge_not_awarded_when_no_roadmap():
    state = make_state(roadmap=None)
    new_badges = _check_badges(state)
    assert "⭐ First skill" not in new_badges

def test_bronze_badge_awarded_on_beginner_completion():
    state = make_state(
        skill_level="beginner",
        roadmap={"levels": [{"index": 0}, {"index": 1}]},
        current_level_index=2,  # past all levels
    )
    new_badges = _check_badges(state)
    assert "🥉 Bronze" in new_badges

def test_bronze_badge_not_awarded_mid_roadmap():
    state = make_state(
        skill_level="beginner",
        roadmap={"levels": [{"index": 0}, {"index": 1}]},
        current_level_index=1,  # still in progress
    )
    new_badges = _check_badges(state)
    assert "🥉 Bronze" not in new_badges

def test_diamond_badge_requires_all_three():
    state = make_state(badges=["🥉 Bronze", "🥈 Silver", "🥇 Gold"])
    new_badges = _check_badges(state)
    assert "💎 Diamond" in new_badges

def test_diamond_badge_not_awarded_without_all_three():
    state = make_state(badges=["🥉 Bronze", "🥈 Silver"])
    new_badges = _check_badges(state)
    assert "💎 Diamond" not in new_badges

def test_seven_day_streak_badge():
    state = make_state(streak_days=7)
    new_badges = _check_badges(state)
    assert "🔥 7-day streak" in new_badges

def test_already_earned_badge_not_re_awarded():
    state = make_state(badges=["⭐ First skill"], roadmap={"levels": []})
    new_badges = _check_badges(state)
    assert "⭐ First skill" not in new_badges


# ── POINT_ACTIONS table ───────────────────────────────────────────────────────

def test_point_actions_completeness():
    required = {"daily_activity", "first_attempt_pass", "level_complete",
                "streak_milestone", "roadmap_complete"}
    assert required.issubset(POINT_ACTIONS.keys())

def test_point_values():
    assert POINT_ACTIONS["level_complete"] == 50
    assert POINT_ACTIONS["first_attempt_pass"] == 25
    assert POINT_ACTIONS["roadmap_complete"] == 200


# ── gamification_node (full node, mocked DB) ──────────────────────get───────────

@pytest.fixture
def mock_supabase():
    """Patches both _load_user_stats and _upsert_user_stats."""
    with (
        patch(
            "src.graph.nodes.gamification._load_user_stats",
            new_callable=AsyncMock,
            return_value={},          # empty DB — fresh user
        ) as mock_load,
        patch(
            "src.graph.nodes.gamification._upsert_user_stats",
            new_callable=AsyncMock,
        ) as mock_upsert,
    ):
        yield mock_load, mock_upsert


@pytest.mark.asyncio
async def test_level_complete_awards_50_points(mock_supabase):
    state = make_state(task_type="level_complete", points=0)
    result = await gamification_node(state)
    assert result["points"] == 50
    assert result["next_action"] == "complete"
    assert result["error_message"] is None

@pytest.mark.asyncio
async def test_first_attempt_pass_awards_25_points(mock_supabase):
    state = make_state(task_type="first_attempt_pass", points=100)
    result = await gamification_node(state)
    assert result["points"] == 125

@pytest.mark.asyncio
async def test_unknown_task_type_awards_zero_points(mock_supabase):
    state = make_state(task_type="some_unrelated_action", points=50)
    result = await gamification_node(state)
    assert result["points"] == 50   # no change

@pytest.mark.asyncio
async def test_bronze_badge_awarded_via_node(mock_supabase):
    state = make_state(
        task_type="roadmap_complete",
        skill_level="beginner",
        roadmap={"levels": [{"index": 0}, {"index": 1}]},
        current_level_index=2,
        badges=[],
    )
    result = await gamification_node(state)
    assert "🥉 Bronze" in result["badges"]
    assert result["points"] == 200   # roadmap_complete points

@pytest.mark.asyncio
async def test_feature_flag_disabled_skips_gamification(mock_supabase):
    state = make_state(
        task_type="level_complete",
        points=0,
        feature_flags={"gamification_enabled": False},
    )
    result = await gamification_node(state)
    assert result["points"] == 0   # no points added
    assert result["next_action"] == "complete"

@pytest.mark.asyncio
async def test_node_never_raises_on_db_error():
    """Even if _load_user_stats explodes, the node must not raise — routes to error."""
    with patch(
        "src.graph.nodes.gamification._load_user_stats",
        new_callable=AsyncMock,
        side_effect=Exception("DB connection refused"),
    ):
        state = make_state(task_type="level_complete")
        result = await gamification_node(state)
        assert result["next_action"] == "error"
        assert result["error_node"] == "gamification"
        assert "DB connection refused" in result["error_message"]

@pytest.mark.asyncio
async def test_upsert_called_with_correct_args(mock_supabase):
    mock_load, mock_upsert = mock_supabase
    state = make_state(task_type="level_complete", points=50, user_id="user-abc")
    await gamification_node(state)
    mock_upsert.assert_called_once()
    args = mock_upsert.call_args[0]
    assert args[0] == "user-abc"    # user_id
    assert args[1] == 100           # 50 existing + 50 for level_complete
