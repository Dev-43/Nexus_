"""
RejectionHandlerNode
--------------------
Owns fields: sublevel_reject_count, next_action, error_message, error_node

Called after the user responds to a sublevel offer.

Decision values (from POST /sublevel/decision):
  "accept"      → user accepts the sublevel → route to sublevel content
  "reject"      → user declines, count < 3   → re-offer sublevel (frontend re-shows modal)
  "challenge"   → hard-exit path chosen       → challenge mode
  "reassess"    → hard-exit path chosen       → re-run skill assessment
  "microlesson" → hard-exit path chosen       → micro-lesson content

Hard exit fires when sublevel_reject_count reaches 3.
After hard exit, next_action is permanently set to the chosen alternative.
No further sublevel offers are made.
"""

from __future__ import annotations

from typing import Literal
from src.graph.state import NexusState

ALTERNATIVE_ACTIONS = {"challenge", "reassess", "microlesson"}

Decision = Literal["accept", "reject", "challenge", "reassess", "microlesson"]

HARD_EXIT_THRESHOLD = 3


def rejection_handler_node(state: NexusState) -> NexusState:
    try:
        if not state.get("feature_flags", {}).get("rejection_handler", True):
            return {
                **state,
                "next_action": "offer_sublevel",
                "error_message": None,
                "error_node": None,
            }

        decision: str = state.get("task_type", "reject")
        reject_count: int = state.get("sublevel_reject_count", 0)

        if decision == "accept":
            return {
                **state,
                "next_action": "run_sublevel",
                "error_message": None,
                "error_node": None,
            }

        if decision in ALTERNATIVE_ACTIONS:
            return {
                **state,
                "sublevel_reject_count": HARD_EXIT_THRESHOLD,
                "next_action": decision,
                "error_message": None,
                "error_node": None,
            }

        new_count = reject_count + 1

        if new_count >= HARD_EXIT_THRESHOLD:
            return {
                **state,
                "sublevel_reject_count": new_count,
                "next_action": "show_alternatives",
                "error_message": None,
                "error_node": None,
            }

        return {
            **state,
            "sublevel_reject_count": new_count,
            "next_action": "offer_sublevel",
            "error_message": None,
            "error_node": None,
        }

    except Exception as exc:
        return {
            **state,
            "next_action": "error",
            "error_message": str(exc),
            "error_node": "rejection_handler",
        }
