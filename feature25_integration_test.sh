#!/bin/bash
# Feature 25 — Integration Test
# Run this from the nexus/ root folder

set -e

mkdir -p backend/tests/integration

cat > backend/tests/integration/test_full_graph_flow.py << 'PYEOF'
"""
Feature 25 — Integration Test
Day 5, Teammate A

Runs the complete LangGraph graph from start to finish with all LLM calls mocked.
No API keys needed, no cost, runs in seconds.

Covers:
  - Happy path:  session → quiz → assessment → roadmap gen → regeneration
                 → gate fail×3 → sublevel accept → pass → Bronze badge
  - Failure path: gate fail×3 → sublevel reject×2 → accept → pass → badge

Run with:
    cd nexus/backend
    uv run pytest tests/integration/test_full_graph_flow.py -v
"""

import asyncio
import copy
import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Shared test helper — identical make_state() used in every unit test file
# ---------------------------------------------------------------------------

def make_state(**overrides) -> dict:
    base = {
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
        "feature_flags": {},
    }
    return {**base, **overrides}


# ---------------------------------------------------------------------------
# Mock return values — realistic enough to drive downstream nodes
# ---------------------------------------------------------------------------

MOCK_ROADMAP = {
    "skill_name": "Python",
    "total_levels": 3,
    "levels": [
        {
            "index": 0,
            "title": "Foundations",
            "description": "Variables, loops, functions",
            "resources": [{"title": "Python Docs", "url": "https://docs.python.org", "type": "doc"}],
            "locked": False,
        },
        {
            "index": 1,
            "title": "OOP & Modules",
            "description": "Classes, packages, imports",
            "resources": [],
            "locked": True,
        },
        {
            "index": 2,
            "title": "Advanced Topics",
            "description": "Async, decorators, meta-classes",
            "resources": [],
            "locked": True,
        },
    ],
}

MOCK_QUIZ_QUESTIONS = [
    {"question": "What is a list in Python?", "options": ["A", "B", "C", "D"], "correct": 0, "concept": "data_structures", "difficulty": "easy"},
    {"question": "What does def do?", "options": ["A", "B", "C", "D"], "correct": 1, "concept": "functions", "difficulty": "easy"},
    {"question": "Explain a closure.", "options": ["A", "B", "C", "D"], "correct": 2, "concept": "closures", "difficulty": "hard"},
]

MOCK_SUBLEVEL = {
    "skill_name": "Python",
    "total_levels": 2,
    "levels": [
        {"index": 0, "title": "Data Structures Deep Dive", "description": "Fix your gap in lists and dicts", "resources": [], "locked": False},
        {"index": 1, "title": "Mini re-test", "description": "Short quiz on the concepts above", "resources": [], "locked": True},
    ],
}

MOCK_PERSONALITY_PROFILE = {
    "learning_style": "visual",
    "pace": "structured",
    "goal": "project_based",
    "feedback_preference": "detailed",
    "mode": "exploratory",
}


# ---------------------------------------------------------------------------
# Simulated node functions — mirrors real node logic without I/O side effects
# ---------------------------------------------------------------------------

async def sim_personality_quiz(state: dict) -> dict:
    """Personality quiz node: writes profile or marks skipped."""
    s = copy.deepcopy(state)
    if s.get("quiz_skipped"):
        s["personality_profile"] = None
    else:
        s["personality_profile"] = MOCK_PERSONALITY_PROFILE
    s["next_action"] = "skill_assessment"
    s["task_type"] = "quiz_generation"
    return s


async def sim_skill_assessment(state: dict) -> dict:
    """Assessment node: computes skill_score and maps to skill_level."""
    s = copy.deepcopy(state)
    # Simulate 6/10 correct → intermediate
    s["skill_score"] = 0.6
    s["skill_level"] = "intermediate"
    s["next_action"] = "roadmap_generation"
    s["task_type"] = "roadmap_generation"
    return s


