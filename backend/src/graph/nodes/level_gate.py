"""
LevelGateNode — gates progression between roadmap levels.

Owned state fields (reads and/or writes):
  Reads:  skill_name, current_level_index, test_history, fail_count,
          roadmap_locked, feature_flags
  Writes: test_history, fail_count, roadmap_locked, next_action, error_message, error_node

Score thresholds:
  ≥ 70%  → pass  → unlock next level        → next_action = "unlock_next_level"
  60–69% → partial → one grace retry         → next_action = "partial_retry"
             (fail_count NOT incremented on first attempt at this level)
  < 60%  → fail  → increment fail_count      → next_action = "offer_sublevel"

roadmap_locked is set True on the FIRST attempt at level 0, regardless of score.
"""

from __future__ import annotations

from typing import Any

from src.graph.state import NexusState


# ── Score thresholds ─────────────────────────────────────────────────────────

PASS_THRESHOLD = 0.70
PARTIAL_THRESHOLD = 0.60


# ── Helpers ──────────────────────────────────────────────────────────────────

def _compute_score(answers: list[dict[str, Any]]) -> float:
    """
    Derive a 0.0–1.0 score from an answers list.

    Each answer dict is expected to have a 'correct' bool key.
    Returns 0.0 if answers is empty (prevents ZeroDivisionError).
    """
    if not answers:
        return 0.0
    correct = sum(1 for a in answers if a.get("correct", False))
    return correct / len(answers)


def _attempt_number_for_level(test_history: list[dict], level_index: int) -> int:
    """Count how many prior attempts exist for this level (1-based for the new attempt)."""
    prior = [t for t in test_history if t.get("level_index") == level_index]
    return len(prior) + 1


def _is_first_attempt_at_level_0(test_history: list[dict]) -> bool:
    """True only for the very first submission ever (level 0, attempt 1)."""
    attempts_at_0 = [t for t in test_history if t.get("level_index") == 0]
    return len(attempts_at_0) == 0


# ── Node ─────────────────────────────────────────────────────────────────────

def level_gate_node(state: NexusState) -> NexusState:
    """
    Evaluate a gate test submission and update state.

    Expects state to contain:
        _gate_answers: list[dict]  — injected by the route handler before invoking the graph
    """
    try:
        # Feature flag guard
        if not state.get("feature_flags", {}).get("level_gate_enabled", True):
            return {
                **state,
                "next_action": "unlock_next_level",
            }

        answers: list[dict] = state.get("_gate_answers", [])
        level_index: int = state.get("current_level_index", 0)
        test_history: list[dict] = list(state.get("test_history", []))
        fail_count: int = state.get("fail_count", 0)
        roadmap_locked: bool = state.get("roadmap_locked", False)

        score = _compute_score(answers)
        attempt_number = _attempt_number_for_level(test_history, level_index)

        # ── Lock roadmap on first ever attempt ───────────────────────────────
        if _is_first_attempt_at_level_0(test_history):
            roadmap_locked = True

        # ── Determine result ─────────────────────────────────────────────────
        if score >= PASS_THRESHOLD:
            passed = True
            next_action = "unlock_next_level"
            # fail_count does NOT increment on pass

        elif score >= PARTIAL_THRESHOLD:
            # Partial credit: one grace retry per level (attempt_number == 1 only)
            passed = False
            if attempt_number == 1:
                next_action = "partial_retry"
                # fail_count NOT incremented — grace retry
            else:
                # Second attempt with partial score still counts as a fail
                next_action = "offer_sublevel"
                fail_count += 1

        else:
            # Below 60%
            passed = False
            next_action = "offer_sublevel"
            fail_count += 1

        # ── Write full answer record to test_history ─────────────────────────
        record: dict[str, Any] = {
            "level_index": level_index,
            "score": round(score, 4),
            "passed": passed,
            "attempt_number": attempt_number,
            "answers": answers,
        }
        test_history.append(record)

        return {
            **state,
            "test_history": test_history,
            "fail_count": fail_count,
            "roadmap_locked": roadmap_locked,
            "next_action": next_action,
            "error_message": None,
            "error_node": None,
        }

    except Exception as exc:  # noqa: BLE001
        return {
            **state,
            "error_message": str(exc),
            "error_node": "level_gate_node",
            "next_action": "handle_error",
        }
