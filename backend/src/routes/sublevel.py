"""
POST /sublevel/decision
-----------------------
Accepts the user's response to a sublevel offer, runs RejectionHandlerNode,
and returns the updated routing state.

Request body:
  { "decision": "accept" | "reject" | "challenge" | "reassess" | "microlesson" }

Response:
  {
    "next_action": str,
    "sublevel_reject_count": int,
    "session_id": str
  }
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.graph.nodes.rejection_handler import rejection_handler_node
from src.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/sublevel", tags=["sublevel"])

DecisionValue = Literal["accept", "reject", "challenge", "reassess", "microlesson"]


class SubLevelDecisionRequest(BaseModel):
    session_id: str
    decision: DecisionValue


class SubLevelDecisionResponse(BaseModel):
    next_action: str
    sublevel_reject_count: int
    session_id: str


@router.post("/decision", response_model=SubLevelDecisionResponse)
async def sublevel_decision(body: SubLevelDecisionRequest):
    supabase = get_supabase_client()

    result = (
        supabase.table("skill_sessions")
        .select("*")
        .eq("id", body.session_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    session_row = result.data

    state = {
        "user_id": session_row["user_id"],
        "session_id": body.session_id,
        "skill_name": session_row.get("skill_name", ""),
        "skill_score": session_row.get("skill_score", 0.0),
        "skill_level": session_row.get("skill_level", "beginner"),
        "personality_profile": session_row.get("personality_profile"),
        "quiz_skipped": session_row.get("quiz_skipped", False),
        "roadmap": None,
        "roadmap_version": 1,
        "current_level_index": 0,
        "roadmap_locked": False,
        "user_roadmap_feedback": None,
        "regeneration_count": 0,
        "skip_assessment": False,
        "test_history": [],
        "fail_count": 0,
        "sublevel_reject_count": session_row.get("sublevel_reject_count", 0),
        "points": 0,
        "badges": [],
        "streak_days": 0,
        "next_action": "",
        "task_type": body.decision,
        "error_message": None,
        "error_node": None,
        "feature_flags": {},
    }

    updated_state = rejection_handler_node(state)

    supabase.table("skill_sessions").update(
        {"sublevel_reject_count": updated_state["sublevel_reject_count"]}
    ).eq("id", body.session_id).execute()

    if updated_state.get("error_message"):
        raise HTTPException(
            status_code=500,
            detail=updated_state["error_message"],
        )

    return SubLevelDecisionResponse(
        next_action=updated_state["next_action"],
        sublevel_reject_count=updated_state["sublevel_reject_count"],
        session_id=body.session_id,
    )