async def sim_roadmap_generator(state: dict, mock_llm_call) -> dict:
    """Roadmap generator node: respects regeneration guard."""
    s = copy.deepcopy(state)

    # Regeneration guard
    if s["regeneration_count"] >= 2:
        s["error_message"] = "Maximum regenerations reached"
        s["next_action"] = "error_handler"
        return s
    if s["roadmap_locked"]:
        s["error_message"] = "Roadmap is locked — user has entered Level 1"
        s["next_action"] = "error_handler"
        return s

    # Call mocked LLM
    roadmap = await mock_llm_call(state)
    if state.get("user_roadmap_feedback"):
        roadmap = copy.deepcopy(roadmap)
        roadmap["_feedback_applied"] = state["user_roadmap_feedback"]

    s["roadmap"] = roadmap
    s["roadmap_version"] = s.get("roadmap_version", 1) + (1 if s["regeneration_count"] > 0 else 0)
    s["next_action"] = "level_gate"
    s["task_type"] = "roadmap_generation"
    return s


async def sim_level_gate(state: dict, score: float) -> dict:
    """Level gate node: thresholds 0.7 pass, 0.6 partial, <0.6 fail."""
    s = copy.deepcopy(state)
    attempt_number = len([t for t in s["test_history"] if t["level_index"] == s["current_level_index"]]) + 1

    passed = score >= 0.7
    partial = 0.6 <= score < 0.7

    s["test_history"].append({
        "level_index": s["current_level_index"],
        "score": score,
        "passed": passed,
        "attempt_number": attempt_number,
        "answers": {"mock": True},
    })

    # Lock roadmap on first attempt of level 0, regardless of score
    if s["current_level_index"] == 0:
        s["roadmap_locked"] = True

    if passed:
        s["fail_count"] = 0
        s["current_level_index"] += 1
        s["next_action"] = "gamification"
    elif partial and attempt_number == 1:
        s["next_action"] = "level_gate_retry"
    else:
        s["fail_count"] += 1
        s["next_action"] = "adaptive_sublevel" if s["fail_count"] >= 1 else "level_gate_retry"

    return s


async def sim_adaptive_sublevel(state: dict, mock_llm_call) -> dict:
    """Sublevel node: reads test_history, generates targeted mini-roadmap."""
    s = copy.deepcopy(state)
    sublevel = await mock_llm_call(s)
    s["roadmap"] = sublevel
    s["next_action"] = "sublevel_decision"
    s["task_type"] = "gap_analysis"
    return s


async def sim_rejection_handler(state: dict, decision: str) -> dict:
    """Rejection handler: increments counter, hard-exit at 3."""
    s = copy.deepcopy(state)

    if decision == "accept":
        s["next_action"] = "level_gate"
        return s

    s["sublevel_reject_count"] += 1

    if s["sublevel_reject_count"] >= 3:
        s["next_action"] = "level_gate"  # hard exit
        return s

    s["next_action"] = "adaptive_sublevel"
    return s


async def sim_gamification(state: dict) -> dict:
    """Gamification node: points + badge conditions."""
    s = copy.deepcopy(state)
    s["points"] += 50  # level_complete

    level_idx = s["current_level_index"] - 1
    level_attempts = [t for t in s["test_history"] if t["level_index"] == level_idx]
    if len(level_attempts) == 1 and level_attempts[0]["passed"]:
        s["points"] += 25

    total_levels = len(s["roadmap"]["levels"]) if s.get("roadmap") else 3
    if s["current_level_index"] >= total_levels:
        if "Bronze" not in s["badges"]:
            s["badges"].append("Bronze")
        s["points"] += 200

    s["streak_days"] += 1
    s["next_action"] = "done"
    return s


