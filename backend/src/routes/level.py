"""
POST /level/{level_id}/submit — gate test submission endpoint.

Accepts the user's answers, injects them into state as `_gate_answers`,
invokes the LevelGateNode, persists the test_history record to Supabase,
and returns the score + routing decision.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.graph.nodes.level_gate import level_gate_node
from src.graph.state import NexusState
from src.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/level", tags=["level"])


# ── Request / Response models ─────────────────────────────────────────────────

class AnswerItem(BaseModel):
    question_id: str
    selected_option: str
    correct: bool
    concept_tag: str = ""          # used by gap analysis downstream


class GateTestSubmission(BaseModel):
    session_id: str
    roadmap_id: str
    answers: list[AnswerItem] = Field(min_length=1)


class GateTestResult(BaseModel):
    score: float
    passed: bool
    next_action: str
    fail_count: int
    attempt_number: int
    roadmap_locked: bool


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/{level_id}/submit", response_model=GateTestResult)
async def submit_gate_test(level_id: str, body: GateTestSubmission) -> GateTestResult:
    supabase = get_supabase_client()

    # ── Fetch current session state from Supabase ─────────────────────────────
    session_row = (
        supabase.table("skill_sessions")
        .select("*")
        .eq("id", body.session_id)
        .single()
        .execute()
    )
    if not session_row.data:
        raise HTTPException(status_code=404, detail="Session not found")

    roadmap_row = (
        supabase.table("roadmaps")
        .select("*")
        .eq("id", body.roadmap_id)
        .single()
        .execute()
    )
    if not roadmap_row.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    # ── Reconstruct minimal NexusState for the node ───────────────────────────
    test_history_rows = (
        supabase.table("test_history")
        .select("*")
        .eq("roadmap_id", body.roadmap_id)
        .execute()
    )

    existing_history: list[dict[str, Any]] = [
        {
            "level_index": row["level_index"],
            "score": row["score"],
            "passed": row["passed"],
            "attempt_number": row["attempt_number"],
            "answers": row["answers"] or [],
        }
        for row in (test_history_rows.data or [])
    ]

    state: NexusState = {
        # Identity
        "user_id": session_row.data["user_id"],
        "session_id": body.session_id,
        # Skill
        "skill_name": session_row.data["skill_name"],
        "skill_score": session_row.data.get("skill_score") or 0.0,
        "skill_level": session_row.data.get("skill_level") or "beginner",
        # Personality
        "personality_profile": session_row.data.get("personality_profile"),
        "quiz_skipped": session_row.data.get("quiz_skipped", False),
        # Roadmap
        "roadmap": roadmap_row.data.get("roadmap_data"),
        "roadmap_version": roadmap_row.data.get("roadmap_version", 1),
        "current_level_index": roadmap_row.data.get("current_level_index", 0),
        "roadmap_locked": roadmap_row.data.get("locked", False),
        "user_roadmap_feedback": None,
        "regeneration_count": 0,
        # Gate test
        "test_history": existing_history,
        "fail_count": 0,  # will be recalculated by node
        "sublevel_reject_count": 0,
        "_gate_answers": [a.model_dump() for a in body.answers],
        # Gamification
        "points": 0,
        "badges": [],
        "streak_days": 0,
        # Routing
        "next_action": "",
        "task_type": "level_gate",
        "error_message": None,
        "error_node": None,
        # Config
        "feature_flags": {"level_gate_enabled": True},
        "skip_assessment": False,
    }

    # Derive current fail_count from existing history for this level
    current_level = state["current_level_index"]
    state["fail_count"] = sum(
        1 for h in existing_history
        if h["level_index"] == current_level and not h["passed"]
    )

    # ── Run node ──────────────────────────────────────────────────────────────
    updated_state = level_gate_node(state)

    if updated_state.get("next_action") == "handle_error":
        raise HTTPException(
            status_code=500,
            detail=updated_state.get("error_message", "Gate node failed"),
        )

    # ── Persist new test_history record to Supabase ───────────────────────────
    latest_record = updated_state["test_history"][-1]

    supabase.table("test_history").insert({
        "roadmap_id": body.roadmap_id,
        "user_id": session_row.data["user_id"],
        "level_index": latest_record["level_index"],
        "score": latest_record["score"],
        "passed": latest_record["passed"],
        "attempt_number": latest_record["attempt_number"],
        "answers": latest_record["answers"],
    }).execute()

    # ── Lock roadmap in DB if newly locked ────────────────────────────────────
    if updated_state["roadmap_locked"] and not roadmap_row.data.get("locked", False):
        supabase.table("roadmaps").update({"locked": True}).eq("id", body.roadmap_id).execute()

    # ── Unlock next level if passed ───────────────────────────────────────────
    if updated_state["next_action"] == "unlock_next_level":
        next_level_index = current_level + 1
        supabase.table("roadmaps").update(
            {"current_level_index": next_level_index}
        ).eq("id", body.roadmap_id).execute()

    return GateTestResult(
        score=latest_record["score"],
        passed=latest_record["passed"],
        next_action=updated_state["next_action"],
        fail_count=updated_state["fail_count"],
        attempt_number=latest_record["attempt_number"],
        roadmap_locked=updated_state["roadmap_locked"],
    )
