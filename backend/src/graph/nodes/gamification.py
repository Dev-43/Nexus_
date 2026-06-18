"""
GamificationNode — owned fields:
  READS:  points, badges, streak_days, current_level_index, roadmap,
          test_history, task_type, feature_flags, user_id
  WRITES: points, badges, streak_days, next_action, error_message, error_node

Runs after every meaningful user action by setting task_type to one of the
POINT_ACTIONS keys and routing through this node.
Never raises — always writes a valid next_action.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any

from src.graph.state import NexusState
from src.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

# ── Points table ────────────────────────────────────────────────────────────

POINT_ACTIONS: dict[str, int] = {
    "daily_activity":       10,
    "first_attempt_pass":   25,
    "level_complete":       50,
    "streak_milestone":    100,
    "roadmap_complete":    200,
}

# ── Badge conditions ─────────────────────────────────────────────────────────
# Each entry: badge_name -> callable(state) -> bool
# Evaluated after every point update; badge awarded once (first time True).

def _roadmap_levels_completed(state: NexusState, target_level: str) -> bool:
    """True when the roadmap exists and current_level_index has passed all levels."""
    roadmap = state.get("roadmap")
    if not roadmap:
        return False
    levels = roadmap.get("levels", [])
    if not levels:
        return False
    # All levels completed = current_level_index >= total levels
    return (
        state.get("skill_level") == target_level
        and state.get("current_level_index", 0) >= len(levels)
    )


BADGE_CONDITIONS: dict[str, Any] = {
    "⭐ First skill":   lambda s: bool(s.get("roadmap")),
    "🥉 Bronze":        lambda s: _roadmap_levels_completed(s, "beginner"),
    "🥈 Silver":        lambda s: _roadmap_levels_completed(s, "intermediate"),
    "🥇 Gold":          lambda s: _roadmap_levels_completed(s, "advanced"),
    "💎 Diamond":       lambda s: all(
        b in s.get("badges", []) for b in ["🥉 Bronze", "🥈 Silver", "🥇 Gold"]
    ),
    "🔥 7-day streak":  lambda s: s.get("streak_days", 0) >= 7,
    "⚡ Speed runner":  lambda s: False,   # set externally via task_type="speed_runner_check"
    "🎯 No hints":      lambda s: False,   # set externally via task_type="no_hints_check"
}

# ── Streak helpers ───────────────────────────────────────────────────────────

def _compute_streak(last_active_iso: str | None, current_streak: int) -> int:
    """Increment streak if last_active was yesterday; reset to 1 if gap > 1 day."""
    today = date.today()
    if not last_active_iso:
        return 1
    try:
        last = datetime.fromisoformat(last_active_iso).date()
    except ValueError:
        return 1

    delta = (today - last).days
    if delta == 0:
        return current_streak          # same day — no change
    if delta == 1:
        return current_streak + 1      # consecutive day
    return 1                           # gap — reset


def _check_streak_milestone(new_streak: int, old_streak: int) -> bool:
    """True if we crossed a milestone boundary (every 7 days)."""
    milestones = {7, 14, 30, 60, 100}
    return any(old_streak < m <= new_streak for m in milestones)


# ── Badge checker ────────────────────────────────────────────────────────────

def _check_badges(state: NexusState) -> list[str]:
    """Return list of newly earned badge names not already in state.badges."""
    current = set(state.get("badges", []))
    newly_earned: list[str] = []
    for badge_name, condition_fn in BADGE_CONDITIONS.items():
        if badge_name not in current:
            try:
                if condition_fn(state):
                    newly_earned.append(badge_name)
            except Exception:
                pass   # never crash badge checking
    return newly_earned


# ── Supabase helpers ─────────────────────────────────────────────────────────

async def _load_user_stats(user_id: str) -> dict:
    """Load existing user_stats row; return empty defaults if not found."""
    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("user_stats")
            .select("*")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data or {}
    except Exception:
        return {}


async def _upsert_user_stats(
    user_id: str,
    points: int,
    badges: list[str],
    streak_days: int,
) -> None:
    try:
        supabase = get_supabase_client()
        supabase.table("user_stats").upsert(
            {
                "user_id": user_id,
                "points": points,
                "badges": badges,
                "streak_days": streak_days,
                "last_active": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="user_id",
        ).execute()
    except Exception as exc:
        logger.warning("Failed to upsert user_stats for %s: %s", user_id, exc)


# ── Main node function ────────────────────────────────────────────────────────

async def gamification_node(state: NexusState) -> NexusState:
    """
    Award points for the current action, update streak, check badge conditions,
    persist to Supabase user_stats, and return updated state.
    """
    # Feature flag guard
    if not state.get("feature_flags", {}).get("gamification_enabled", True):
        logger.info("Gamification feature flag disabled — skipping")
        return {**state, "next_action": "complete"}

    try:
        user_id   = state["user_id"]
        task_type = state.get("task_type", "")

        # ── Load persisted stats ─────────────────────────────────────────────
        db_stats = await _load_user_stats(user_id)

        current_points  = state.get("points", db_stats.get("points", 0))
        current_badges  = list(state.get("badges", db_stats.get("badges", [])))
        current_streak  = state.get("streak_days", db_stats.get("streak_days", 0))
        last_active_iso = db_stats.get("last_active")

        # ── Points ───────────────────────────────────────────────────────────
        points_earned = POINT_ACTIONS.get(task_type, 0)
        if points_earned:
            logger.info("Awarding %d points for action '%s'", points_earned, task_type)

        new_points = current_points + points_earned

        # ── Streak ───────────────────────────────────────────────────────────
        new_streak = _compute_streak(last_active_iso, current_streak)

        # Check streak milestone bonus (only if streak actually changed)
        if new_streak != current_streak and _check_streak_milestone(new_streak, current_streak):
            new_points += POINT_ACTIONS["streak_milestone"]
            logger.info("Streak milestone reached (%d days) — bonus points awarded", new_streak)

        # ── Build updated state for badge checking ────────────────────────────
        intermediate_state: NexusState = {
            **state,
            "points":      new_points,
            "badges":      current_badges,
            "streak_days": new_streak,
        }

        # ── Badges ───────────────────────────────────────────────────────────
        new_badges = _check_badges(intermediate_state)
        if new_badges:
            logger.info("New badges earned: %s", new_badges)
            current_badges = current_badges + new_badges

        # ── Persist ──────────────────────────────────────────────────────────
        await _upsert_user_stats(user_id, new_points, current_badges, new_streak)

        return {
            **state,
            "points":        new_points,
            "badges":        current_badges,
            "streak_days":   new_streak,
            "next_action":   "complete",
            "error_message": None,
            "error_node":    None,
        }

    except Exception as exc:
        logger.exception("GamificationNode failed: %s", exc)
        return {
            **state,
            "next_action":   "error",
            "error_message": str(exc),
            "error_node":    "gamification",
        }
