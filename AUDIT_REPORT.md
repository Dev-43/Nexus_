# Nexus Platform — Comprehensive Codebase & Architecture Audit Report

**Audit Date:** September 2026  
**Repository:** `Nexus_` (AI-Powered Adaptive Learning Platform)  
**Status:** Functional Prototype / Hackathon MVP with architectural divergence, dormant backend modules, and hardcoded frontend mock layers.  
**Build & Test Health:** Backend pytest (140 tests) **Passes**; Frontend Next.js build **Passes** (with warnings).

---

## 1. Executive Summary

Nexus was developed as an adaptive, zero-to-one learning platform that creates personalized roadmaps from personality profiling and real-time adaptive assessments, adjusting dynamically when students fail "gate tests".

While the platform has strong conceptual foundations and clean UI foundations (Next.js 14, Tailwind, custom design tokens, FastAPI), our full code audit reveals a **significant gap between the documented architecture and the actual implementation**:

1. **The Core AI Orchestration Disconnect:** The platform claims to be powered by a 9-node LangGraph `StateGraph` with persistent checkpointers. In reality, **LangGraph is completely bypassed in production**. 7 of 9 nodes in `backend/src/graph/graph.py` are stubs. The FastAPI routes invoke isolated node functions directly with ad-hoc dictionary states. The LangGraph checkpointer is initialized in `backend/src/main.py` but **never used anywhere**.
2. **Hardcoded Mock Traps in Frontend:** Critical parts of the user journey—including the multi-skill dashboard, sublevel decisions, user stats, and gate test questions—rely on hardcoded in-memory mock data even though backend endpoints exist.
3. **Routing & Navigation Desync:** Authenticated logins redirect to `/dashboard`, which is a static placeholder saying *"Feature 27 will build this on Day 5"*. The real dashboard lives at `/` (`app/(dashboard)/page.tsx`).
4. **Environment & Networking Hazards:** `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` contains a comma-separated string (`http://localhost:8000, https://nexus-production-dec7...`), which breaks direct URL concatenations in SSE hooks.
5. **Dormant Production Features:** The adaptive sublevel generator (`adaptive_sublevel.py`), Redis session cache, and background email re-engagement workers are either dormant, stubbed, or unwired.

---

## 2. Architecture & Codebase Map

```
Nexus_/
├── backend/
│   ├── src/
│   │   ├── main.py                  # FastAPI app & checkpointer lifecycle (unused)
│   │   ├── config.py                # Settings, MODEL_ROUTING, env parsing
│   │   ├── graph/
│   │   │   ├── state.py             # NexusState TypedDict definition
│   │   │   ├── graph.py             # StateGraph definition (mostly stubbed)
│   │   │   └── nodes/               # 9 node implementations (invoked individually by routes)
│   │   ├── routes/                  # REST + SSE endpoints (session, quiz, roadmap, level, sublevel, user)
│   │   ├── services/                # model_router.py (LLM dispatch), supabase_client.py
│   │   └── models/                  # Pydantic schemas (Roadmap, Level, Resource, Question)
│   ├── tests/                       # Unit tests + integration mock test
│   └── migrations/                  # 001_initial.sql (5 Supabase tables)
│
└── frontend/
    ├── app/
    │   ├── (auth)/login/            # Google OAuth login
    │   ├── auth/callback/           # OAuth callback & onboarding router (redirects to /dashboard)
    │   └── (dashboard)/
    │       ├── page.tsx             # Root Dashboard (uses MOCK_SESSIONS & MOCK_STATS)
    │       ├── dashboard/page.tsx   # Placeholder stub ("Day 5 placeholder")
    │       ├── onboarding/          # Personality quiz flow
    │       ├── skill/               # Skill selection (Python, UI Design, etc.)
    │       ├── assessment/          # SSE adaptive question taker
    │       ├── roadmap/[id]/        # Roadmap view & live SSE stream
    │       │   └── level/[lid]/     # Level details & GateTest
    │       │       └── sublevel/    # Static sublevel page (unconnected to AI)
    │       ├── leaderboard/         # 10-line "coming soon" stub
    │       └── completion/          # 10-line "coming soon" stub
    ├── components/                  # UI kit + feature modals (GateTest, SubLevelModal, etc.)
    └── lib/                         # api.ts (mix of real fetch & mocks), authGate, hooks
```

---

## 3. Deep-Dive Component Audit

