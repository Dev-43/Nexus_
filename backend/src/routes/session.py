from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.services.supabase_client import get_supabase_client

router = APIRouter()


class SessionStartRequest(BaseModel):
    user_id: str
    skill_name: str
    skill_level: str | None = "beginner"
    skip_assessment: bool = False


class SessionStartResponse(BaseModel):
    session_id: str
    skill_name: str
    skill_level: str
    skip_assessment: bool


@router.post("/session/start", response_model=SessionStartResponse)
async def start_session(payload: SessionStartRequest):
    supabase = get_supabase_client()

    insert_data = {
        "user_id": payload.user_id,
        "skill_name": payload.skill_name,
        "skill_score": 0.0,
        "skill_level": payload.skill_level or "beginner",
        "personality_profile": None,
        "quiz_skipped": False,
        "status": "active",
    }

    try:
        result = supabase.table("skill_sessions").insert(insert_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {e}")

    if not result.data:
        raise HTTPException(status_code=500, detail="Session insert returned no data")

    row = result.data[0]
    return SessionStartResponse(
        session_id=row["id"],
        skill_name=row["skill_name"],
        skill_level=row["skill_level"],
        skip_assessment=payload.skip_assessment,
    )
