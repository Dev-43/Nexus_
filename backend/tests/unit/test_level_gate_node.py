"""
Unit tests for LevelGateNode.

All tests use the make_state() helper — no DB, no LLM calls.
"""

from __future__ import annotations

import pytest

from src.graph.nodes.level_gate import level_gate_node
from src.graph.state import NexusState


# ── Test helper ───────────────────────────────────────────────────────────────

def make_state(**overrides) -> NexusState:
    base: NexusState = {
        "user_id": "test-user",
        "session_id": "test-session",
        "skill_name": "Python",
        "skill_score": 0.5,
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
        "test_history": [],
        "fail_count": 0,
        "sublevel_reject_count": 0,
        "points": 0,
        "badges": [],
        "streak_days": 0,
        "next_action": "",
        "task_type": "level_gate",
        "error_message": None,
        "error_node": None,
        "feature_flags": {"level_gate_enabled": True},
        "_gate_answers": [],
    }
    return {**base, **overrides}


def make_answers(correct_count: int, total: int, concept_tag: str = "loops") -> list[dict]:
    """Build a synthetic answers list with `correct_count` correct answers out of `total`."""
    answers = []
    for i in range(total):
        answers.append({
            "question_id": f"q{i}",
            "selected_option": "A",
            "correct": i < correct_count,
            "concept_tag": concept_tag,
        })
    return answers


# ── Happy path: PASS (score ≥ 70%) ───────────────────────────────────────────

def test_pass_score_sets_unlock_next_level():
    state = make_state(_gate_answers=make_answers(8, 10))  # 80%
    result = level_gate_node(state)
    assert result["next_action"] == "unlock_next_level"


def test_pass_score_writes_passed_true_to_test_history():
    state = make_state(_gate_answers=make_answers(7, 10))  # 70%
    result = level_gate_node(state)
    assert result["test_history"][-1]["passed"] is True


def test_pass_score_does_not_increment_fail_count():
    state = make_state(_gate_answers=make_answers(8, 10), fail_count=1)
    result = level_gate_node(state)
    assert result["fail_count"] == 1  # unchanged


def test_perfect_score_passes():
    state = make_state(_gate_answers=make_answers(10, 10))
    result = level_gate_node(state)
    assert result["next_action"] == "unlock_next_level"
    assert result["test_history"][-1]["score"] == 1.0


# ── Partial credit (60–69%) ───────────────────────────────────────────────────

def test_partial_score_first_attempt_gives_partial_retry():
    state = make_state(_gate_answers=make_answers(6, 10))  # 60%
    result = level_gate_node(state)
    assert result["next_action"] == "partial_retry"


def test_partial_score_first_attempt_does_not_increment_fail_count():
    state = make_state(_gate_answers=make_answers(6, 10))
    result = level_gate_node(state)
    assert result["fail_count"] == 0


def test_partial_score_second_attempt_increments_fail_count():
    # Simulate a prior attempt at level 0
    prior_history = [{
        "level_index": 0, "score": 0.62, "passed": False,
        "attempt_number": 1, "answers": [],
    }]
    state = make_state(
        _gate_answers=make_answers(6, 10),
        test_history=prior_history,
        fail_count=0,
    )
    result = level_gate_node(state)
    assert result["next_action"] == "offer_sublevel"
    assert result["fail_count"] == 1


def test_69_percent_is_partial_not_pass():
    state = make_state(_gate_answers=make_answers(69, 100))
    result = level_gate_node(state)
    # 69% is below PASS_THRESHOLD (70%), so partial on first attempt
    assert result["next_action"] == "partial_retry"


# ── Fail (score < 60%) ────────────────────────────────────────────────────────

def test_fail_score_offers_sublevel():
    state = make_state(_gate_answers=make_answers(5, 10))  # 50%
    result = level_gate_node(state)
    assert result["next_action"] == "offer_sublevel"


def test_fail_score_increments_fail_count():
    state = make_state(_gate_answers=make_answers(4, 10), fail_count=0)
    result = level_gate_node(state)
    assert result["fail_count"] == 1


def test_fail_score_accumulates_fail_count():
    state = make_state(_gate_answers=make_answers(3, 10), fail_count=2)
    result = level_gate_node(state)
    assert result["fail_count"] == 3


