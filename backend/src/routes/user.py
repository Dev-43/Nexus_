from fastapi import APIRouter, Depends
from ..services.supabase_client import supabase

router = APIRouter()

@router.get("/user/stats")
#async def get_user_stats():
 #    # Hardcoded valid UUID for Day 3 sync testing
 #   # Replace with real Supabase Auth user_id on Day 5
  #  user_id = "00000000-0000-0000-0000-000000000001"
   # result = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()
    #if not result.data:
   #     defaults = {"user_id": user_id, "points": 0, "badges": [], "streak_days": 0}
    #    supabase.table("user_stats").insert(defaults).execute()
    #    return defaults
   # return result.data[0]

async def get_user_stats():
    # Day 3 sync: return hardcoded defaults, no DB write
    # Day 5: replace with real user_id from Supabase Auth session
    return {
        "user_id": "00000000-0000-0000-0000-000000000001",
        "points": 0,
        "badges": [],
        "streak_days": 0
    }