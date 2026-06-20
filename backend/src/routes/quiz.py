"""
Quiz routes — personality + assessment.

Additions for Feature 9:
- GET  /stream/assessment        SSE stream of adaptive questions
- POST /quiz/assessment/submit   submit one answer, get next question or final score

NOTE: This file is additive to Feature 8's personality quiz routes.
If src/routes/quiz.py already exists from Feature 8, merge the
personality router with this assessment router (e.g. combine into
one APIRouter or include both in graph.py / main.py).
"""

import re
import asyncio
import json
import logging
from typing import Literal
from fastapi import APIRouter, Request ,HTTPException
from fastapi.responses import StreamingResponse
from src.services.supabase_client import get_supabase_client
from src.services.model_router import get_model
from pydantic import BaseModel

from src.graph.nodes.skill_assessment import (
    calculate_skill_score,
    next_question_difficulty,
    score_to_level,
)

router = APIRouter()
logger = logging.getLogger(__name__)

TOTAL_QUESTIONS = 6

# --- In-memory session store (dev only — swap for Redis in prod) ---
_assessment_sessions: dict[str, dict] = {}


class GeneratedQuestion(BaseModel):
    """
    Flat schema, deliberately no nested lists — ChatNVIDIA's structured
    output via tool-calling is reliable on flat shapes but can silently
    return None on nested ones (see Bug #5, roadmap_generator.py).
    """
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: Literal["a", "b", "c", "d"]
    concept_tag: str


def _placeholder_question(skill_name: str, difficulty: str, index: int) -> dict:
    """Fallback content only — used if quiz_generation fails or is unreachable."""
    return {
        "id": f"q-{index}",
        "text": f"[{difficulty.upper()}] {skill_name} — placeholder question #{index + 1}",
        "options": [
            {"id": "a", "label": "Option A"},
            {"id": "b", "label": "Option B"},
            {"id": "c", "label": "Option C"},
            {"id": "d", "label": "Option D"},
        ],
        "difficulty": difficulty,
        "conceptTag": "general",
        "_correct_index": 0,
    }



async def _generate_question(skill_name: str, difficulty: str, index: int, asked_concepts: list[str]) -> dict:
    """
    Generates one real assessment question via quiz_generation (NVIDIA NIM).

    NOTE: ChatNVIDIA.with_structured_output() is unreliable on this model/
    endpoint — confirmed directly: plain prompting produces excellent
    content, but tool-calling-based extraction returns None almost every
    time. Per the library's own guidance (raised in its NotImplementedError
    for include_raw=True), this prompts for JSON directly and parses it by
    hand instead, then validates with the same Pydantic schema for safety.

    Falls back to a placeholder on any failure — bad JSON, missing fields,
    network error — so a flaky LLM call never blocks the assessment flow.
    """
    try:
        llm = get_model("quiz_generation")
        avoid_clause = (
            f"Do NOT repeat these concepts already covered this session: {', '.join(asked_concepts)}.\n"
            if asked_concepts else ""
        )
        prompt = (
            f"Generate one multiple-choice assessment question to test a learner's "
            f"knowledge of {skill_name} at {difficulty} difficulty.\n"
            f"{avoid_clause}"
            f"Respond with ONLY a single valid JSON object — no markdown code "
            f"fences, no explanation before or after. Exactly this shape:\n"
            f'{{"text": "...", "option_a": "...", "option_b": "...", '
            f'"option_c": "...", "option_d": "...", "correct_option": "a", '
            f'"concept_tag": "..."}}\n'
            f'correct_option must be exactly one of: "a", "b", "c", "d".\n'
            f"Keep the question and options concise — this is a quick "
            f"skill-check, not an exam."
        )
        raw = await llm.ainvoke(prompt)
        content = (raw.content or "").strip()

        # Some models wrap JSON in markdown fences despite instructions not to
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip())

        parsed = json.loads(content)
        result = GeneratedQuestion.model_validate(parsed)

        options = [
            {"id": "a", "label": result.option_a},
            {"id": "b", "label": result.option_b},
            {"id": "c", "label": result.option_c},
            {"id": "d", "label": result.option_d},
        ]
        correct_index = ["a", "b", "c", "d"].index(result.correct_option)

        return {
            "id": f"q-{index}",
            "text": result.text,
            "options": options,
            "difficulty": difficulty,
            "conceptTag": result.concept_tag,
            "_correct_index": correct_index,
        }

    except Exception as exc:
        logger.warning(
            "Real question generation failed (skill=%s, difficulty=%s): %s — using placeholder",
            skill_name, difficulty, exc,
        )
        return _placeholder_question(skill_name, difficulty, index)


