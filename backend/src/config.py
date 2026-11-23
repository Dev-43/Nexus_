"""
backend/src/config.py
Central configuration for Nexus backend.
- Settings: pydantic-settings class that reads from .env
- MODEL_ROUTING: single source of truth for which LLM handles which task type.
  Nodes never hardcode a model name — they call model_router.get_model(task_type),
  which reads this dict. Changing a model = one line change here, zero node changes.
"""
from functools import lru_cache
from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """
    Application settings, loaded from environment variables / .env file.
    """
    model_config = SettingsConfigDict(
        env_file=(_ENV_FILE, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )
    # --- App ---
    PORT: int = 8000
    ENV: Literal["development", "production"] = "development"
    SECRET_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://nexus-kappa-three-48.vercel.app"  # comma-separated, parsed via settings.allowed_origins_list
    # --- Supabase / Postgres ---
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    POSTGRES_URL: str = ""
    # --- LLM providers ---
    GOOGLE_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "nvidia/nemotron-3.5-lightning-30b-a3b"
    NVIDIA_RPM: int = 40
    # --- LangSmith / LangChain tracing ---
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_PROJECT: str = "nexus-dev"
    LANGCHAIN_API_KEY: str = ""
    # --- Redis / Email ---
    REDIS_URL: str = "redis://localhost:6379"
    RESEND_API_KEY: str = ""
    # --- Feature flags / overrides ---
    USE_FALLBACK_LLM: bool = False

    @property
    def allowed_origins_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton)."""
    return Settings()


# ---------------------------------------------------------------------------
# MODEL_ROUTING
#
# Maps task_type (set by nodes on NexusState.task_type) -> model identifier.
# model_router.get_model(task_type) reads this dict and returns the correct
# LangChain chat model instance (ChatGoogleGenerativeAI or ChatOpenAI).
#
# To change which model handles a task: edit the string value here only.
# ---------------------------------------------------------------------------
_NVIDIA_MAIN = "nvidia/nemotron-3.5-lightning-30b-a3b"

MODEL_ROUTING: dict[str, str] = {
    "roadmap_generation": _NVIDIA_MAIN,                         # NVIDIA NIM (primary roadmap generation)
    "quiz_generation": _NVIDIA_MAIN,                            # NVIDIA NIM (adaptive questions)
    "gap_analysis": _NVIDIA_MAIN,                               # NVIDIA NIM (deep reasoning over test_history)
    "email_content": _NVIDIA_MAIN,                              # NVIDIA NIM (tone & speed)
    "fallback": "gemini-3.8-flash",                             # High-reliability fallback
}
