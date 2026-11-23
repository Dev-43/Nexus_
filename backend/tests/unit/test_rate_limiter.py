"""
Unit tests for SlidingWindowRateLimiter and RateLimitedLLM.
"""
import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.services.rate_limiter import SlidingWindowRateLimiter, RateLimitedLLM


def test_rate_limiter_sync_allows_under_limit():
    limiter = SlidingWindowRateLimiter(max_calls=5, period=1.0)
    start = time.monotonic()
    for _ in range(5):
        limiter.acquire_sync()
    duration = time.monotonic() - start
    assert duration < 0.2


def test_rate_limiter_sync_throttles_over_limit():
    limiter = SlidingWindowRateLimiter(max_calls=2, period=0.2)
    start = time.monotonic()
    limiter.acquire_sync()
    limiter.acquire_sync()
    # 3rd call must wait for the window to slide
    limiter.acquire_sync()
    duration = time.monotonic() - start
    assert duration >= 0.18


@pytest.mark.asyncio
async def test_rate_limiter_async_allows_under_limit():
    limiter = SlidingWindowRateLimiter(max_calls=5, period=1.0)
    start = time.monotonic()
    for _ in range(5):
        await limiter.acquire_async()
    duration = time.monotonic() - start
    assert duration < 0.2


@pytest.mark.asyncio
async def test_rate_limiter_async_throttles_over_limit():
    limiter = SlidingWindowRateLimiter(max_calls=2, period=0.2)
    start = time.monotonic()
    await limiter.acquire_async()
    await limiter.acquire_async()
    await limiter.acquire_async()
    duration = time.monotonic() - start
    assert duration >= 0.18


def test_rate_limited_llm_delegates():
    mock_llm = MagicMock()
    mock_llm.invoke.return_value = "response"
    limiter = SlidingWindowRateLimiter(max_calls=10, period=1.0)
    wrapper = RateLimitedLLM(mock_llm, limiter)

    res = wrapper.invoke("hello")
    assert res == "response"
    mock_llm.invoke.assert_called_once_with("hello")


@pytest.mark.asyncio
async def test_rate_limited_llm_ainvoke():
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value="async_response")
    limiter = SlidingWindowRateLimiter(max_calls=10, period=1.0)
    wrapper = RateLimitedLLM(mock_llm, limiter)

    res = await wrapper.ainvoke("hello")
    assert res == "async_response"
    mock_llm.ainvoke.assert_called_once_with("hello")
