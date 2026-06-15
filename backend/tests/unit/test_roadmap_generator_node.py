import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.graph.nodes.roadmap_generator import roadmap_generator_node
from src.models.roadmap import Roadmap, Level, Resource


def make_state(**overrides):
    base = {
        "user_id": "test-user", "session_id": "test-session",
        "skill_name": "Python", "skill_score": 0.4, "skill_level": "beginner",
        "personality_profile": None, "quiz_skipped": False,
        "roadmap": None, "roadmap_version": 0, "current_level_index": 0,
        "roadmap_locked": False, "user_roadmap_feedback": None, "regeneration_count": 0,
        "skip_assessment": False,
        "fail_count": 0, "sublevel_reject_count": 0, "test_history": [],
        "points": 0, "badges": [], "streak_days": 0,
        "next_action": "", "task_type": "roadmap_generation",
        "error_message": None, "error_node": None, "feature_flags": {}
    }
    return {**base, **overrides}


def _fake_roadmap():
    return Roadmap(
        skill_name="Python",
        skill_level="beginner",
        total_levels=3,
        levels=[
            Level(index=0, title="Foundations", description="Core basics",
                  resources=[Resource(title="Intro video", url="https://example.com", type="video")],
                  locked=False),
            Level(index=1, title="Applied Skills", description="Hands-on projects",
                  resources=[], locked=True),
            Level(index=2, title="Advanced Topics", description="Expert patterns",
                  resources=[], locked=True),
        ],
    )


@pytest.fixture
def mock_llm():
    llm = MagicMock()
    structured_llm = MagicMock()
    structured_llm.ainvoke = AsyncMock(return_value=_fake_roadmap())
    llm.with_structured_output.return_value = structured_llm
    return llm


@pytest.fixture
def mock_supabase():
    client = MagicMock()
    client.table.return_value.insert.return_value.execute = MagicMock(return_value=None)
    return client


@patch("src.graph.nodes.roadmap_generator.get_supabase_client")
@patch("src.graph.nodes.roadmap_generator.get_model")
@pytest.mark.asyncio
async def test_happy_path_no_personality(mock_get_model, mock_get_supabase, mock_llm, mock_supabase):
    mock_get_model.return_value = mock_llm
    mock_get_supabase.return_value = mock_supabase

    state = make_state()
    result = await roadmap_generator_node(state)

    assert result["roadmap"] is not None
    assert result["roadmap"]["total_levels"] == 3
    assert len(result["roadmap"]["levels"]) >= 3
    assert result["roadmap_version"] == 1
    assert result["next_action"] == "roadmap_ready"
    assert result["error_message"] is None
    mock_get_model.assert_called_with("roadmap_generation")


@patch("src.graph.nodes.roadmap_generator.get_supabase_client")
@patch("src.graph.nodes.roadmap_generator.get_model")
@pytest.mark.asyncio
async def test_happy_path_with_personality(mock_get_model, mock_get_supabase, mock_llm, mock_supabase):
    mock_get_model.return_value = mock_llm
    mock_get_supabase.return_value = mock_supabase

    state = make_state(personality_profile={"style": "visual", "pace": "fast"})
    result = await roadmap_generator_node(state)

    assert result["roadmap"] is not None
    assert result["roadmap_version"] == 1
    assert result["error_message"] is None


@patch("src.graph.nodes.roadmap_generator.get_supabase_client")
@patch("src.graph.nodes.roadmap_generator.get_model")
@pytest.mark.asyncio
async def test_regeneration_with_feedback_increments_version_and_count(
    mock_get_model, mock_get_supabase, mock_llm, mock_supabase
):
    mock_get_model.return_value = mock_llm
    mock_get_supabase.return_value = mock_supabase

    state = make_state(
        roadmap_version=1,
        regeneration_count=0,
        user_roadmap_feedback="I already know loops, skip basics",
    )
    result = await roadmap_generator_node(state)

    assert result["roadmap_version"] == 2
    assert result["regeneration_count"] == 1
    assert result["user_roadmap_feedback"] is None  # consumed
    assert result["next_action"] == "roadmap_ready"


@patch("src.graph.nodes.roadmap_generator.get_supabase_client")
@patch("src.graph.nodes.roadmap_generator.get_model")
@pytest.mark.asyncio
async def test_regeneration_blocked_at_limit(mock_get_model, mock_get_supabase, mock_llm, mock_supabase):
    mock_get_model.return_value = mock_llm
    mock_get_supabase.return_value = mock_supabase

    state = make_state(
        roadmap=_fake_roadmap().model_dump(),
        roadmap_version=3,
        regeneration_count=2,
        user_roadmap_feedback="please change it again",
    )
    result = await roadmap_generator_node(state)

    # LLM never called
    mock_get_model.assert_not_called()
    assert result["roadmap_version"] == 3  # unchanged
    assert result["regeneration_count"] == 2  # unchanged
    assert result["roadmap"] == state["roadmap"]  # existing roadmap preserved
    assert result["error_message"] is not None
    assert result["error_node"] == "roadmap_generator"


@patch("src.graph.nodes.roadmap_generator.get_supabase_client")
@patch("src.graph.nodes.roadmap_generator.get_model")
@pytest.mark.asyncio
async def test_llm_failure_writes_error_and_routes_to_error_handler(
    mock_get_model, mock_get_supabase, mock_supabase
):
    failing_llm = MagicMock()
    structured_llm = MagicMock()
    structured_llm.ainvoke = AsyncMock(side_effect=RuntimeError("Gemini timeout"))
    failing_llm.with_structured_output.return_value = structured_llm
    mock_get_model.return_value = failing_llm
    mock_get_supabase.return_value = mock_supabase

    state = make_state()
    result = await roadmap_generator_node(state)

    assert result["error_message"] == "Gemini timeout"
    assert result["error_node"] == "roadmap_generator"
    assert result["next_action"] == "error"
    assert result["roadmap"] is None  # never crashed