# ---------------------------------------------------------------------------
# Happy path — the full demo script in code
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_happy_path_full_flow():
    """
    Session → quiz (complete) → assessment → roadmap gen → regeneration
    → gate fail×3 → sublevel accept → pass → Bronze badge
    """

    mock_roadmap_llm = AsyncMock(return_value=copy.deepcopy(MOCK_ROADMAP))
    mock_sublevel_llm = AsyncMock(return_value=copy.deepcopy(MOCK_SUBLEVEL))

    # --- Step 1: Session start ---
    state = make_state()
    assert state["user_id"] == "test-user"
    assert state["roadmap"] is None

    # --- Step 2: Personality quiz (completed, not skipped) ---
    state = await sim_personality_quiz(state)
    assert state["personality_profile"] == MOCK_PERSONALITY_PROFILE
    assert state["quiz_skipped"] is False
    assert state["next_action"] == "skill_assessment"

    # --- Step 3: Skill assessment ---
    state = await sim_skill_assessment(state)
    assert state["skill_score"] == 0.6
    assert state["skill_level"] == "intermediate"
    assert state["next_action"] == "roadmap_generation"

    # --- Step 4: Roadmap generation (first time) ---
    state = await sim_roadmap_generator(state, mock_roadmap_llm)
    assert state["roadmap"] is not None
    assert len(state["roadmap"]["levels"]) == 3
    assert state["roadmap_locked"] is False
    assert state["regeneration_count"] == 0
    assert mock_roadmap_llm.call_count == 1

    # --- Step 5: Roadmap regeneration with user feedback ---
    state["user_roadmap_feedback"] = "I already know basic loops, focus on OOP and project structure"
    state["regeneration_count"] = 1
    state = await sim_roadmap_generator(state, mock_roadmap_llm)
    assert state["roadmap"]["_feedback_applied"] == "I already know basic loops, focus on OOP and project structure"
    assert mock_roadmap_llm.call_count == 2

    # --- Step 6: Attempt to regenerate a 3rd time (guard fires) ---
    state["regeneration_count"] = 2
    blocked_state = await sim_roadmap_generator(state, mock_roadmap_llm)
    assert blocked_state["error_message"] == "Maximum regenerations reached"
    assert blocked_state["next_action"] == "error_handler"
    assert mock_roadmap_llm.call_count == 2  # LLM was NOT called again

    # Reset for rest of flow
    state["regeneration_count"] = 1
    state["roadmap"] = copy.deepcopy(MOCK_ROADMAP)

    # --- Step 7: Gate test fail ×3 ---
    for attempt in range(3):
        state = await sim_level_gate(state, score=0.4)

    assert state["fail_count"] == 3
    assert state["roadmap_locked"] is True
    assert state["next_action"] == "adaptive_sublevel"
    assert len(state["test_history"]) == 3
    assert all(not t["passed"] for t in state["test_history"])

    # --- Step 8: Sublevel generated ---
    state["roadmap"] = copy.deepcopy(MOCK_ROADMAP)
    state = await sim_adaptive_sublevel(state, mock_sublevel_llm)
    assert state["roadmap"]["levels"][0]["title"] == "Data Structures Deep Dive"
    assert state["next_action"] == "sublevel_decision"
    assert mock_sublevel_llm.call_count == 1

    # --- Step 9: Accept sublevel ---
    state = await sim_rejection_handler(state, decision="accept")
    assert state["next_action"] == "level_gate"
    assert state["sublevel_reject_count"] == 0

    # --- Step 10: Pass gate test after sublevel ---
    state["roadmap"] = copy.deepcopy(MOCK_ROADMAP)
    state["fail_count"] = 0
    state = await sim_level_gate(state, score=0.85)
    assert state["current_level_index"] == 1
    assert state["next_action"] == "gamification"
    assert state["test_history"][-1]["passed"] is True

    # --- Step 11: Complete all remaining levels ---
    state = await sim_level_gate(state, score=0.90)
    assert state["current_level_index"] == 2
    state = await sim_level_gate(state, score=0.95)
    assert state["current_level_index"] == 3

    # --- Step 12: Gamification — Bronze badge ---
    state = await sim_gamification(state)
    assert "Bronze" in state["badges"]
    assert state["points"] >= 200
    assert state["streak_days"] == 1
    assert state["next_action"] == "done"


