"""
Roadmap routes — Feature 14
Routes:
  GET  /stream/roadmap              — SSE streaming (narrative tokens + parallel structured output)
  GET  /roadmap/{roadmap_id}        — fetch full roadmap JSON from Supabase
  POST /roadmap/{roadmap_id}/regenerate — validate guards, write feedback, re-trigger stream
"""

import asyncio
import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.graph.state import NexusState
from src.graph.nodes.roadmap_generator import roadmap_generator_node
from src.services.model_router import get_model, get_fallback_model
from src.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter(tags=["roadmap"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class RegenerateRequest(BaseModel):
    feedback: str


class RegenerateResponse(BaseModel):
    message: str
    roadmap_id: str
    regeneration_count: int
    session_id: str


# ---------------------------------------------------------------------------
# Helper — build a minimal NexusState from Supabase session data
# ---------------------------------------------------------------------------

async def _load_state_for_session(session_id: str) -> NexusState:
    """
    Reconstruct the parts of NexusState needed for roadmap generation
    from Supabase. Raises HTTPException 404 if session not found.
    """
    supabase = get_supabase_client()

    session_resp = (
        supabase.table("skill_sessions")
        .select("*")
        .eq("id", session_id)
        .single()
        .execute()
    )
    if not session_resp.data:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    session = session_resp.data

    # Load existing roadmap if any (for regeneration)
    roadmap_resp = (
        supabase.table("roadmaps")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    existing_roadmap = roadmap_resp.data[0] if roadmap_resp.data else None

    # Load feature flags
    flags_resp = supabase.table("feature_flags").select("flag_name, enabled").execute()
    feature_flags = {row["flag_name"]: row["enabled"] for row in (flags_resp.data or [])}

    state: NexusState = {
        "user_id": session["user_id"],
        "session_id": session_id,
        "skill_name": session["skill_name"],
        "skill_score": session.get("skill_score") or 0.0,
        "skill_level": session.get("skill_level") or "beginner",
        "personality_profile": session.get("personality_profile"),
        "quiz_skipped": session.get("quiz_skipped", False),
        "roadmap": existing_roadmap["roadmap_data"] if existing_roadmap else None,
        "roadmap_version": existing_roadmap["roadmap_version"] if existing_roadmap else 0,
        "current_level_index": existing_roadmap["current_level_index"] if existing_roadmap else 0,
        "roadmap_locked": existing_roadmap["locked"] if existing_roadmap else False,
        "user_roadmap_feedback": None,
        "regeneration_count": existing_roadmap["roadmap_version"] - 1 if existing_roadmap else 0,
        "skip_assessment": False,
        "test_history": [],
        "fail_count": 0,
        "sublevel_reject_count": 0,
        "points": 0,
        "badges": [],
        "streak_days": 0,
        "next_action": "generate_roadmap",
        "task_type": "roadmap_generation",
        "error_message": None,
        "error_node": None,
        "feature_flags": feature_flags,
    }
    return state


# ---------------------------------------------------------------------------
# SSE event helpers
# ---------------------------------------------------------------------------

def _sse(event_type: str, payload: dict) -> str:
    """Format a single SSE data line."""
    return f"data: {json.dumps({'type': event_type, **payload})}\n\n"


# ---------------------------------------------------------------------------
# Two-step streaming generator
# Step 1: stream narrative text for the visual WOW moment
# Step 2: fetch structured Pydantic roadmap in parallel, save to Supabase
# ---------------------------------------------------------------------------

async def _stream_narrative(prompt: str):
    """
    Streams narrative tokens from the primary model. On failure, retries once,
    then falls back to NVIDIA NIM. If any tokens were already sent before the
    failure, yields a 'restart' event first so the frontend clears its buffer
    before the fallback's tokens arrive — otherwise text would duplicate.
    """
    sent_any_tokens = False

    for use_fallback in (False, False, True):  # primary, retry primary once, then fallback
        llm = get_fallback_model() if use_fallback else get_model("roadmap_generation")
        try:
            async for chunk in llm.astream(prompt):
                content = getattr(chunk, "content", None) or ""
                if content:
                    if use_fallback and sent_any_tokens:
                        yield _sse("restart", {})
                        sent_any_tokens = False
                    yield _sse("token", {"content": content})
                    sent_any_tokens = True
            return
        except Exception as exc:
            logger.warning("Narrative stream failed (fallback=%s): %s", use_fallback, exc)
            if use_fallback:
                yield _sse("error", {"message": f"Stream failed: {exc}"})
                return
            await asyncio.sleep(1)
            continue

async def _roadmap_stream_generator(
    session_id: str,
    user_feedback: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Yields SSE events:
      { type: 'thinking', message: str }   — sent immediately while preparing
      { type: 'token',    content: str }   — narrative tokens as they stream
      { type: 'done',     roadmap_id: str } — stream complete, structured data saved
      { type: 'error',    message: str }   — something went wrong
    """
    try:
        # --- 0. Immediate feedback so the UI never stares at a blank screen ---
        yield _sse("thinking", {"message": "Analysing your assessment results..."})
        await asyncio.sleep(0.05)
        yield _sse("thinking", {"message": "Building your personalised learning path..."})

        # --- 1. Load state ---
        state = await _load_state_for_session(session_id)

        if user_feedback:
            state["user_roadmap_feedback"] = user_feedback

        # Guard: roadmap_locked check (only relevant for regeneration)
        if user_feedback and state["roadmap_locked"]:
            yield _sse("error", {"message": "Roadmap is locked — you have already started Level 1."})
            return

        # Guard: regeneration count
        if user_feedback and state["regeneration_count"] >= 2:
            yield _sse("error", {"message": "Maximum regenerations (2) reached for this roadmap."})
            return

        skill_name = state["skill_name"]
        skill_level = state["skill_level"]
        personality = state["personality_profile"]

        # --- 2. Build narrative prompt (step 1 — stream this) ---
        personality_hint = ""
        if personality:
            style = personality.get("learning_style", "")
            pace = personality.get("pace", "")
            personality_hint = f" The learner prefers {style} content at a {pace} pace."

        feedback_hint = ""
        if user_feedback:
            feedback_hint = f"\n\nImportant user correction: {user_feedback}. Adjust the path accordingly."

        narrative_prompt = (
            f"Describe a personalised learning roadmap for {skill_name} at {skill_level} level."
            f"{personality_hint}"
            f"{feedback_hint}"
            " Write it as engaging, flowing prose — level by level. "
            "For each level give it a vivid title, explain what the learner will master, "
            "and why it sets up the next stage. Keep it motivating and concrete."
        )

        # --- 3. Stream narrative tokens ---
        yield _sse("thinking", {"message": "Generating your roadmap..."})

        async for event in _stream_narrative(narrative_prompt):
             yield event

        # --- 4. Get structured Pydantic roadmap (step 2 — no streaming needed) ---
        yield _sse("thinking", {"message": "Finalising roadmap structure..."})
        updated_state = await roadmap_generator_node(state)

        roadmap_id = None
        if updated_state.get("error_message"):
            logger.error("Roadmap generator error: %s", updated_state["error_message"])
            # Still complete the stream — narrative already delivered the WOW moment
            # Frontend will call GET /roadmap/{id} which will surface the error
        else:
            # Retrieve the saved roadmap ID from Supabase
            supabase = get_supabase_client()
            saved = (
                supabase.table("roadmaps")
                .select("id")
                .eq("session_id", session_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            roadmap_id = saved.data[0]["id"] if saved.data else None

        yield _sse("done", {"roadmap_id": roadmap_id})

    except HTTPException as exc:
        yield _sse("error", {"message": exc.detail})
    except Exception as exc:
        logger.exception("Unexpected error in roadmap stream for session %s", session_id)
        yield _sse("error", {"message": f"Stream failed: {str(exc)}"})


# ---------------------------------------------------------------------------
# Route: GET /stream/roadmap
# ---------------------------------------------------------------------------

@router.get("/stream/roadmap")
async def stream_roadmap(
    session_id: str = Query(..., description="Active skill session ID"),
):
    """
    Open an SSE connection and stream roadmap generation.
    Frontend EventSource connects here immediately after assessment completes.

    SSE event types emitted:
      thinking  — intermediate status messages (show immediately)
      token     — narrative text fragments (append to display buffer)
      done      — stream complete, roadmap_id included (fetch structured data)
      error     — something went wrong (show error state)
    """
    return StreamingResponse(
        _roadmap_stream_generator(session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",       # prevents nginx from buffering SSE
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


# ---------------------------------------------------------------------------
# Route: GET /roadmap/{roadmap_id}
# ---------------------------------------------------------------------------

@router.get("/roadmap/{roadmap_id}")
async def get_roadmap(roadmap_id: str):
    supabase = get_supabase_client()
    resp = (
        supabase.table("roadmaps")
        .select("*")
        .eq("id", roadmap_id)
        .single()
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=404, detail=f"Roadmap {roadmap_id} not found")

    row = resp.data
    roadmap_data = row.get("roadmap_data") or {}

    session_resp = (
        supabase.table("skill_sessions")
        .select("skill_name, skill_level")
        .eq("id", row["session_id"])
        .single()
        .execute()
    )
    session = session_resp.data or {}

    return {
        "id": row["id"],
        "skill_name": session.get("skill_name") or roadmap_data.get("skill_name"),
        "skill_level": session.get("skill_level") or "beginner",
        "total_levels": roadmap_data.get("total_levels", len(roadmap_data.get("levels", []))),
        "roadmap_locked": row.get("locked", False),
        "regeneration_count": max(row.get("roadmap_version", 1) - 1, 0),
        "current_level_index": row.get("current_level_index", 0),
        "levels": roadmap_data.get("levels", []),
    }


# ---------------------------------------------------------------------------
# Route: POST /roadmap/{roadmap_id}/regenerate
# ---------------------------------------------------------------------------

@router.post("/roadmap/{roadmap_id}/regenerate", response_model=RegenerateResponse, status_code=202)
async def regenerate_roadmap(roadmap_id: str, body: RegenerateRequest):
    """
    Accept user free-text feedback and queue a roadmap regeneration.

    Guards enforced here (also enforced inside the stream generator):
      - roadmap_locked must be False
      - regeneration_count must be < 2

    Returns 202 Accepted immediately.
    Frontend opens a new SSE connection to GET /stream/roadmap with the
    session_id to receive the regenerated stream.

    The feedback is persisted to the roadmaps table so the stream generator
    can pick it up via session state.
    """
    supabase = get_supabase_client()

    # Fetch current roadmap record
    roadmap_resp = (
        supabase.table("roadmaps")
        .select("*")
        .eq("id", roadmap_id)
        .single()
        .execute()
    )
    if not roadmap_resp.data:
        raise HTTPException(status_code=404, detail=f"Roadmap {roadmap_id} not found")

    roadmap = roadmap_resp.data
    current_version = roadmap.get("roadmap_version", 1)
    locked = roadmap.get("locked", False)
    regen_count = current_version - 1  # version 1 = 0 regenerations, version 2 = 1, etc.

    # Guard: locked
    if locked:
        raise HTTPException(
            status_code=409,
            detail="Roadmap is locked — the user has already entered Level 1.",
        )

    # Guard: max regenerations
    if regen_count >= 2:
        raise HTTPException(
            status_code=409,
            detail="Maximum regenerations (2) already used for this roadmap.",
        )

    if not body.feedback or not body.feedback.strip():
        raise HTTPException(status_code=422, detail="Feedback text is required.")

    # roadmap_version is intentionally NOT bumped here. Versioning happens exactly
    # once, inside roadmap_generator_node, when the regeneration actually runs.
    # Bumping it here too double-counted every regeneration against the cap.
    session_id = roadmap["session_id"]

    return RegenerateResponse(
        message=(
            "Regeneration accepted. Open GET /stream/regenerate "
            f"?session_id={session_id}&feedback=<encoded> to receive the new stream."
        ),
        roadmap_id=roadmap_id,
        regeneration_count=regen_count + 1,
        session_id=session_id,
    )


# ---------------------------------------------------------------------------
# Route: GET /stream/roadmap/regenerate
# Separate SSE endpoint that carries the feedback as a query param.
# Frontend uses this after POST /roadmap/{id}/regenerate returns 202.
# ---------------------------------------------------------------------------

@router.get("/stream/regenerate")
async def stream_roadmap_regenerate(
    session_id: str = Query(...),
    feedback: str = Query(..., description="User free-text correction"),
):
    """
    SSE endpoint for roadmap regeneration.
    Identical to /stream/roadmap but injects user_roadmap_feedback into state.

    Usage flow:
      1. POST /roadmap/{id}/regenerate  → 202 (validates guards, increments version)
      2. GET  /stream/regenerate?session_id=...&feedback=... → SSE stream
    """
    return StreamingResponse(
        _roadmap_stream_generator(session_id, user_feedback=feedback),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )
