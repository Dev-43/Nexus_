"""
model_router.py

Multi-model routing. Nodes never hardcode a model name — they call
get_model(task_type) and receive an `llm` object back. Model assignment
is controlled entirely by MODEL_ROUTING in config.py.

If the primary model for a task_type fails to initialise, or task_type
is unknown, falls back to MODEL_ROUTING["fallback"].
"""

from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_nvidia_ai_endpoints import ChatNVIDIA

from src.config import get_settings, MODEL_ROUTING

settings = get_settings()


def _build_llm(model_name: str):
    """Instantiate the correct LangChain chat model object for a model name."""
    if model_name.startswith("gemini"):
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
        )
    if model_name.startswith("meta/llama"):  # fixed: was "metar/llama"
        return ChatNVIDIA(
            model=model_name,
            nvidia_api_key=settings.NVIDIA_API_KEY,
            temperature=0.7,
        )
    raise ValueError(f"Unknown model name in MODEL_ROUTING: {model_name}")


@lru_cache(maxsize=None)
def _get_cached_llm(model_name: str):
    return _build_llm(model_name)


def get_model(task_type: str):
    """
    Return the LangChain LLM object configured for the given task_type.

    Reads MODEL_ROUTING[task_type] from config.py. If task_type is not
    found, or the primary model fails to build, returns the fallback
    model (MODEL_ROUTING["fallback"]) instead — never raises.
    """
    model_name = MODEL_ROUTING.get(task_type, MODEL_ROUTING["fallback"])

    try:
        return _get_cached_llm(model_name)
    except Exception:
        fallback_name = MODEL_ROUTING["fallback"]
        return _get_cached_llm(fallback_name)

def get_fallback_model():
    """Explicit accessor for the fallback model — used when a primary model
    fails at call time (not just at init time), e.g. a 503 mid-stream."""
    return _get_cached_llm(MODEL_ROUTING["fallback"])