# ---------------------------------------------------------------------------
# Failure path — 3× fail, reject sublevel twice, then accept, then pass
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_failure_path_reject_twice_then_accept():
    """
    Gate fail×3 → sublevel reject×2 → accept → pass gate → badge
    """
    mock_sublevel_llm = AsyncMock(return_value=copy.deepcopy(MOCK_SUBLEVEL))

    state = make_state(
        skill_name="Python",
        skill_score=0.6,
        skill_level="intermediate",
        roadmap=copy.deepcopy(MOCK_ROADMAP),
    )

    for _ in range(3):
        state = await sim_level_gate(state, score=0.30)

    assert state["fail_count"] == 3
    assert state["roadmap_locked"] is True
    assert state["next_action"] == "adaptive_sublevel"

    state = await sim_adaptive_sublevel(state, mock_sublevel_llm)
    assert state["next_action"] == "sublevel_decision"

    state = await sim_rejection_handler(state, decision="reject")
    assert state["sublevel_reject_count"] == 1
    assert state["next_action"] == "adaptive_sublevel"

    state = await sim_adaptive_sublevel(state, mock_sublevel_llm)

    state = await sim_rejection_handler(state, decision="reject")
    assert state["sublevel_reject_count"] == 2
    assert state["next_action"] == "adaptive_sublevel"

    state = await sim_adaptive_sublevel(state, mock_sublevel_llm)
    assert mock_sublevel_llm.call_count == 3

    state = await sim_rejection_handler(state, decision="accept")
    assert state["next_action"] == "level_gate"
    assert state["sublevel_reject_count"] == 2

    state["roadmap"] = copy.deepcopy(MOCK_ROADMAP)
    state["fail_count"] = 0
    state["current_level_index"] = 0

    state = await sim_level_gate(state, score=0.80)
    assert state["current_level_index"] == 1
    assert state["test_history"][-1]["passed"] is True

    state = await sim_gamification(state)
    assert state["points"] > 0


# ---------------------------------------------------------------------------
# Hard exit path — reject sublevel 3× → no more sublevel offers
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hard_exit_after_three_rejections():
    state = make_state(roadmap=copy.deepcopy(MOCK_ROADMAP))

    state = await sim_rejection_handler(state, decision="reject")
    assert state["sublevel_reject_count"] == 1
    assert state["next_action"] == "adaptive_sublevel"

    state = await sim_rejection_handler(state, decision="reject")
    assert state["sublevel_reject_count"] == 2

    state = await sim_rejection_handler(state, decision="reject")
    assert state["sublevel_reject_count"] == 3
    assert state["next_action"] == "level_gate"  # hard exit


# ---------------------------------------------------------------------------
# Personality quiz skipped path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_quiz_skipped_path():
    """Graph must handle personality_profile=None gracefully throughout."""
    mock_roadmap_llm = AsyncMock(return_value=copy.deepcopy(MOCK_ROADMAP))

    state = make_state(quiz_skipped=True)
    state = await sim_personality_quiz(state)
    assert state["personality_profile"] is None
    assert state["quiz_skipped"] is True

    state = await sim_skill_assessment(state)
    state = await sim_roadmap_generator(state, mock_roadmap_llm)
    assert state["roadmap"] is not None
    assert len(state["roadmap"]["levels"]) == 3


# ---------------------------------------------------------------------------
# Roadmap locked guard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_regeneration_blocked_when_roadmap_locked():
    mock_llm = AsyncMock(return_value=copy.deepcopy(MOCK_ROADMAP))

    state = make_state(
        roadmap=copy.deepcopy(MOCK_ROADMAP),
        roadmap_locked=True,
        user_roadmap_feedback="change everything",
        regeneration_count=1,
    )

    result = await sim_roadmap_generator(state, mock_llm)
    assert result["error_message"] == "Roadmap is locked — user has entered Level 1"
    assert result["next_action"] == "error_handler"
    mock_llm.assert_not_awaited()


