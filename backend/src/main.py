"""
backend/src/main.py

FastAPI entry point for the Nexus backend.

- Lifespan context manager: initialises the LangGraph checkpointer on startup,
  cleans up on shutdown.
- ENV=development -> AsyncSqliteSaver (local file, graph state survives restarts)
- ENV=production  -> Supabase Postgres checkpointer (swapped on Day 6)
- GET /health -> {"status": "ok"} smoke-test endpoint
- CORS origins read from settings.ALLOWED_ORIGINS (comma-separated) so the
  Vercel production domain can be added without touching code — Railway env
  var only.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from src.routes.roadmap import router as roadmap_router
from fastapi.middleware.cors import CORSMiddleware
from src.routes.user import router as user_router
from src.routes.level import router as level_router
from src.routes.sublevel import router as sublevel_router
from src.routes import session as session_routes
from src.routes import quiz as quiz_routes
from src.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: create the LangGraph checkpointer and stash it on app.state.
    Shutdown: close any open connections cleanly.
    """
    checkpointer_ctx = None

    if settings.ENV == "production":
        # Day 6: Supabase Postgres checkpointer using settings.POSTGRES_URL
        # NOTE: POSTGRES_URL must be the Supabase POOLER url (port 6543),
        # not the direct connection (5432) — direct connections exhaust
        # fast under Railway's instance scaling.
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        checkpointer_ctx = AsyncPostgresSaver.from_conn_string(settings.POSTGRES_URL)
        checkpointer = await checkpointer_ctx.__aenter__()
        await checkpointer.setup()
    else:
        # Local dev: SQLite checkpointer, state survives restarts
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

        checkpointer_ctx = AsyncSqliteSaver.from_conn_string("checkpoints.sqlite")
        checkpointer = await checkpointer_ctx.__aenter__()

    app.state.checkpointer = checkpointer
    app.state.checkpointer_ctx = checkpointer_ctx

    try:
        yield
    finally:
        if checkpointer_ctx is not None:
            await checkpointer_ctx.__aexit__(None, None, None)


app = FastAPI(title="Nexus Backend", version="0.1.0", lifespan=lifespan)

# CORS — origins come from settings.ALLOWED_ORIGINS (comma-separated string
# parsed in config.py). Local default is just localhost:3000; Railway prod
# var should be set to "http://localhost:3000,https://nexus.vercel.app"
# once Feature 30 (Vercel deploy) is live.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Basic liveness check. Returns immediately, no DB/LLM calls."""
    return {"status": "ok"}


# Routers
app.include_router(roadmap_router)
app.include_router(user_router)
app.include_router(level_router)
app.include_router(sublevel_router)
app.include_router(session_routes.router)
app.include_router(quiz_routes.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
