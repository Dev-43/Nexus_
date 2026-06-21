"""
backend/scripts/setup_checkpointer.py

One-time script: creates the LangGraph checkpoint tables in Supabase Postgres.
Run this manually, once, from a local machine pointed at production POSTGRES_URL.

Why this is separate from main.py's lifespan:
Calling checkpointer.setup() on every Railway container boot causes a
psycopg.errors.DuplicatePreparedStatement crash loop under Supavisor's
connection pooling (psycopg's client-side prepared-statement cache can
disagree with a reused pooled connection's server-side state). The fix is
to create the tables exactly once, here, then never call .setup() again
in the actual running app (see main.py's production branch).

Usage:
    cd backend
    # ensure backend/.env has ENV=production and the real POSTGRES_URL set
    uv run python -m scripts.setup_checkpointer
"""
import asyncio
import sys

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from src.config import get_settings


async def main():
    settings = get_settings()
    async with AsyncPostgresSaver.from_conn_string(settings.POSTGRES_URL) as checkpointer:
        await checkpointer.setup()
    print("Checkpoint tables created successfully.")


if __name__ == "__main__":
    # Windows defaults to ProactorEventLoop, which psycopg's async mode
    # cannot use. Swap to SelectorEventLoop for this script only.
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