### 3.1. AI & LangGraph Graph Orchestration
* **LangGraph Disconnect:** In `backend/src/graph/graph.py`, `NODE_REGISTRY` maps `personality_quiz`, `skill_assessment`, `roadmap_generator`, `level_gate`, `adaptive_sublevel`, `rejection_handler`, and `gamification` to `_make_stub_node(...)`.
* **Route Bypass:** Routes like `roadmap.py` and `level.py` directly import and invoke `roadmap_generator_node(state)` and `level_gate_node(state)`. The graph is never compiled and run with checkpointer thread persistence.
* **Model Routing:** `config.py` configures:
  * `roadmap_generation`: `"gemini-3.5-flash"` (non-standard model identifier; needs validation against standard Google AI Studio models like `gemini-1.5-flash` or `gemini-2.5-flash`).
  * `quiz_generation`, `gap_analysis`, `fallback`: `"meta/llama-3.3-70b-instruct"` via NVIDIA NIM.
* **Sublevel Generator is Dormant:** `adaptive_sublevel.py` has complete prompt templates and Pydantic mini-roadmap schemas, but no HTTP route calls it, and the frontend sublevel page is completely static.

### 3.2. Backend Routes & State Management
* **In-Memory Assessment Polling Bug:** In `backend/src/routes/quiz.py`:
  * Active assessment sessions are saved in `_assessment_sessions = {}` (in-memory python dict).
  * `stream_assessment` holds an open SSE connection and executes a **busy-wait polling loop** (`while len(sess["answers"]) <= i: await asyncio.sleep(0.1)`).
  * In a multi-worker production deployment (e.g. Railway with multiple uvicorn workers or serverless containers), `POST /quiz/assessment/submit` hits a different process or container, throwing a `404 Assessment session not found`.
* **Client-Dictated Gate Scoring Security Flaw:** In `backend/src/routes/level.py`:
  * The frontend client submits `answers: list[AnswerItem]` where each item contains `correct: bool`.
  * The backend computes the gate score directly from the client's `correct` flag! Any client can tamper with the payload to pass every level without knowing the answers.
* **Unused Redis & Email Services:** Redis is specified in dependencies and `config.py` (`REDIS_URL`), but never connected. Resend API key is present in settings, but no re-engagement worker or emailing script exists.

### 3.3. Frontend & User Experience
* **Dashboard Split & Broken Redirects:**
  * User logs in via Google OAuth → Supabase redirects to `/auth/callback`.
  * `auth/callback/route.ts` explicitly redirects to `/dashboard`.
  * `frontend/app/(dashboard)/dashboard/page.tsx` renders a placeholder: *"Feature 27 will build this on Day 5"*.
  * The actual working dashboard is at `app/(dashboard)/page.tsx` (the `/` route).
* **Hardcoded Mock Data in Dashboard:**
  * In `frontend/app/(dashboard)/page.tsx`, `MOCK_SESSIONS` and `MOCK_STATS` are displayed. Real Supabase queries are commented out with `// Swap for real Supabase query after Integration Sync #2`.
* **Mocked Sublevel Decision:**
  * In `frontend/lib/api.ts`, `submitSublevelDecision` simulates a network call with `setTimeout(..., 400)` and returns fake state, never calling the backend route `/sublevel/decision`.
* **Static Single-Skill Gate Questions:**
  * `frontend/components/features/GateTest.tsx` hardcodes 4 Python-specific questions for Level 0. If a user selects "UI/UX Design" or "Data Analysis" or reaches Level 2, the gate test still shows the same hardcoded Python questions.
* **Empty Placeholder Pages:**
  * `/leaderboard` and `/completion` are empty stubs with `"coming soon"`.
* **Malformed Env Var:**
  * In `frontend/.env.local`, `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000, https://nexus-production-dec7.up.railway.app/`.
  * In `useAssessmentStream.ts`, the URL is interpolated directly without parsing the comma: `${process.env.NEXT_PUBLIC_BACKEND_URL}/stream/assessment...`.

### 3.4. Database & Schemas
* Supabase migration `001_initial.sql` defines 5 tables: `skill_sessions`, `roadmaps`, `test_history`, `user_stats`, `feature_flags`.
* **Gaps:**
  * No table for storing dynamically generated gate test question banks per level/skill.
  * No table for sublevel roadmaps (sublevel progress is stored nowhere in Postgres).
  * User achievements and leaderboard rankings cannot be queried efficiently without aggregate views or indexing on `user_stats.points`.

---

## 4. Current Status Matrix

