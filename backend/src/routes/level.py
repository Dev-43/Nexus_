"""
POST /level/{level_id}/submit — gate test submission endpoint.

Accepts the user's answers, injects them into state as `_gate_answers`,
invokes the LevelGateNode, persists the test_history record to Supabase,
and returns the score + routing decision.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from src.graph.nodes.gamification import gamification_node
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.graph.nodes.level_gate import level_gate_node
from src.graph.state import NexusState
from src.services.supabase_client import get_supabase_client
from src.services.model_router import get_model

logger = logging.getLogger(__name__)

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
    point_earned: int=0
    
    


# ── Route ─────────────────────────────────────────────────────────────────────

SKILL_GATE_QUESTIONS: dict[str, list[dict]] = {
    "data analysis": [
        {
            "id": "q1",
            "text": "Which Pandas method is used to identify duplicate records in a DataFrame?",
            "options": ["df.duplicated()", "df.drop_duplicates()", "df.unique()", "df.isin()"],
            "correct_index": 0,
            "concept_tag": "data_cleaning",
        },
        {
            "id": "q2",
            "text": "In exploratory data analysis, which visual chart best shows the distribution and skewness of a numerical variable?",
            "options": ["Histogram with KDE", "Pie Chart", "Network Graph", "Treemap"],
            "correct_index": 0,
            "concept_tag": "distribution_analysis",
        },
        {
            "id": "q3",
            "text": "What does a correlation coefficient of -0.85 between two variables indicate?",
            "options": [
                "A strong inverse relationship where one variable increases as the other decreases",
                "A weak relationship with negligible association",
                "A positive linear trend",
                "An 85% causal probability",
            ],
            "correct_index": 0,
            "concept_tag": "correlation_analysis",
        },
        {
            "id": "q4",
            "text": "Why is handling missing values (imputation or removal) critical before predictive modeling?",
            "options": [
                "Most algorithmic estimators will fail or produce biased parameters with NaNs",
                "It guarantees 100% training accuracy",
                "It doubles the number of rows in the dataset",
                "Missing values automatically delete dataset columns",
            ],
            "correct_index": 0,
            "concept_tag": "preprocessing",
        },
    ],
    "python": [
        {
            "id": "q1",
            "text": "In Python, what is the primary role of the `__init__` method in a class?",
            "options": [
                "Initialises the attributes of a newly created object instance",
                "Destroys an object when it goes out of scope",
                "Imports external libraries",
                "Defines static class-level constants",
            ],
            "correct_index": 0,
            "concept_tag": "oop_basics",
        },
        {
            "id": "q2",
            "text": "Which of the following data structures in Python is mutable?",
            "options": ["list", "tuple", "str", "frozenset"],
            "correct_index": 0,
            "concept_tag": "data_types",
        },
        {
            "id": "q3",
            "text": "What does `*args` allow a Python function to receive?",
            "options": [
                "An arbitrary number of positional arguments as a tuple",
                "A dictionary of keyword arguments",
                "Only immutable objects",
                "A fixed sequence of integers",
            ],
            "correct_index": 0,
            "concept_tag": "functions",
        },
        {
            "id": "q4",
            "text": "What does a generator function in Python return when it encounters a `yield` statement?",
            "options": [
                "It pauses execution and yields a value to the caller, resuming on next()",
                "It terminates the function permanently like return",
                "It raises an asynchronous StopIteration exception",
                "It saves the variable to disk storage",
            ],
            "correct_index": 0,
            "concept_tag": "generators",
        },
    ],
    "javascript": [
        {
            "id": "q1",
            "text": "What is the primary difference between `let` and `var` in modern JavaScript?",
            "options": [
                "`let` is block-scoped, while `var` is function-scoped and hoisted",
                "`let` cannot be reassigned once declared",
                "`var` is only available in Node.js environments",
                "`let` variables are global by default",
            ],
            "correct_index": 0,
            "concept_tag": "scope",
        },
        {
            "id": "q2",
            "text": "Which method creates a new array populated with the results of calling a provided function on every element?",
            "options": ["Array.prototype.map()", "Array.prototype.forEach()", "Array.prototype.filter()", "Array.prototype.reduce()"],
            "correct_index": 0,
            "concept_tag": "functional_methods",
        },
        {
            "id": "q3",
            "text": "What does the JavaScript Event Loop do when executing asynchronous code?",
            "options": [
                "Monitors the Call Stack and Task Queue, pushing queued callbacks when the stack is empty",
                "Runs code on multiple CPU threads simultaneously",
                "Compiles JavaScript directly to native assembly",
                "Blocks user input until network requests complete",
            ],
            "correct_index": 0,
            "concept_tag": "event_loop",
        },
        {
            "id": "q4",
            "text": "What is the return value of an `async` function in JavaScript?",
            "options": [
                "Always a Promise resolving with the return value",
                "The raw evaluated value synchronously",
                "A Generator object",
                "An Observable stream",
            ],
            "correct_index": 0,
            "concept_tag": "async_await",
        },
    ],
}


@router.get("/{level_id}/questions")
async def get_level_questions(
    level_id: str,
    skill_name: str = "Data Analysis",
    level_title: str = "Foundations",
):
    """
    Returns 4 gate test questions tailored specifically to the skill and level.
    Attempts live LLM generation first via NVIDIA NIM; falls back cleanly to
    skill-tailored question banks.
    """
    clean_skill = skill_name.lower().strip()

    try:
        llm = get_model("quiz_generation")
        prompt = (
            f"Generate exactly 4 multiple-choice assessment questions to test a learner's "
            f"mastery of {skill_name} specifically for: {level_title}.\n"
            f"Respond ONLY with a JSON array of 4 objects. Each object must have:\n"
            f'{{"id": "q1", "text": "...", "options": ["Option A", "Option B", "Option C", "Option D"], '
            f'"correct_index": 0, "concept_tag": "..."}}\n'
            f"correct_index must be an integer between 0 and 3.\n"
            f"Make questions directly relevant to {skill_name}. Pure JSON only, no markdown."
        )
        raw = await llm.ainvoke(prompt)
        content = (raw.content or "").strip()
        if not content and hasattr(raw, "additional_kwargs"):
            content = (raw.additional_kwargs.get("reasoning_content") or "").strip()

        start_idx = content.find("[")
        end_idx = content.rfind("]")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            questions = json.loads(content[start_idx : end_idx + 1])
            if isinstance(questions, list) and len(questions) >= 3:
                return {"questions": questions[:4]}
    except Exception as e:
        logger.warning("Dynamic question generation failed (%s), using curated fallback", e)

    # Curated skill fallback
    for key, questions in SKILL_GATE_QUESTIONS.items():
        if key in clean_skill:
            return {"questions": questions}

    # Generic tech skill fallback
    return {
        "questions": [
            {
                "id": "q1",
                "text": f"What is the foundational principle when implementing {skill_name}?",
                "options": [
                    "Understanding core syntax, data flow, and standard conventions",
                    "Skipping architecture planning to write ad-hoc scripts",
                    "Avoiding version control and documentation",
                    "Using only deprecated legacy APIs",
                ],
                "correct_index": 0,
                "concept_tag": "foundations",
            },
            {
                "id": "q2",
                "text": f"In {skill_name}, how should unexpected errors and edge cases be handled?",
                "options": [
                    "With structured exception handling, input validation, and informative logging",
                    "By suppressing all errors silently",
                    "By terminating the process immediately without cleanup",
                    "By ignoring user input validation",
                ],
                "correct_index": 0,
                "concept_tag": "error_handling",
            },
            {
                "id": "q3",
                "text": f"What is a recommended best practice for modularizing code in {skill_name}?",
                "options": [
                    "Separating concerns into cohesive, reusable functions or components",
                    "Writing all logic into a single monolithic file",
                    "Duplicating code across multiple modules",
                    "Hardcoding configuration values directly in functions",
                ],
                "correct_index": 0,
                "concept_tag": "modular_design",
            },
            {
                "id": "q4",
                "text": f"When preparing {skill_name} projects for production, what is essential?",
                "options": [
                    "Automated testing, profiling, and environment configuration management",
                    "Removing all tests before deployment",
                    "Disabling security checks and logging",
                    "Deploying untested code directly to main",
                ],
                "correct_index": 0,
                "concept_tag": "production_readiness",
            },
        ]
    }


@router.post("/{level_id}/submit", response_model=GateTestResult)
async def submit_gate_test(level_id: str, body: GateTestSubmission) -> GateTestResult:
    supabase = get_supabase_client()

    # ── Fetch current session state from Supabase ─────────────────────────────
    session_row = (
        supabase.table("skill_sessions")
        .select("*")
        .eq("id", body.session_id)
        .maybe_single()
        .execute()
    )
    if not session_row or not session_row.data:
        raise HTTPException(status_code=404, detail="Session not found")

    roadmap_row = (
        supabase.table("roadmaps")
        .select("*")
        .eq("id", body.roadmap_id)
        .maybe_single()
        .execute()
    )
    if not roadmap_row or not roadmap_row.data:
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

    points_earned = 0

    # ── Unlock next level if passed, award real points ────────────────────────
    if updated_state["next_action"] == "unlock_next_level":
        next_level_index = current_level + 1
        supabase.table("roadmaps").update(
            {"current_level_index": next_level_index}
        ).eq("id", body.roadmap_id).execute()

        total_levels = len((state.get("roadmap") or {}).get("levels", []))
        roadmap_now_complete = total_levels > 0 and next_level_index >= total_levels

        # First call deliberately OMITS points/badges/streak_days keys so
        # gamification_node falls back to its own Supabase load instead of
        # treating an absent value as a real 0 and skipping the lookup.
        gam_base_state = {
            "user_id": session_row.data["user_id"],
            "roadmap": state["roadmap"],
            "skill_level": state["skill_level"],
            "current_level_index": next_level_index,
            "test_history": updated_state["test_history"],
            "feature_flags": {"gamification_enabled": True},
        }

        running_state = await gamification_node({**gam_base_state, "task_type": "level_complete"})
        points_earned += 50

        if latest_record["attempt_number"] == 1:
            # Chained from running_state on purpose — it now carries the
            # real post-award point total, so this call compounds correctly
            # instead of re-reading a stale pre-award db value.
            running_state = await gamification_node({**running_state, "task_type": "first_attempt_pass"})
            points_earned += 25

        if roadmap_now_complete:
            running_state = await gamification_node({**running_state, "task_type": "roadmap_complete"})
            points_earned += 200

    return GateTestResult(
        score=latest_record["score"],
        passed=latest_record["passed"],
        next_action=updated_state["next_action"],
        fail_count=updated_state["fail_count"],
        attempt_number=latest_record["attempt_number"],
        roadmap_locked=updated_state["roadmap_locked"],
        points_earned=points_earned,
    )
