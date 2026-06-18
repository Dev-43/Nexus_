"""
AdaptiveSubLevelNode
--------------------
Owned state fields (reads):
    test_history, current_level_index, skill_name, skill_level,
    task_type, feature_flags

Owned state fields (writes):
    roadmap (mini-roadmap appended / stored in state for sublevel),
    next_action, error_message, error_node, task_type

Triggers when: fail_count >= 1 and sublevel_reject_count < 3
Does NOT trigger when: feature flag "adaptive_sublevel" is disabled
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from langchain_core.language_models import BaseChatModel
from pydantic import BaseModel, Field

from src.graph.state import NexusState
from src.services.model_router import get_model

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models for the mini-roadmap
# ---------------------------------------------------------------------------

class MiniLesson(BaseModel):
    title: str = Field(..., description="Short lesson title")
    description: str = Field(..., description="What this lesson covers and why it addresses the gap")
    concept_tags: list[str] = Field(default_factory=list, description="Concept tags this lesson covers")


class MiniRoadmap(BaseModel):
    target_gaps: list[str] = Field(..., description="Concept gaps this mini-roadmap addresses")
    lessons: list[MiniLesson] = Field(..., min_length=2, max_length=4)
    retest_note: str = Field(..., description="Brief note about the re-test at the end of the sublevel")


# ---------------------------------------------------------------------------
# Gap identification
# ---------------------------------------------------------------------------

def identify_gaps(test_history: list[dict], level_index: int) -> list[str]:
    """
    Read test_history entries for the given level_index.
    Count incorrect answers by concept_tag.
    Return the top 1-2 most-failed concept tags.
    """
    concept_fail_counts: dict[str, int] = {}

    for record in test_history:
        if record.get("level_index") != level_index:
            continue
        answers = record.get("answers", [])
        if not isinstance(answers, list):
            continue
        for answer in answers:
            if answer.get("correct") is False:
                tag = answer.get("concept_tag") or answer.get("concept") or "general"
                concept_fail_counts[tag] = concept_fail_counts.get(tag, 0) + 1

    if not concept_fail_counts:
        return ["general concepts"]

    # Sort by fail count descending, return top 2
    sorted_gaps = sorted(concept_fail_counts.items(), key=lambda x: x[1], reverse=True)
    return [gap for gap, _ in sorted_gaps[:2]]


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_sublevel_prompt(
    skill_name: str,
    skill_level: str,
    gaps: list[str],
    level_index: int,
) -> str:
    gaps_str = ", ".join(gaps)
    return f"""You are an expert learning designer for the skill: {skill_name} at {skill_level} level.

A learner has repeatedly failed the gate test for Level {level_index + 1}.
After analysing their wrong answers, the identified concept gaps are: {gaps_str}.

Generate a targeted mini-roadmap with 2-4 short lessons that directly address these gaps.
Each lesson should:
- Have a clear, specific title
- Explain exactly what will be covered and why it fills the identified gap
- Include relevant concept tags

Also include a brief note about the re-test that will follow the sublevel.

The learner should be able to complete all lessons in 20-40 minutes.
Focus only on the identified gaps - do not add unrelated content.

Respond ONLY with valid JSON matching this exact schema:
{{
  "target_gaps": ["gap1", "gap2"],
  "lessons": [
    {{
      "title": "lesson title",
      "description": "what this covers and why",
      "concept_tags": ["tag1", "tag2"]
    }}
  ],
  "retest_note": "brief note about the re-test"
}}

No preamble. No markdown. Pure JSON only."""


# ---------------------------------------------------------------------------
# Node function
# ---------------------------------------------------------------------------

async def adaptive_sublevel_node(state: NexusState) -> NexusState:
    """
    Identifies concept gaps from test_history and generates a targeted
    mini-roadmap using NVIDIA NIM (Llama 3.3 70B).
    """
    # Feature flag check
    if not state.get("feature_flags", {}).get("adaptive_sublevel", True):
        logger.info("adaptive_sublevel feature flag disabled - skipping")
        return {**state, "next_action": "show_sublevel_offer"}

    try:
        level_index = state.get("current_level_index", 0)
        test_history = state.get("test_history", [])
        skill_name = state.get("skill_name", "the skill")
        skill_level = state.get("skill_level", "beginner")

        # Step 1 - identify gaps
        gaps = identify_gaps(test_history, level_index)
        logger.info(f"Identified gaps for level {level_index}: {gaps}")

        # Step 2 - build prompt
        prompt = build_sublevel_prompt(skill_name, skill_level, gaps, level_index)

        # Step 3 - call NVIDIA NIM via model_router
        updated_state = {**state, "task_type": "gap_analysis"}
        llm: BaseChatModel = get_model("gap_analysis")

        response = await llm.ainvoke(prompt)
        raw_text = response.content

        # Strip any accidental markdown fences
        clean_text = raw_text.strip()
        if clean_text.startswith("```"):
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:]
            clean_text = clean_text.strip()

        # Step 4 - parse and validate with Pydantic
        raw_json = json.loads(clean_text)
        mini_roadmap = MiniRoadmap(**raw_json)

        logger.info(
            f"Mini-roadmap generated: {len(mini_roadmap.lessons)} lessons "
            f"targeting {mini_roadmap.target_gaps}"
        )

        return {
            **updated_state,
            "roadmap": {
                **(state.get("roadmap") or {}),
                "sublevel": mini_roadmap.model_dump(),
            },
            "next_action": "show_sublevel_offer",
            "error_message": None,
            "error_node": None,
        }

    except json.JSONDecodeError as e:
        logger.error(f"adaptive_sublevel_node: JSON parse error - {e}")
        return {
            **state,
            "error_message": f"Sublevel generation produced invalid JSON: {e}",
            "error_node": "adaptive_sublevel_node",
            "next_action": "error_handler",
        }
    except Exception as e:
        logger.error(f"adaptive_sublevel_node: unexpected error - {e}")
        return {
            **state,
            "error_message": str(e),
            "error_node": "adaptive_sublevel_node",
            "next_action": "error_handler",
        }