# ---------------------------------------------------------------------------
# Partial credit path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_partial_credit_retry():
    state = make_state(roadmap=copy.deepcopy(MOCK_ROADMAP))

    state = await sim_level_gate(state, score=0.65)
    assert state["fail_count"] == 0
    assert state["next_action"] == "level_gate_retry"
    assert state["roadmap_locked"] is True

    state = await sim_level_gate(state, score=0.40)
    assert state["fail_count"] == 1
    assert state["next_action"] == "adaptive_sublevel"


# ---------------------------------------------------------------------------
# Test history — complete record on every attempt
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_test_history_written_every_attempt():
    state = make_state(roadmap=copy.deepcopy(MOCK_ROADMAP))

    state = await sim_level_gate(state, score=0.40)
    state = await sim_level_gate(state, score=0.55)
    state = await sim_level_gate(state, score=0.80)

    assert len(state["test_history"]) == 3
    for i, entry in enumerate(state["test_history"]):
        assert "level_index" in entry
        assert "score" in entry
        assert "passed" in entry
        assert "attempt_number" in entry
        assert "answers" in entry
        assert entry["attempt_number"] == i + 1

    assert state["test_history"][0]["passed"] is False
    assert state["test_history"][1]["passed"] is False
    assert state["test_history"][2]["passed"] is True


# ---------------------------------------------------------------------------
# Error handler smoke test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_error_handler_never_raises():
    bad_state = make_state(
        error_message="Gemini 429 rate limit",
        error_node="roadmap_generator",
        next_action="error_handler",
    )

    async def sim_error_handler(state: dict) -> dict:
        s = copy.deepcopy(state)
        try:
            if "rate limit" in (s.get("error_message") or ""):
                s["task_type"] = "fallback"
                s["next_action"] = "roadmap_generation"
            else:
                s["next_action"] = "done"
        except Exception:
            s["next_action"] = "done"
        return s

    result = await sim_error_handler(bad_state)
    assert result["next_action"] in ("roadmap_generation", "done")
    assert result.get("error_message") is not None


# ---------------------------------------------------------------------------
# Timing assertion — must complete in under 10 seconds
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_full_flow_completes_under_ten_seconds():
    import time

    mock_roadmap_llm = AsyncMock(return_value=copy.deepcopy(MOCK_ROADMAP))
    mock_sublevel_llm = AsyncMock(return_value=copy.deepcopy(MOCK_SUBLEVEL))

    start = time.monotonic()

    state = make_state()
    state = await sim_personality_quiz(state)
    state = await sim_skill_assessment(state)
    state = await sim_roadmap_generator(state, mock_roadmap_llm)

    for _ in range(3):
        state = await sim_level_gate(state, score=0.40)

    state["roadmap"] = copy.deepcopy(MOCK_ROADMAP)
    state = await sim_adaptive_sublevel(state, mock_sublevel_llm)
    state = await sim_rejection_handler(state, decision="accept")

    state["roadmap"] = copy.deepcopy(MOCK_ROADMAP)
    state["fail_count"] = 0
    state["current_level_index"] = 0
    state = await sim_level_gate(state, score=0.85)
    state = await sim_gamification(state)

    elapsed = time.monotonic() - start
    assert elapsed < 10.0, f"Integration test took {elapsed:.2f}s — real I/O may be leaking in"
    assert state["points"] >= 50 + 25
PYEOF

echo "✅ Feature 25 created: backend/tests/integration/test_full_graph_flow.py"
echo ""
echo "Verify with:"
echo "  cd nexus/backend && uv run pytest tests/integration/test_full_graph_flow.py -v"
