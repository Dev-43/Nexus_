"""
Unit tests for AdaptiveSubLevelNode.

All LLM calls are mocked - zero API cost, runs in milliseconds.
Tests cover:
    - Happy path: gaps identified correctly, mini-roadmap generated and validated
    - Missing test_history: node still produces valid output
    - Feature flag disabled: node skips gracefully
    - LLM returns malformed JSON: error fields written, no exception raised
    - Gap identification logic: correct concept tag counting
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.graph.nodes.adaptive_sublevel import (
    MiniLesson,
    MiniRoadmap,
    adaptive_sublevel_node,
    identify_gaps,
)


# ---------------------------------------------------------------------------
# State helper
# ---------------------------------------------------------------------------

def make_state(**overrides) -> dict:
    base = {
        "user_id": "test-user",
        "session_id": "test-session",
        "skill_name": "Python",
        "skill_score": 0.4,
        "skill_level": "beginner",
        "personality_profile": None,
        "quiz_skipped": False,
        "roadmap": {"levels": []},
        "roadmap_version": 1,
        "current_level_index": 0,
        "roadmap_locked": True,
        "user_roadmap_feedback": None,
        "regeneration_count": 0,
        "skip_assessment": False,
        "test_history": [],
        "fail_count": 2,
        "sublevel_reject_count": 0,
        "points": 0,
        "badges": [],
        "streak_days": 0,
        "next_action": "adaptive_sublevel",
        "task_type": "",
        "error_message": None,
        "error_node": None,
        "feature_flags": {"adaptive_sublevel": True},
    }
    return {**base, **overrides}


# ---------------------------------------------------------------------------
# Synthetic test_history fixtures
# ---------------------------------------------------------------------------

def make_test_history(level_index: int = 0) -> list[dict]:
    """
    Level 0 test history with known failure patterns:
    - "loops": failed 3 times across two attempts
    - "functions": failed 3 times across two attempts
    - "variables": failed 1 time
    """
    return [
        {
            "level_index": level_index,
            "score": 0.4,
            "passed": False,
            "attempt_number": 1,
            "answers": [
                {"question_id": "q1", "correct": False, "concept_tag": "loops"},
                {"question_id": "q2", "correct": True,  "concept_tag": "variables"},
                {"question_id": "q3", "correct": False, "concept_tag": "functions"},
                {"question_id": "q4", "correct": False, "concept_tag": "loops"},
                {"question_id": "q5", "correct": True,  "concept_tag": "functions"},
            ],
        },
        {
            "level_index": level_index,
            "score": 0.4,
            "passed": False,
            "attempt_number": 2,
            "answers": [
                {"question_id": "q1", "correct": False, "concept_tag": "loops"},
                {"question_id": "q2", "correct": False, "concept_tag": "functions"},
                {"question_id": "q3", "correct": True,  "concept_tag": "variables"},
                {"question_id": "q4", "correct": True,  "concept_tag": "loops"},
                {"question_id": "q5", "correct": False, "concept_tag": "variables"},
            ],
        },
    ]


VALID_MINI_ROADMAP_JSON = json.dumps({
    "target_gaps": ["loops", "functions"],
    "lessons": [
        {
            "title": "Mastering Python Loops",
            "description": "Deep dive into for/while loops with hands-on exercises",
            "concept_tags": ["loops", "iteration"],
        },
        {
            "title": "Functions from Scratch",
            "description": "Parameters, return values, and scope explained clearly",
            "concept_tags": ["functions", "scope"],
        },
        {
            "title": "Loops + Functions Combined",
            "description": "Practice using loops inside functions with real examples",
            "concept_tags": ["loops", "functions"],
        },
    ],
    "retest_note": "After completing these 3 lessons, you will retake the Level 1 gate test.",
})


# ---------------------------------------------------------------------------
# Unit tests: identify_gaps
# ---------------------------------------------------------------------------

class TestIdentifyGaps:
    def test_returns_top_two_gaps(self):
        history = make_test_history(level_index=0)
        gaps = identify_gaps(history, level_index=0)
        assert len(gaps) <= 2
        assert "loops" in gaps or "functions" in gaps

    def test_ignores_other_levels(self):
        history = make_test_history(level_index=1)
        gaps = identify_gaps(history, level_index=0)
        assert gaps == ["general concepts"]

    def test_empty_history_returns_general(self):
        gaps = identify_gaps([], level_index=0)
        assert gaps == ["general concepts"]

    def test_all_correct_returns_general(self):
        history = [
            {
                "level_index": 0,
                "answers": [
                    {"correct": True, "concept_tag": "loops"},
                    {"correct": True, "concept_tag": "functions"},
                ],
            }
        ]
        gaps = identify_gaps(history, level_index=0)
        assert gaps == ["general concepts"]

    def test_missing_concept_tag_falls_back_to_general(self):
        history = [
            {
                "level_index": 0,
                "answers": [
                    {"correct": False},
                ],
            }
        ]
        gaps = identify_gaps(history, level_index=0)
        assert "general" in gaps

    def test_returns_max_two_gaps(self):
        history = [
            {
                "level_index": 0,
                "answers": [
                    {"correct": False, "concept_tag": f"concept_{i}"}
                    for i in range(10)
                ],
            }
        ]
        gaps = identify_gaps(history, level_index=0)
        assert len(gaps) <= 2


# ---------------------------------------------------------------------------
# Unit tests: adaptive_sublevel_node
# ---------------------------------------------------------------------------

class TestAdaptiveSubLevelNode:
    @pytest.mark.asyncio
    async def test_happy_path(self):
        history = make_test_history(level_index=0)
        state = make_state(test_history=history)

        mock_response = MagicMock()
        mock_response.content = VALID_MINI_ROADMAP_JSON

        with patch(
            "src.graph.nodes.adaptive_sublevel.get_model",
            return_value=MagicMock(ainvoke=AsyncMock(return_value=mock_response)),
        ):
            result = await adaptive_sublevel_node(state)

        assert result["next_action"] == "show_sublevel_offer"
        assert result["error_message"] is None
        assert "sublevel" in result["roadmap"]
        sublevel = result["roadmap"]["sublevel"]
        assert 2 <= len(sublevel["lessons"]) <= 4
        assert len(sublevel["target_gaps"]) >= 1

    @pytest.mark.asyncio
    async def test_task_type_set_to_gap_analysis(self):
        history = make_test_history(level_index=0)
        state = make_state(test_history=history)

        mock_response = MagicMock()
        mock_response.content = VALID_MINI_ROADMAP_JSON

        captured_task_type = {}

        def capture_get_model(task_type):
            captured_task_type["value"] = task_type
            mock_llm = MagicMock()
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            return mock_llm

        with patch("src.graph.nodes.adaptive_sublevel.get_model", side_effect=capture_get_model):
            await adaptive_sublevel_node(state)

        assert captured_task_type["value"] == "gap_analysis"

    @pytest.mark.asyncio
    async def test_empty_test_history_still_produces_output(self):
        state = make_state(test_history=[])

        mock_response = MagicMock()
        mock_response.content = VALID_MINI_ROADMAP_JSON

        with patch(
            "src.graph.nodes.adaptive_sublevel.get_model",
            return_value=MagicMock(ainvoke=AsyncMock(return_value=mock_response)),
        ):
            result = await adaptive_sublevel_node(state)

        assert result["next_action"] == "show_sublevel_offer"
        assert result["error_message"] is None

    @pytest.mark.asyncio
    async def test_feature_flag_disabled_skips_gracefully(self):
        state = make_state(feature_flags={"adaptive_sublevel": False})

        with patch("src.graph.nodes.adaptive_sublevel.get_model") as mock_get_model:
            result = await adaptive_sublevel_node(state)
            mock_get_model.assert_not_called()

        assert result["next_action"] == "show_sublevel_offer"

    @pytest.mark.asyncio
    async def test_malformed_json_writes_error_does_not_raise(self):
        state = make_state(test_history=make_test_history())

        mock_response = MagicMock()
        mock_response.content = "This is not JSON at all!!!"

        with patch(
            "src.graph.nodes.adaptive_sublevel.get_model",
            return_value=MagicMock(ainvoke=AsyncMock(return_value=mock_response)),
        ):
            result = await adaptive_sublevel_node(state)

        assert result["next_action"] == "error_handler"
        assert result["error_message"] is not None
        assert result["error_node"] == "adaptive_sublevel_node"

    @pytest.mark.asyncio
    async def test_llm_exception_writes_error_does_not_raise(self):
        state = make_state(test_history=make_test_history())

        with patch(
            "src.graph.nodes.adaptive_sublevel.get_model",
            return_value=MagicMock(ainvoke=AsyncMock(side_effect=Exception("NVIDIA NIM timeout"))),
        ):
            result = await adaptive_sublevel_node(state)

        assert result["next_action"] == "error_handler"
        assert "NVIDIA NIM timeout" in result["error_message"]
        assert result["error_node"] == "adaptive_sublevel_node"

    @pytest.mark.asyncio
    async def test_markdown_fenced_json_is_cleaned(self):
        state = make_state(test_history=make_test_history())

        fenced = f"```json\n{VALID_MINI_ROADMAP_JSON}\n```"
        mock_response = MagicMock()
        mock_response.content = fenced

        with patch(
            "src.graph.nodes.adaptive_sublevel.get_model",
            return_value=MagicMock(ainvoke=AsyncMock(return_value=mock_response)),
        ):
            result = await adaptive_sublevel_node(state)

        assert result["next_action"] == "show_sublevel_offer"
        assert result["error_message"] is None

    @pytest.mark.asyncio
    async def test_existing_roadmap_preserved(self):
        existing_roadmap = {
            "skill_name": "Python",
            "levels": [{"title": "Level 1"}],
        }
        state = make_state(
            roadmap=existing_roadmap,
            test_history=make_test_history(),
        )

        mock_response = MagicMock()
        mock_response.content = VALID_MINI_ROADMAP_JSON

        with patch(
            "src.graph.nodes.adaptive_sublevel.get_model",
            return_value=MagicMock(ainvoke=AsyncMock(return_value=mock_response)),
        ):
            result = await adaptive_sublevel_node(state)

        assert result["roadmap"]["skill_name"] == "Python"
        assert result["roadmap"]["levels"] == [{"title": "Level 1"}]
        assert "sublevel" in result["roadmap"]

    @pytest.mark.asyncio
    async def test_mini_roadmap_lesson_count_within_bounds(self):
        two_lesson_json = json.dumps({
            "target_gaps": ["loops"],
            "lessons": [
                {"title": "Loop Basics", "description": "for/while explained", "concept_tags": ["loops"]},
                {"title": "Loop Patterns", "description": "common patterns", "concept_tags": ["loops"]},
            ],
            "retest_note": "Retake the gate test after these lessons.",
        })

        state = make_state(test_history=make_test_history())
        mock_response = MagicMock()
        mock_response.content = two_lesson_json

        with patch(
            "src.graph.nodes.adaptive_sublevel.get_model",
            return_value=MagicMock(ainvoke=AsyncMock(return_value=mock_response)),
        ):
            result = await adaptive_sublevel_node(state)

        assert result["next_action"] == "show_sublevel_offer"
        assert len(result["roadmap"]["sublevel"]["lessons"]) == 2