@router.get("/stream/assessment")
async def stream_assessment(request: Request, session_id: str, skill_name: str = "Python"):
    """
    Opens an SSE connection and streams adaptive assessment questions.
    Each question is sent as: data: {"type": "question", "question": {...}}
    Final event: data: {"type": "done", "skill_score": ..., "skill_level": ...}
    """
    _assessment_sessions[session_id] = {
        "skill_name": skill_name,
        "answers": [],
        "current_difficulty": "easy",
        "asked_concepts": [],
    }

    async def event_generator():
        sess = _assessment_sessions[session_id]

        for i in range(TOTAL_QUESTIONS):
            if await request.is_disconnected():
                break

            difficulty = next_question_difficulty(sess["answers"], sess["current_difficulty"])
            question = await _generate_question(sess["skill_name"], difficulty, i, sess["asked_concepts"])
            sess.setdefault("correct_indices", {})[i] = question.get("_correct_index", 0)
            sess["asked_concepts"].append(question.get("conceptTag", "general"))
            question["_session_id"] = session_id  # convenience; not sent in real impl

            payload = {"type": "question", "question": {k: v for k, v in question.items() if not k.startswith("_")}}
            yield f"data: {json.dumps(payload)}\n\n"

            # Wait for the answer to arrive via POST /quiz/assessment/submit.
            # Simplified polling loop for the stub — real impl uses an
            # async event/queue keyed by session_id.
            while len(sess["answers"]) <= i:
                if await request.is_disconnected():
                    return
                await asyncio.sleep(0.1)

        score = calculate_skill_score(sess["answers"])
        level = score_to_level(score)
        yield f"data: {json.dumps({'type': 'done', 'skill_score': score, 'skill_level': level})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class AssessmentAnswer(BaseModel):
    session_id: str
    question_index: int
    selected_index: int


@router.post("/quiz/assessment/submit")
async def submit_assessment_answer(payload: AssessmentAnswer):
    """
    Records one answer for the session. The SSE stream picks this up
    and emits the next question (or the final 'done' event).

    On the final answer, writes skill_score/skill_level back to the
    skill_sessions row — this is what the roadmap generator actually
    reads. Without this write, a real score would compute correctly
    but never reach roadmap generation.
    """
    sess = _assessment_sessions.get(payload.session_id)
    if sess is None:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    difficulty = next_question_difficulty(sess["answers"], sess["current_difficulty"])

    correct_index = sess.get("correct_indices", {}).get(payload.question_index, 0)
    correct = payload.selected_index == correct_index

    sess["answers"].append({"difficulty": difficulty, "correct": correct})

    is_last = len(sess["answers"]) >= TOTAL_QUESTIONS
    response = {"recorded": True, "answers_so_far": len(sess["answers"])}

    if is_last:
        score = calculate_skill_score(sess["answers"])
        level = score_to_level(score)
        response["skill_score"] = score
        response["skill_level"] = level
        response["complete"] = True

        try:
            supabase = get_supabase_client()
            supabase.table("skill_sessions").update({
                "skill_score": score,
                "skill_level": level,
            }).eq("id", payload.session_id).execute()
        except Exception as exc:
            logger.error("Failed to write skill_score for session %s: %s", payload.session_id, exc)

        _assessment_sessions.pop(payload.session_id, None)

    return response