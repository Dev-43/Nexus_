"""
GET /user/stats — returns points, badges, streak_days for the authenticated user.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from src.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/user", tags=["user"])


class UserStatsResponse(BaseModel):
    user_id:     str
    points:      int
    badges:      list[str]
    streak_days: int
    last_active: str | None = None


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(user_id: str = Query(..., description="User UUID")):
    """Return gamification stats for a user. Creates a default row if none exists."""
    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("user_stats")
            .select("*")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if result and result.data:
            return UserStatsResponse(**result.data)

        # First visit — return defaults (row will be created on first action)
        return UserStatsResponse(
            user_id=user_id,
            points=0,
            badges=[],
            streak_days=0,
            last_active=datetime.now(timezone.utc).isoformat(),
        )

    except Exception as exc:
        logger.exception("Failed to fetch user stats: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch user stats")