| Component / Feature | Intended Functionality | Current Implementation Status | Criticality |
|---|---|---|---|
| **Personality Quiz** | Capture learner style & persist | ✅ Fully functional (persists to `user_stats`) | Low |
| **Adaptive Assessment** | Stream 6 dynamic questions, adjust difficulty | ⚠️ Functional locally; breaks in multi-worker production due to in-memory dict | High |
| **Roadmap Generation** | Dual SSE stream (prose + Pydantic JSON) | ✅ Working (Gemini / NVIDIA NIM fallback) | Medium |
| **Roadmap Regeneration** | Max 2 edits via prompt injection | ✅ Functional (guarded by counter & lock state) | Low |
| **LangGraph Orchestration** | Unified StateGraph with checkpoints | ❌ Broken / Bypassed (all nodes called as loose functions; stubs in graph) | High |
| **Gate Tests** | Validate level mastery & unlock next | ❌ Static questions only (Python L0); client-dictated correctness; no dynamic questions | High |
| **Adaptive Sublevel** | AI mini-roadmap on test failure | ❌ Dormant in backend; mock in frontend; static page in UI | High |
| **User Dashboard** | Multi-skill view, progress, streak | ⚠️ UI exists at `/` but populated with hardcoded mock data; `/dashboard` is a stub | High |
| **Gamification** | Points, badges, streak calculation | ⚠️ Node exists; UI displays hardcoded badges/points in dashboard | Medium |
| **Leaderboard** | Global learner rankings | ❌ Stub only ("coming soon") | Medium |
| **Completion Flow** | Capstone celebration & next-step recommendations | ❌ Stub only ("coming soon") | Medium |
| **Re-engagement Emails** | Inactivity detection + AI drafted email | ❌ Completely unbuilt | Low |

---

## 5. Comprehensive Upgrade Roadmap

To upgrade this project from a fragile hackathon proof-of-concept into a robust, production-grade adaptive platform, the following upgrade phases are recommended:

### Phase 1: Critical Fixes & Unification (Immediate)
1. **Fix Environment & URLs:**
   * Clean `frontend/.env.local` to specify a single backend URL (`http://localhost:8000` for dev, single domain for prod).
   * Update `frontend/lib/api.ts` and `useAssessmentStream.ts` to share a unified API client.
2. **Resolve Route Split:**
   * Move or alias `app/(dashboard)/page.tsx` so `/dashboard` serves the real dashboard UI, or update `auth/callback` to redirect to `/`.
3. **Connect Real Dashboard Data:**
   * Replace `MOCK_SESSIONS` and `MOCK_STATS` in `app/(dashboard)/page.tsx` with live Supabase queries fetching `skill_sessions`, `roadmaps`, and `user_stats`.

### Phase 2: Core Learning Engine Hardening
4. **Dynamic AI-Generated Gate Tests:**
   * Build backend endpoint `GET /level/{level_id}/gate-questions` that generates/fetches 4-5 questions tailored to the specific skill and level concepts using LLM.
   * Server-side answer verification: client sends chosen option IDs, server verifies against truth key and computes score.
5. **Activate the Adaptive Sublevel Loop:**
   * Wire `adaptive_sublevel.py` into `sublevel_router` (`POST /sublevel/generate`).
   * Connect `SubLevelModal.tsx` and `/sublevel` page to fetch and render the live mini-roadmap.
   * Connect `submitSublevelDecision` in `frontend/lib/api.ts` to the real `POST /sublevel/decision` endpoint.
6. **State & Session Persistence (Redis):**
   * Move `_assessment_sessions` from memory in `routes/quiz.py` to Redis (or Supabase session table) with TTL, replacing the sleep loop with async pub/sub or event-driven webhook patterns.

### Phase 3: Architecture & Workflow Upgrades
7. **True LangGraph Pipeline or Clean State Machine:**
   * Either register the real node functions in `graph.py` and execute them via `graph.ainvoke()` / `graph.astream()` with thread IDs, OR formally refactor the backend into a clean modular service pipeline.
8. **Update Model Identifiers:**
   * Verify and update `MODEL_ROUTING` in `config.py` to supported production model tags (e.g. `gemini-1.5-flash` or `gemini-2.0-flash`).

### Phase 4: Missing Feature Completion
9. **Leaderboard Page:** Implement global rankings query on `user_stats` sorted by points, with tiers (Bronze, Silver, Gold, Diamond).
10. **Completion Page & Certificate/Export:** Render dynamic course completion summary, badge showcase, and next-skill recommendations.
11. **Inactivity Re-engagement Worker:** A background task (using Redis + Celery/ARQ/cron) checking users inactive > 3 days and dispatching re-engagement emails via Resend.
