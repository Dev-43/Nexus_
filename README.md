# Nexus — AI-Powered Adaptive Learning Platform

> **USAII Global AI Hackathon 2026 · Undergraduate Track**  
> *Challenge Brief 3: "Build the Second Brain for Real Life" — Direction B (Zero-to-One Builder)*

Nexus transforms an ambiguous skill goal into an interactive, personalised learning journey — and immediately adapts the curriculum whenever you provide feedback or stumble on a concept.

- 🌐 **Live Web App:** [https://nexus-kappa-three-48.vercel.app/](https://nexus-kappa-three-48.vercel.app/)
- ⚡ **Backend API Service:** [https://nexus-2qcw.onrender.com](https://nexus-2qcw.onrender.com) (Health: [`/health`](https://nexus-2qcw.onrender.com/health))
- 🗄️ **Database & Auth:** Supabase PostgreSQL + Google OAuth

---

## Key Features

1. **Adaptive Initial Assessment**  
   Dynamically adjusts question difficulty in real time based on learner accuracy. Rather than relying on self-reported competence, Nexus discovers your baseline level through active dialogue.

2. **Cognitive & Personality Profiling**  
   Captures learning style (theoretical vs. project-driven, pacing preference) prior to roadmap generation, tailoring tone and format to individual learning styles.

3. **Live Streaming AI Roadmap Generation**  
   Curriculum structures stream token-by-token over Server-Sent Events (SSE), dynamically synthesized from your assessment results and cognitive profile.

4. **Human-in-the-Loop Roadmap Regeneration**  
   If the proposed curriculum doesn't match your goals, correct it in natural language (e.g., *"Focus more on asynchronous concurrency and less on basic syntax"*). Nexus rebuilds the curriculum live with strict safeguards (max 2 regenerations).

5. **Adaptive Gate Tests & Level Locking**  
   Mastery checks at the conclusion of each level ensure retention. Levels unlock sequentially to maintain learning momentum.

6. **Targeted Sublevel Remediation**  
   When a learner fails a gate test, Nexus analyzes error history (`test_history`), identifies recurring concept gaps, and suggests a targeted mini-roadmap (sublevel) to bridge weaknesses before re-testing.

7. **Gamification & Progression**  
   Track XP, streaks, level-specific badges, and progression tiers (Beginner → Intermediate → Advanced).

8. **True Black OLED UI**  
   Engineered with an ultra-clean True Black theme (`#000000`, `#090A0F`) paired with vivid electric accents (Electric Cobalt `#3B82F6`, Emerald `#10B981`, Amber `#F59E0B`, Ruby `#EF4444`).

---

## System Architecture

```
nexus/
├── backend/                  FastAPI + LangGraph (Python 3.12+)
│   └── src/
│       ├── graph/            9-node StateGraph orchestration
│       │   ├── router_node.py          Flow control & next_action routing
│       │   ├── error_handler.py        Self-healing & graceful error recovery
│       │   ├── personality_quiz.py     Learning style profiling
│       │   ├── skill_assessment.py     Adaptive quiz logic & scoring
│       │   ├── roadmap_generator.py    Pydantic-validated curriculum generation
│       │   ├── level_gate.py           Gate test scoring & progression gating
│       │   ├── adaptive_sublevel.py    Concept gap analysis & mini-roadmaps
│       │   ├── rejection_handler.py    Sublevel offer & bypass flow
│       │   └── gamification.py         XP, streaks, and badge awards
│       ├── routes/           REST & SSE endpoints (/stream/*, /roadmap/*, /levels/*)
│       ├── services/         model_router.py (multi-model), rate_limiter.py (40 RPM proxy)
│       ├── models/           Pydantic schemas (Roadmap, Level, Resource, Question)
│       └── config.py         Centralized settings & MODEL_ROUTING configuration
│
└── frontend/                 Next.js 14 App Router (TypeScript)
    ├── app/                  (auth), (dashboard), onboarding, quiz, roadmap, level pages
    ├── components/           True Black UI kit, features (GateTest, Roadmap, Quiz)
    ├── design/               Design tokens & color palettes
    └── lib/                  Supabase client, typed API client, SSE streaming hooks
```

### AI Graph Orchestration Flow

```
[Start Session]
       │
       ▼
[Personality Quiz] ────────► [Adaptive Assessment]
                                     │
                                     ▼
                            [Roadmap Generator] ◄─── (Feedback / Re-generate)
                                     │
                                     ▼
                              [Level Content]
                                     │
                                     ▼
                              [Gate Testing]
                                ┌────┴────┐
                             (Pass)    (Fail)
                                │         │
                                │         ▼
                                │   [Gap Analysis & Sublevel]
                                │         │
                                └────►[Gamification]
                                          │
                                          ▼
                                    [Completion]
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | FastAPI, LangGraph (`StateGraph`), Pydantic v2, Python 3.12+ |
| **Database & Auth** | Supabase (PostgreSQL with RLS), Supabase Auth (Google OAuth) |
| **Primary LLM Provider** | NVIDIA NIM (`nvidia/nemotron-3.5-lightning-30b-a3b` or custom via `NVIDIA_MODEL`) |
| **Rate Limiting** | Custom 40 RPM sliding-window rate limiter (`SlidingWindowRateLimiter`) |
| **Fallback LLM Provider**| Google Gemini (`gemini-3.8-flash`) + offline deterministic fallback handlers |
| **Streaming** | Server-Sent Events (SSE) with `EventSource` and chunk reconnection |
| **Deployments** | **Vercel** (Frontend) · **Render** (Backend Docker/Python with automated CI/CD) |

---

## Multi-Model Routing & Rate Limiting

Nexus abstracts all model invocations through `model_router.get_model(task_type)`. Tasks route according to model capability and quota profiles:

```python
MODEL_ROUTING = {
    "roadmap_generation": "nvidia/nemotron-3.5-lightning-30b-a3b",  # Primary roadmap generation
    "quiz_generation":    "nvidia/nemotron-3.5-lightning-30b-a3b",  # Adaptive questions
    "gap_analysis":       "nvidia/nemotron-3.5-lightning-30b-a3b",  # Reasoning over test history
    "email_content":      "nvidia/nemotron-3.5-lightning-30b-a3b",  # Re-engagement notifications
    "fallback":           "gemini-3.8-flash",                       # High-reliability fallback
}
```

### 40 RPM Sliding-Window Rate Limiter
To strictly adhere to NVIDIA NIM developer tier constraints:
- In-memory `SlidingWindowRateLimiter` enforces a hard cap of **40 requests per rolling 60-second window**.
- Transparent `RateLimitedLLM` proxy intercepts synchronous (`invoke`, `stream`) and asynchronous (`ainvoke`, `astream`) calls, queuing calls gracefully if the quota ceiling is approached.
- Automatic failover switches to `gemini-3.8-flash` or internal fallback scaffolds if the upstream LLM encounters an unresolvable error (e.g., HTTP 403, 410, or 503).

---

## Local Development Setup

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env         # Populate required API keys
uvicorn src.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
pnpm install
cp .env.example .env.local   # Populate Supabase and Backend URLs
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

### `backend/.env`
```ini
PORT=8000
ENV=development                                    # development | production
ALLOWED_ORIGINS=http://localhost:3000,https://nexus-kappa-three-48.vercel.app

# Supabase / Postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
POSTGRES_URL=postgresql://postgres.<project-ref>:<password>@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres

# LLM Providers
GOOGLE_API_KEY=<google-gemini-key>
NVIDIA_API_KEY=<nvidia-nim-nvapi-key>
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b # Customizable NVIDIA model
NVIDIA_RPM=40                                      # Rate limit ceiling (RPM)

# Observability (Optional)
LANGCHAIN_TRACING_V2=false
LANGCHAIN_PROJECT=nexus-dev
LANGCHAIN_API_KEY=
```

### `frontend/.env.local`
```ini
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_BACKEND_URL=https://nexus-2qcw.onrender.com  # Or http://localhost:8000 for local dev
```

---

## Automated Test Suite

The backend contains **146 unit and integration tests** testing graph transitions, rate limiting, and route guards.

```bash
cd backend
pytest tests
```

```
====================== 146 passed in 10.57s ======================
```

---

## Responsible AI & Guardrails

- **Human Agency:** Nexus provides structured roadmaps as customizable starting points, not authoritative mandates. Learners retain agency to modify, bypass, or re-prompt curricula.
- **Fail-Safe Design:** When LLM endpoints experience rate limits or network issues, the application never crashes — it activates deterministic fallback questions and default schemas.
- **Regeneration Limits:** Roadmap regenerations are capped at 2 per session to maintain pedagogical coherence and prevent runaway compute consumption.
- **Transparent Progress:** Concept gaps and test scores are displayed transparently before any sublevel is assigned.

---

## License

Distributed under the [MIT License](LICENSE).
