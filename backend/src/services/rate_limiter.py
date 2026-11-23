"""
Rate limiter for LLM API calls.
Enforces RPM (requests per minute) constraints (e.g. 40 RPM for NVIDIA NIM).
Supports both sync and async calls and wraps LangChain LLMs transparently.
"""
import asyncio
import logging
import threading
import time
from collections import deque
from typing import Any

logger = logging.getLogger(__name__)


class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter ensuring at most `max_calls` calls
    within any rolling `period` seconds (default 40 calls per 60.0s = 40 RPM).
    Thread-safe and asyncio-safe.
    """

    def __init__(self, max_calls: int = 40, period: float = 60.0):
        self.max_calls = max_calls
        self.period = period
        self._timestamps: deque[float] = deque()
        self._async_lock = asyncio.Lock()
        self._sync_lock = threading.Lock()

    async def acquire_async(self) -> None:
        async with self._async_lock:
            while True:
                now = time.monotonic()
                while self._timestamps and self._timestamps[0] <= now - self.period:
                    self._timestamps.popleft()

                if len(self._timestamps) < self.max_calls:
                    self._timestamps.append(now)
                    return

                sleep_time = self.period - (now - self._timestamps[0]) + 0.05
                logger.warning(
                    f"NVIDIA Rate limit reached ({self.max_calls} RPM). Throttling for {sleep_time:.2f}s..."
                )
                await asyncio.sleep(max(sleep_time, 0.05))

    def acquire_sync(self) -> None:
        with self._sync_lock:
            while True:
                now = time.monotonic()
                while self._timestamps and self._timestamps[0] <= now - self.period:
                    self._timestamps.popleft()

                if len(self._timestamps) < self.max_calls:
                    self._timestamps.append(now)
                    return

                sleep_time = self.period - (now - self._timestamps[0]) + 0.05
                logger.warning(
                    f"NVIDIA Rate limit reached ({self.max_calls} RPM). Throttling for {sleep_time:.2f}s..."
                )
                time.sleep(max(sleep_time, 0.05))


class RateLimitedLLM:
    """
    Transparent proxy wrapping a LangChain LLM to enforce RPM rate limiting.
    Delegates all other method calls and attributes to the underlying LLM.
    """

    def __init__(self, llm: Any, rate_limiter: SlidingWindowRateLimiter):
        self._llm = llm
        self._limiter = rate_limiter

    def invoke(self, *args, **kwargs):
        self._limiter.acquire_sync()
        return self._llm.invoke(*args, **kwargs)

    async def ainvoke(self, *args, **kwargs):
        await self._limiter.acquire_async()
        return await self._llm.ainvoke(*args, **kwargs)

    def stream(self, *args, **kwargs):
        self._limiter.acquire_sync()
        return self._llm.stream(*args, **kwargs)

    async def astream(self, *args, **kwargs):
        await self._limiter.acquire_async()
        async for chunk in self._llm.astream(*args, **kwargs):
            yield chunk

    def with_structured_output(self, *args, **kwargs):
        structured = self._llm.with_structured_output(*args, **kwargs)
        return RateLimitedLLM(structured, self._limiter)

    def bind(self, *args, **kwargs):
        bound = self._llm.bind(*args, **kwargs)
        return RateLimitedLLM(bound, self._limiter)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._llm, name)
