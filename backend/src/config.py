"""
backend/src/config.py
Central configuration for Nexus backend.
- Settings: pydantic-settings class that reads from .env
- MODEL_ROUTING: single source of truth for which LLM handles which task type.
  Nodes never hardcode a model name — they call model_router.get_model(task_type),
  which reads this dict. Changing a model = one line change here, zero node changes.
"""
from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings, loaded from environment variables / .env file.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    # --- App ---
    PORT: int = 8000
    ENV: Literal["development", "production"] = "development"
    SECRET_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:3000"  # comma-separated, parsed via settings.allowed_origins_list
    # --- Supabase / Postgres ---
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    POSTGRES_URL: str = ""
    # --- LLM providers ---
    GOOGLE_API_KEY: str = ""
    NVIDIA_API_KEY: str = ""
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
        """Split ALLOWED_ORIGINS into a list, stripping whitespace per entry."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


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
MODEL_ROUTING: dict[str, str] = {
    "roadmap_generation": "gemini-3.5-flash",   # long structured output + Pydantic
    "quiz_generation": "meta/llama-3.3-70b-instruct",           # creative variation, fast
    "gap_analysis": "meta/llama-3.3-70b-instruct",           # reasoning over test_history
    "email_content": "meta/llama-3.3-70b-instruct",             # tone + writing quality
    "fallback": "meta/llama-3.3-70b-instruct",                  # if any primary model is down
}
