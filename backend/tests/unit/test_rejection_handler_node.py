"""
Unit tests for RejectionHandlerNode (Feature 20)

Run with:  uv run pytest tests/unit/test_rejection_handler_node.py -v
"""

from __future__ import annotations

import pytest

from src.graph.nodes.rejection_handler import (
    HARD_EXIT_THRESHOLD,
    rejection_handler_node,
)
from src.graph.state import NexusState


def make_state(**overrides) -> NexusState:
    base = {
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
        "fail_count": 0,
        "sublevel_reject_count": 0,
        "test_history": [],
        "points": 0,
        "badges": [],
        "streak_days": 0,
        "next_action": "",
        "task_type": "reject",
        "error_message": None,
        "error_node": None,
        "feature_flags": {},
    }
    return {**base, **overrides}


class TestAcceptDecision:
    def test_accept_routes_to_run_sublevel(self):
        assert rejection_handler_node(make_state(task_type="accept"))["next_action"] == "run_sublevel"

    def test_accept_does_not_increment_counter(self):
        result = rejection_handler_node(make_state(task_type="accept", sublevel_reject_count=1))
        assert result["sublevel_reject_count"] == 1

    def test_accept_clears_error_fields(self):
        result = rejection_handler_node(make_state(task_type="accept", error_message="old", error_node="x"))
        assert result["error_message"] is None
        assert result["error_node"] is None


class TestRejectionUnderThreshold:
    def test_first_rejection_increments_count(self):
        assert rejection_handler_node(make_state(task_type="reject"))["sublevel_reject_count"] == 1

    def test_second_rejection_increments_count(self):
        assert rejection_handler_node(make_state(task_type="reject", sublevel_reject_count=1))["sublevel_reject_count"] == 2

    def test_under_threshold_routes_to_offer_sublevel(self):
        assert rejection_handler_node(make_state(task_type="reject"))["next_action"] == "offer_sublevel"

    def test_second_rejection_still_re_offers(self):
        assert rejection_handler_node(make_state(task_type="reject", sublevel_reject_count=1))["next_action"] == "offer_sublevel"


class TestHardExitThreshold:
    def test_third_rejection_sets_show_alternatives(self):
        result = rejection_handler_node(make_state(task_type="reject", sublevel_reject_count=2))
        assert result["sublevel_reject_count"] == HARD_EXIT_THRESHOLD
        assert result["next_action"] == "show_alternatives"


class TestAlternativeDecisions:
    @pytest.mark.parametrize("decision,expected", [
        ("challenge", "challenge"),
        ("reassess", "reassess"),
        ("microlesson", "microlesson"),
    ])
    def test_alternative_routes_correctly(self, decision, expected):
        result = rejection_handler_node(make_state(task_type=decision, sublevel_reject_count=3))
        assert result["next_action"] == expected

    @pytest.mark.parametrize("decision", ["challenge", "reassess", "microlesson"])
    def test_alternative_locks_count(self, decision):
        result = rejection_handler_node(make_state(task_type=decision, sublevel_reject_count=3))
        assert result["sublevel_reject_count"] == HARD_EXIT_THRESHOLD


class TestFeatureFlag:
    def test_feature_flag_disabled_skips_node(self):
        result = rejection_handler_node(make_state(
            task_type="reject",
            feature_flags={"rejection_handler": False},
        ))
        assert result["sublevel_reject_count"] == 0
        assert result["next_action"] == "offer_sublevel"


class TestErrorHandling:
    def test_error_path_sets_error_fields(self, monkeypatch):
        import src.graph.nodes.rejection_handler as rh_module
        monkeypatch.setattr(rh_module, "HARD_EXIT_THRESHOLD", None)
        result = rejection_handler_node(make_state(task_type="reject", sublevel_reject_count=0))
        monkeypatch.setattr(rh_module, "HARD_EXIT_THRESHOLD", 3)
        assert result["next_action"] == "error"
        assert result["error_node"] == "rejection_handler"


class TestStateImmutability:
    def test_original_state_not_mutated(self):
        state = make_state(task_type="reject", sublevel_reject_count=1)
        rejection_handler_node(state)
        assert state["sublevel_reject_count"] == 1
