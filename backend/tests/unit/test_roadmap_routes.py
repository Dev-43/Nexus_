"""
Unit tests for Feature 14 — Roadmap SSE routes.
LLM calls and Supabase are mocked throughout.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_session(
    session_id="sess-1",
    skill_name="Python",
    skill_level="beginner",
    skill_score=0.5,
    locked=False,
    roadmap_version=1,
):
    return {
        "id": session_id,
        "user_id": "user-1",
        "skill_name": skill_name,
        "skill_level": skill_level,
        "skill_score": skill_score,
        "personality_profile": None,
        "quiz_skipped": False,
    }


def _make_mock_roadmap(roadmap_id="road-1", session_id="sess-1", locked=False, version=1):
    return {
        "id": roadmap_id,
        "session_id": session_id,
        "user_id": "user-1",
        "roadmap_data": {
            "skill_name": "Python",
            "total_levels": 3,
            "levels": [
                {"index": 0, "title": "Foundations", "locked": False},
                {"index": 1, "title": "Applied Skills", "locked": True},
                {"index": 2, "title": "Advanced Topics", "locked": True},
            ],
        },
        "roadmap_version": version,
        "current_level_index": 0,
        "locked": locked,
    }


# ---------------------------------------------------------------------------
# Tests: SSE generator
# ---------------------------------------------------------------------------

class TestRoadmapStreamGenerator:
    """Tests for _roadmap_stream_generator — exercises the SSE event sequence."""

    @pytest.mark.asyncio
    async def test_happy_path_emits_thinking_then_tokens_then_done(self):
        from src.routes.roadmap import _roadmap_stream_generator

        mock_session = _make_mock_session()
        mock_roadmap = _make_mock_roadmap()

        fake_chunks = [MagicMock(content="Level "), MagicMock(content="1: Foundations")]

        with (
            patch("src.routes.roadmap.get_supabase_client") as mock_supa,
            patch("src.routes.roadmap.get_model") as mock_get_model,
            patch("src.routes.roadmap.roadmap_generator_node", new_callable=AsyncMock) as mock_gen,
        ):
            # Set up Supabase mock chain
            supa = MagicMock()
            mock_supa.return_value = supa

            def supabase_table_side_effect(table_name):
                tbl = MagicMock()
                if table_name == "skill_sessions":
                    tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = mock_session
                elif table_name == "roadmaps":
                    # First call: existing roadmap lookup
                    # Second call: saved roadmap ID lookup after generation
                    tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_roadmap]
                elif table_name == "feature_flags":
                    tbl.select.return_value.execute.return_value.data = []
                return tbl

            supa.table.side_effect = supabase_table_side_effect

            # LLM mock — async generator
            async def fake_astream(_prompt):
                for chunk in fake_chunks:
                    yield chunk

            llm_mock = MagicMock()
            llm_mock.astream = fake_astream
            mock_get_model.return_value = llm_mock

            mock_gen.return_value = {"error_message": None}

            events = []
            async for raw in _roadmap_stream_generator("sess-1"):
                line = raw.strip()
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        types = [e["type"] for e in events]

        # Must start with thinking events
        assert types[0] == "thinking"

        # Must include token events
        assert "token" in types

        # Must end with done
        assert types[-1] == "done"

        # Token content must concatenate to the expected narrative
        tokens = "".join(e["content"] for e in events if e["type"] == "token")
        assert "Level" in tokens

    @pytest.mark.asyncio
    async def test_locked_roadmap_emits_error_on_regeneration(self):
        from src.routes.roadmap import _roadmap_stream_generator

        mock_session = _make_mock_session()
        mock_roadmap = _make_mock_roadmap(locked=True)

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa

            def supabase_table_side_effect(table_name):
                tbl = MagicMock()
                if table_name == "skill_sessions":
                    tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = mock_session
                elif table_name == "roadmaps":
                    tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_roadmap]
                elif table_name == "feature_flags":
                    tbl.select.return_value.execute.return_value.data = []
                return tbl

            supa.table.side_effect = supabase_table_side_effect

            events = []
            async for raw in _roadmap_stream_generator("sess-1", user_feedback="change something"):
                line = raw.strip()
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        error_events = [e for e in events if e["type"] == "error"]
        assert len(error_events) == 1
        assert "locked" in error_events[0]["message"].lower()

    @pytest.mark.asyncio
    async def test_regeneration_count_exceeded_emits_error(self):
        from src.routes.roadmap import _roadmap_stream_generator

        mock_session = _make_mock_session()
        # version 3 means 2 regenerations already used
        mock_roadmap = _make_mock_roadmap(locked=False, version=3)

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa

            def supabase_table_side_effect(table_name):
                tbl = MagicMock()
                if table_name == "skill_sessions":
                    tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = mock_session
                elif table_name == "roadmaps":
                    tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [mock_roadmap]
                elif table_name == "feature_flags":
                    tbl.select.return_value.execute.return_value.data = []
                return tbl

            supa.table.side_effect = supabase_table_side_effect

            events = []
            async for raw in _roadmap_stream_generator("sess-1", user_feedback="change something"):
                line = raw.strip()
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        error_events = [e for e in events if e["type"] == "error"]
        assert len(error_events) == 1
        assert "regeneration" in error_events[0]["message"].lower()

    @pytest.mark.asyncio
    async def test_missing_session_emits_error(self):
        from src.routes.roadmap import _roadmap_stream_generator

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa

            def supabase_table_side_effect(table_name):
                tbl = MagicMock()
                if table_name == "skill_sessions":
                    tbl.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
                elif table_name == "roadmaps":
                    tbl.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []
                elif table_name == "feature_flags":
                    tbl.select.return_value.execute.return_value.data = []
                return tbl

            supa.table.side_effect = supabase_table_side_effect

            events = []
            async for raw in _roadmap_stream_generator("bad-session"):
                line = raw.strip()
                if line.startswith("data: "):
                    events.append(json.loads(line[6:]))

        error_events = [e for e in events if e["type"] == "error"]
        assert len(error_events) == 1


# ---------------------------------------------------------------------------
# Tests: POST /roadmap/{id}/regenerate guards
# ---------------------------------------------------------------------------

class TestRegenerateEndpointGuards:

    def _make_app(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from src.routes.roadmap import router
        app = FastAPI()
        app.include_router(router)
        return TestClient(app)

    def test_regenerate_locked_roadmap_returns_409(self):
        client = self._make_app()
        mock_roadmap = _make_mock_roadmap(locked=True, version=1)

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa
            supa.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = mock_roadmap

            resp = client.post("/roadmap/road-1/regenerate", json={"feedback": "change it"})

        assert resp.status_code == 409
        assert "locked" in resp.json()["detail"].lower()

    def test_regenerate_count_exceeded_returns_409(self):
        client = self._make_app()
        # version 3 = 2 regenerations used
        mock_roadmap = _make_mock_roadmap(locked=False, version=3)

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa
            supa.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = mock_roadmap

            resp = client.post("/roadmap/road-1/regenerate", json={"feedback": "change it"})

        assert resp.status_code == 409
        assert "regeneration" in resp.json()["detail"].lower()

    def test_regenerate_empty_feedback_returns_422(self):
        client = self._make_app()
        mock_roadmap = _make_mock_roadmap(locked=False, version=1)

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa
            supa.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = mock_roadmap

            resp = client.post("/roadmap/road-1/regenerate", json={"feedback": "   "})

        assert resp.status_code == 422

    def test_regenerate_valid_returns_202(self):
        client = self._make_app()
        mock_roadmap = _make_mock_roadmap(locked=False, version=1)

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa
            # select maybe_single → roadmap row
            supa.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = mock_roadmap
            # update call
            supa.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

            resp = client.post("/roadmap/road-1/regenerate", json={"feedback": "Skip basic loops"})

        assert resp.status_code == 202
        body = resp.json()
        assert body["roadmap_id"] == "road-1"
        assert body["regeneration_count"] == 1

    def test_regenerate_missing_roadmap_returns_404(self):
        client = self._make_app()

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa
            supa.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

            resp = client.post("/roadmap/bad-id/regenerate", json={"feedback": "change it"})

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Tests: GET /roadmap/{id}
# ---------------------------------------------------------------------------

class TestGetRoadmap:

    def _make_app(self):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from src.routes.roadmap import router
        app = FastAPI()
        app.include_router(router)
        return TestClient(app)

    def test_get_roadmap_returns_data(self):
        client = self._make_app()
        mock_roadmap = _make_mock_roadmap()

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa
            supa.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = mock_roadmap

            resp = client.get("/roadmap/road-1")

        assert resp.status_code == 200
        assert resp.json()["id"] == "road-1"

    def test_get_roadmap_not_found_returns_404(self):
        client = self._make_app()

        with patch("src.routes.roadmap.get_supabase_client") as mock_supa:
            supa = MagicMock()
            mock_supa.return_value = supa
            supa.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

            resp = client.get("/roadmap/bad-id")

        assert resp.status_code == 404
