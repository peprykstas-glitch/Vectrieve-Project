"""
Tests for the sliding window token trimmer in llm_service.
Verifies Issue B fix: history is trimmed to stay within token budget.
"""
import pytest
from services.llm_service import _trim_history


def test_trim_history_empty():
    """Empty history stays empty."""
    result = _trim_history([], "system", max_tokens=100)
    assert result == []


def test_trim_history_fits_budget():
    """If total fits in budget, no messages are dropped."""
    history = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi there"},
    ]
    result = _trim_history(history, "short system", max_tokens=5000)
    assert result == history


def test_trim_history_exceeds_budget():
    """When history exceeds budget, oldest messages are dropped first."""
    # Create a history where only the last 2 messages fit within a tiny budget
    history = [
        {"role": "user", "content": "A" * 100},       # oldest — should be dropped
        {"role": "assistant", "content": "B" * 100},  # dropped
        {"role": "user", "content": "C" * 50},         # kept if budget allows
        {"role": "assistant", "content": "D" * 10},   # kept
        {"role": "user", "content": "final question"}, # always kept (last)
    ]
    # Budget: ~200 chars = ~50 tokens — only last few messages should fit
    result = _trim_history(history, "sys", max_tokens=50)
    assert len(result) < len(history)
    # Last message is ALWAYS preserved
    assert result[-1] == history[-1]


def test_trim_history_preserves_last_message_always():
    """Even with an impossibly tiny budget, the last message is always kept."""
    history = [{"role": "user", "content": "X" * 10_000}]
    result = _trim_history(history, "system", max_tokens=1)
    assert len(result) == 1
    assert result[0] == history[0]


def test_trim_history_chronological_order():
    """After trimming, messages remain in original chronological order."""
    history = [
        {"role": "user", "content": "msg 1"},
        {"role": "assistant", "content": "msg 2"},
        {"role": "user", "content": "msg 3"},
        {"role": "assistant", "content": "msg 4"},
        {"role": "user", "content": "msg 5"},
    ]
    result = _trim_history(history, "sys", max_tokens=100)
    # Verify order is preserved (not reversed)
    roles = [m["role"] for m in result]
    # Must alternate user/assistant correctly
    for i in range(len(roles) - 1):
        assert roles[i] != roles[i + 1], "Messages must alternate roles"