def test_zero_score_fails():
    state = make_state(_gate_answers=make_answers(0, 10))
    result = level_gate_node(state)
    assert result["next_action"] == "offer_sublevel"
    assert result["test_history"][-1]["score"] == 0.0


# ── roadmap_locked ────────────────────────────────────────────────────────────

def test_first_attempt_sets_roadmap_locked():
    state = make_state(_gate_answers=make_answers(8, 10), roadmap_locked=False)
    result = level_gate_node(state)
    assert result["roadmap_locked"] is True


def test_first_attempt_locks_even_on_fail():
    state = make_state(_gate_answers=make_answers(2, 10), roadmap_locked=False)
    result = level_gate_node(state)
    assert result["roadmap_locked"] is True


def test_first_attempt_locks_even_on_partial():
    state = make_state(_gate_answers=make_answers(6, 10), roadmap_locked=False)
    result = level_gate_node(state)
    assert result["roadmap_locked"] is True


def test_already_locked_stays_locked():
    prior_history = [{"level_index": 0, "score": 0.8, "passed": True, "attempt_number": 1, "answers": []}]
    state = make_state(
        _gate_answers=make_answers(8, 10),
        roadmap_locked=True,
        test_history=prior_history,
        current_level_index=1,
    )
    result = level_gate_node(state)
    assert result["roadmap_locked"] is True


# ── test_history record ───────────────────────────────────────────────────────

def test_test_history_record_contains_all_fields():
    answers = make_answers(7, 10)
    state = make_state(_gate_answers=answers, current_level_index=2)
    result = level_gate_node(state)
    record = result["test_history"][-1]
    assert record["level_index"] == 2
    assert "score" in record
    assert "passed" in record
    assert "attempt_number" in record
    assert record["answers"] == answers


def test_test_history_appends_not_replaces():
    prior = [{"level_index": 0, "score": 0.5, "passed": False, "attempt_number": 1, "answers": []}]
    state = make_state(_gate_answers=make_answers(8, 10), test_history=prior)
    result = level_gate_node(state)
    assert len(result["test_history"]) == 2


def test_attempt_number_increments_correctly():
    prior = [{"level_index": 0, "score": 0.4, "passed": False, "attempt_number": 1, "answers": []}]
    state = make_state(_gate_answers=make_answers(8, 10), test_history=prior)
    result = level_gate_node(state)
    assert result["test_history"][-1]["attempt_number"] == 2


# ── Edge cases ────────────────────────────────────────────────────────────────

def test_empty_answers_returns_zero_score_fail():
    state = make_state(_gate_answers=[])
    result = level_gate_node(state)
    assert result["next_action"] == "offer_sublevel"
    assert result["test_history"][-1]["score"] == 0.0


def test_missing_gate_answers_key_does_not_crash():
    # _gate_answers key entirely absent
    state = make_state()
    state.pop("_gate_answers", None)
    result = level_gate_node(state)
    # Should handle gracefully — either fail path or error path, never exception
    assert result["next_action"] in ("offer_sublevel", "handle_error")


def test_feature_flag_disabled_skips_gate():
    state = make_state(
        _gate_answers=make_answers(0, 10),
        feature_flags={"level_gate_enabled": False},
    )
    result = level_gate_node(state)
    assert result["next_action"] == "unlock_next_level"


def test_error_never_raises():
    # Inject a broken answers list to trigger the except branch
    state = make_state(_gate_answers="not-a-list")  # type: ignore[arg-type]
    result = level_gate_node(state)
    # Must not raise — must write to error fields
    assert result["next_action"] == "handle_error"
    assert result["error_node"] == "level_gate_node"
    assert result["error_message"] is not None


# ── Score boundary precision ──────────────────────────────────────────────────

def test_exactly_70_percent_passes():
    state = make_state(_gate_answers=make_answers(7, 10))  # exactly 70%
    result = level_gate_node(state)
    assert result["next_action"] == "unlock_next_level"


def test_exactly_60_percent_is_partial():
    state = make_state(_gate_answers=make_answers(6, 10))  # exactly 60%
    result = level_gate_node(state)
    assert result["next_action"] == "partial_retry"


def test_59_percent_fails():
    state = make_state(_gate_answers=make_answers(59, 100))  # 59%
    result = level_gate_node(state)
    assert result["next_action"] == "offer_sublevel"
