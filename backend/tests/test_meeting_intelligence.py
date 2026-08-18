import pytest
from httpx import Response
from unittest.mock import AsyncMock, patch
from services.audio_parser import (
    is_media_file,
    is_video_file,
    extract_meeting_action_items_async,
)


def test_media_file_detection():
    """Verify audio and video extensions are properly identified."""
    assert is_media_file("team_sync_2026.mp3") is True
    assert is_media_file("q3_planning.m4a") is True
    assert is_media_file("standup_recording.wav") is True
    assert is_media_file("all_hands_meeting.mp4") is True
    assert is_media_file("client_demo.mov") is True
    assert is_media_file("architecture_review.webm") is True

    # Non-media files
    assert is_media_file("financial_report.pdf") is False
    assert is_media_file("schema.docx") is False
    assert is_media_file("dataset.csv") is False


def test_video_file_detection():
    """Verify video extensions are distinguished from audio."""
    assert is_video_file("meeting.mp4") is True
    assert is_video_file("zoom.mov") is True
    assert is_video_file("recording.webm") is True
    assert is_video_file("audio.mp3") is False
    assert is_video_file("audio.wav") is False


@pytest.mark.asyncio
async def test_extract_meeting_action_items():
    """Verify action items & decisions extraction from a transcript using GPT-OSS 120B."""
    sample_transcript = """
# Media Transcript: board_meeting_august.mp3
**[00:05]** Stas: Welcome everyone. Today we decide on the Q3 server infrastructure budget.
**[01:15]** Alex: I propose we allocate $150/month for VPS and Qdrant scaling.
**[02:30]** Stas: Agreed. Decision is finalized: $150 budget approved.
**[03:10]** Stas: Alex, please set up automated backup snapshots by Friday.
**[04:00]** Alex: Got it, I will handle backups by Friday.
"""

    mock_client = AsyncMock()
    mock_client.post.return_value = Response(200, json={
        "choices": [{
            "message": {
                "content": "### Executive Summary\nThe board approved a $150/month infrastructure budget.\n\n### Key Decisions\n- $150/month budget finalized.\n\n### Action Items & Ownership\n- [ ] Set up automated backup snapshots — Alex (Deadline: Friday)"
            }
        }]
    })
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("services.audio_parser.httpx.AsyncClient", return_value=mock_client):
        result = await extract_meeting_action_items_async(
            sample_transcript,
            "board_meeting_august.mp3",
            custom_api_key="gsk_test_key_123"
        )
        assert "### Executive Summary" in result
        assert "Key Decisions" in result
        assert "Action Items & Ownership" in result
        assert "Alex" in result


@pytest.mark.asyncio
async def test_extract_meeting_action_items_missing_key():
    """Verify clean fallback when no API key is provided."""
    with patch("services.audio_parser.settings.GROQ_API_KEY", ""):
        result = await extract_meeting_action_items_async("some text", "test.mp3", custom_api_key="")
        assert "unavailable" in result.lower()
