"""
Roadmap Generator Node

Owned state fields (read):
    skill_name, skill_level, skill_score, personality_profile,
    user_roadmap_feedback, regeneration_count, roadmap_version,
    session_id, feature_flags, task_type

Owned state fields (write):
    roadmap, roadmap_version, error_message, error_node, next_action
"""

import json
import logging
from src.models.roadmap import Roadmap
from src.services.model_router import get_model
from src.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


PROMPT_TEMPLATE = """You are an expert curriculum designer.

Build a personalised learning roadmap for the skill: {skill_name}

User's current skill level: {skill_level}
User's assessment score: {skill_score:.2f} (0.0 = total beginner, 1.0 = expert)

{personality_section}

{feedback_section}

Requirements:
- Produce between 3 and 5 levels.
- Each level must have a title, a description, and a list of resources.
- Levels must progress logically in difficulty from {skill_level} upward.
- Tailor pacing, depth, and resource style to the signals above.

Return ONLY the structured Roadmap object."""


def _build_personality_section(personality_profile: dict | None) -> str:
    if not personality_profile:
        return "Personality profile: not provided. Use a balanced, general-purpose teaching style."

    return (
        "User's learning style preferences (use these to shape resource types, "
        f"pacing, and explanation style):\n{personality_profile}"
    )


def _build_feedback_section(user_roadmap_feedback: str | None) -> str:
    if not user_roadmap_feedback:
        return ""

    return (
        "IMPORTANT — The user has reviewed a previous version of this roadmap "
        "and provided the following correction. You MUST incorporate this "
        "feedback into the new roadmap:\n"
        f'"{user_roadmap_feedback}"'
    )


async def roadmap_generator_node(state: dict) -> dict:
    """
    Generates (or regenerates) a personalised Roadmap using Gemini Flash
    with structured output. Handles regeneration guard, feedback injection,
    and version incrementing.
    """
    try:
        # --- Regeneration guard ---
        regeneration_count = state.get("regeneration_count", 0)
        user_roadmap_feedback = state.get("user_roadmap_feedback")

        if user_roadmap_feedback is not None and regeneration_count >= 2:
            # Block regeneration — return existing roadmap unchanged
            return {
                **state,
                "error_message": "Regeneration limit reached (max 2). Returning existing roadmap.",
                "error_node": "roadmap_generator",
                "next_action": "roadmap_ready",
            }

        # --- Build prompt ---
        personality_section = _build_personality_section(
            state.get("personality_profile")
        )
        feedback_section = _build_feedback_section(user_roadmap_feedback)

        prompt = PROMPT_TEMPLATE.format(
            skill_name=state["skill_name"],
            skill_level=state["skill_level"],
            skill_score=state.get("skill_score", 0.0),
            personality_section=personality_section,
            feedback_section=feedback_section,
        )

        # --- Get model via router (never hardcode model name) ---
        llm = get_model("roadmap_generation")
        roadmap: Roadmap | None = None

        # 1. First attempt: with_structured_output (standard for Gemini & supported models)
        try:
            structured_llm = llm.with_structured_output(Roadmap)
            roadmap = await structured_llm.ainvoke(prompt)
        except Exception as err:
            # NVIDIA NIM does not support guided_json (returns HTTP 400 unknown field `guided_json`)
            # Handle this specifically by falling back to direct JSON prompting
            if "guided_json" in str(err).lower() or "400" in str(err):
                logger.info("Provider does not support guided_json — falling back to direct JSON prompting")
                json_prompt = (
                    f"{prompt}\n\n"
                    "Respond ONLY with a single valid JSON object matching this schema:\n"
                    "{\n"
                    f'  "skill_name": "{state["skill_name"]}",\n'
                    f'  "skill_level": "{state["skill_level"]}",\n'
                    '  "total_levels": 3,\n'
                    '  "levels": [\n'
                    '    {\n'
                    '      "index": 0,\n'
                    '      "title": "Level Title",\n'
                    '      "description": "Level description",\n'
                    '      "locked": false,\n'
                    '      "resources": [\n'
                    '        {"title": "Resource Name", "type": "article", "url": "https://...", "description": "..."}\n'
                    '      ]\n'
                    '    }\n'
                    '  ]\n'
                    "}\n"
                    "No markdown fences, no explanation before or after. Pure JSON only."
                )
                raw = await llm.ainvoke(json_prompt)
                content = (raw.content or "").strip()
                if not content and hasattr(raw, "additional_kwargs"):
                    content = (raw.additional_kwargs.get("reasoning_content") or "").strip()

                start_idx = content.find("{")
                end_idx = content.rfind("}")
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    content = content[start_idx : end_idx + 1]

                try:
                    parsed_json = json.loads(content)
                    roadmap = Roadmap.model_validate(parsed_json)
                except Exception as parse_err:
                    logger.warning("Direct JSON roadmap parsing failed (%s)", parse_err)
                    roadmap = None
            else:
                # Other unexpected failures (e.g. Gemini timeout, network down) raise to error_handler
                raise

        if roadmap is None:
            # Still nothing — use the documented emergency fallback so the
            # demo never crashes. See Emergency Fallback Phase, Fallback 2.
            roadmap_dict = {
                "skill_name": state["skill_name"],
                "skill_level": state["skill_level"],
                "total_levels": 3,
                "levels": [
                    {
                        "index": 0,
                        "title": f"{state['skill_name']} Foundations & Core Architecture",
                        "description": f"Master core concepts, fundamentals, and environment setup for {state['skill_name']}.",
                        "resources": [
                            {"title": f"{state['skill_name']} Documentation", "type": "documentation", "url": "https://docs.python.org", "description": "Official documentation"}
                        ],
                        "locked": False,
                    },
                    {
                        "index": 1,
                        "title": f"Applied {state['skill_name']} & Practical Workflows",
                        "description": f"Hands-on implementation, intermediate patterns, and libraries in {state['skill_name']}.",
                        "resources": [
                            {"title": "Project Workflows & Implementation", "type": "project", "url": "https://github.com", "description": "Hands-on projects"}
                        ],
                        "locked": True,
                    },
                    {
                        "index": 2,
                        "title": f"Advanced {state['skill_name']} & Production Systems",
                        "description": f"Expert optimization, scaling, performance, and best practices in {state['skill_name']}.",
                        "resources": [
                            {"title": "Advanced Engineering Patterns", "type": "article", "url": "https://medium.com", "description": "Production architectures"}
                        ],
                        "locked": True,
                    },
                ],
            }
        else:
            roadmap_dict = roadmap.model_dump()

        # --- Versioning ---
        new_version = state.get("roadmap_version", 0) + 1
        if user_roadmap_feedback is not None:
            new_regeneration_count = regeneration_count + 1
        else:
            new_regeneration_count = regeneration_count

        # --- Persist to Supabase ---
        supabase = get_supabase_client()
        supabase.table("roadmaps").insert({
            "session_id": state["session_id"],
            "user_id": state["user_id"],
            "roadmap_data": roadmap_dict,
            "roadmap_version": new_version,
            "current_level_index": 0,
            "locked": state.get("roadmap_locked", False),
        }).execute()

        return {
            **state,
            "roadmap": roadmap_dict,
            "roadmap_version": new_version,
            "regeneration_count": new_regeneration_count,
            "user_roadmap_feedback": None,  # consumed
            "error_message": None,
            "error_node": None,
            "next_action": "roadmap_ready",
        }

    except Exception as exc:
        return {
            **state,
            "error_message": str(exc),
            "error_node": "roadmap_generator",
            "next_action": "error",
        }
