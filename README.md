# Nexus — AI-Powered Adaptive Learning Platform

> Built for USAII Global AI Hackathon 2026 · Undergraduate Track
> Challenge Brief 3: "Build the Second Brain for Real Life" — Direction B (Zero-to-One Builder)

Nexus turns a vague skill goal into a structured, personalised learning roadmap —
and rebuilds it the moment you tell it something's wrong.

**Live demo:** https://nexus-psi-smoky-72.vercel.app/
**Backend API:** nexus-production-dec7.up.railway.app

---

## What It Does

1. **Adaptive assessment** — adjusts question difficulty in real time based on
   how you answer. Doesn't ask your level, figures it out.
2. **Personality quiz** — captures learning style before the roadmap is built,
   so the path is shaped for how you think, not a generic student.
3. **AI roadmap generation** — streams live, token by token, personalised from
   both signals above.
4. **Roadmap regeneration** — if the roadmap doesn't feel right, correct it in
   plain English and watch it rebuild live. The system treats its own output
   as a starting point for dialogue, not a definitive answer.
5. **Adaptive gate tests** — pass/fail logic at the end of each level, with a
   targeted sublevel suggestion when you fall short.
6. **Points, badges, and progressive skill tiers** — Beginner → Intermediate →
   Advanced, with a real next-step prompt on completion.

---

## Architecture

```
nexus/
├── backend/          FastAPI + LangGraph (Python)
│   └── src/
│       ├── graph/    9-node StateGraph — router, error handler, quiz,
│       │             assessment, roadmap generator, level gate,
│       │             adaptive sublevel, rejection handler, gamification
│       ├── routes/   REST + SSE endpoints
│       ├── services/ model_router.py (multi-model routing), Supabase client
│       └── models/   Pydantic schemas (Roadmap, Level, Resource, Question)
│
└── frontend/         Next.js 14 App Router (TypeScript)
    ├── app/          Auth, dashboard, quiz, assessment, roadmap, level pages
    ├── components/    Reusable UI kit + feature components
    └── lib/           Supabase client, typed API wrappers, SSE hooks
```

**AI graph flow:** session start → personality quiz → adaptive assessment →
roadmap generation (streamed) → level content → gate test → (on fail) adaptive
sublevel suggestion → gamification → completion.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind |
| Backend | FastAPI, LangGraph (StateGraph orchestration) |
| Database | Supabase (Postgres) + Supabase Auth (Google OAuth) |
| Roadmap generation | Gemini 3.5 Flash (Pydantic-validated structured output) |
| Quiz generation, gap analysis, fallback | Llama 3.3 70B via NVIDIA NIM |
| Cache / session | Redis |
| Observability | LangSmith |
| Deployment | Vercel (frontend) · Railway (backend + Redis) |

### Multi-Model Routing

Different tasks route to different models based on what each is actually good
at — not one model doing everything:

```python
MODEL_ROUTING = {
    "roadmap_generation": "gemini-3.5-flash",            # structured output + Pydantic
    "quiz_generation":    "meta/llama-3.3-70b-instruct",  # fast, creative variation
    "gap_analysis":       "meta/llama-3.3-70b-instruct",  # reasoning over test history
    "fallback":           "meta/llama-3.3-70b-instruct",  # if Gemini is rate-limited
}
```

Gap analysis runs on NVIDIA NIM rather than Gemini specifically to conserve
Gemini's free-tier quota for the task that benefits most from it — roadmap
generation's structured output reliability.

---

## Responsible AI

**Risk identified:** over-reliance on the AI-generated roadmap as a "correct"
or authoritative learning path.

**Mitigation:** the roadmap regeneration feature lets the user correct the AI
in plain English, with the change streamed live so they see exactly what
changed. A visible regeneration counter (max 2 uses) keeps the system's limits
honest rather than implying unlimited authority.

**Human-in-the-loop:** Nexus never decides whether a user is ready to progress.
Gate test scores and concept gaps are shown transparently; the user decides
whether to accept a sublevel suggestion, try a different path, or move on.

---

## Local Setup

### Backend

```bash
cd backend
uv venv
uv pip install -e .
cp .env.example .env   # fill in your own keys — see below
uv run uvicorn src.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

### Required environment variables

**`backend/.env`**
```
ENV=development                  # development | production
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
POSTGRES_URL=                    # Supabase pooler URL, port 6543
GOOGLE_API_KEY=                  # aistudio.google.com — free tier
NVIDIA_API_KEY=                  # build.nvidia.com — free tier, nvapi- prefix
REDIS_URL=
LANGCHAIN_API_KEY=               # optional, for LangSmith tracing
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## Known Limitations

Documented honestly rather than left as silent gaps:

- **Gate test content is static**, not AI-generated. The adaptive *assessment*
  is AI-generated and difficulty-adjusted; gate tests check against fixed
  questions tied to each level's resources, by deliberate design — this keeps
  scoring consistent and fair rather than introducing per-attempt variance.
- **Adaptive sublevel content is currently static** rather than dynamically
  generated. The gap-identification logic (reading `test_history` to find
  the most-missed concept) is built; live mini-roadmap generation via the
  `adaptive_sublevel` node is a scoped next step, not yet wired into the
  live request path.
- **Gate test answer validation is currently client-reported.** Server-side
  re-verification of submitted answers against the source-of-truth answer key
  is a near-term hardening item.
- **Multi-skill dashboard** uses representative data while the underlying
  per-skill session list is finalised.

None of the above affect the core personalisation loop: adaptive assessment →
AI-generated roadmap → live regeneration → gate-tested progression → badges.

---

## What We'd Build Next

- Real-time adaptive sublevel generation (gap analysis → live mini-roadmap,
  architecture already scoped)
- Server-side gate test answer verification
- Real-time leaderboards across skills
- Inactivity re-engagement emails (queued via Redis, AI-drafted via NVIDIA NIM)

---

## AI Tools Disclosure

Built with assistance from Claude (Anthropic) for architecture planning, code
generation, and debugging, and Cursor for frontend component generation from
design specifications. Both disclosed per hackathon submission requirements.

---

## License

MIT
