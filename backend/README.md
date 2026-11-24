# Nexus Backend — FastAPI & LangGraph Orchestration Service

Adaptive learning backend powered by FastAPI, LangGraph (9-node StateGraph), Supabase PostgreSQL, and NVIDIA NIM with multi-model fallback and 40 RPM rate limiting.

- **Production Endpoint:** [https://nexus-2qcw.onrender.com](https://nexus-2qcw.onrender.com)
- **Health Check:** [`https://nexus-2qcw.onrender.com/health`](https://nexus-2qcw.onrender.com/health)

---

## Architecture

- **LangGraph StateGraph (`backend/src/graph/`):**
  - `router_node`: Flow control & routing.
  - `error_handler`: Self-healing & error recovery.
  - `personality_quiz`: Cognitive learning preferences.
  - `skill_assessment`: Real-time adaptive quiz engine.
  - `roadmap_generator`: Curriculum structure validation.
  - `level_gate`: Mastery gate testing.
  - `adaptive_sublevel`: Gap analysis & remedial mini-roadmaps.
  - `rejection_handler`: Sublevel skip handling.
  - `gamification`: XP, streaks, and badge allocations.
- **Multi-Model Routing (`backend/src/services/model_router.py`):**
  - Primary: NVIDIA NIM (`nvidia/nemotron-3.5-lightning-30b-a3b` or configured `NVIDIA_MODEL`).
  - Rate Limiting: 40 RPM sliding-window proxy (`SlidingWindowRateLimiter`).
  - Fallback: Google Gemini (`gemini-3.8-flash`) and offline deterministic fallback questions.
- **Database & Safe PostgREST Querying:**
  - Supabase client utilizing safe `.maybe_single()` queries to avoid `PGRST116` errors on empty lookups.

---

## Local Setup

```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

---

## Testing

Run the test suite across unit and integration tests:

```bash
pytest tests
```
