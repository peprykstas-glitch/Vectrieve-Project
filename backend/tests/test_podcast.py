import pytest
import tempfile
from pathlib import Path
from httpx import AsyncClient
from unittest.mock import patch, MagicMock, AsyncMock

pytestmark = pytest.mark.asyncio

@pytest.fixture(autouse=True)
def temp_cache_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("api.endpoints.podcast.TTS_CACHE_DIR", Path(tmpdir)):
            yield

async def test_podcast_audio_edge_tts(client: AsyncClient):
    # Ensure ElevenLabs is disabled (empty key)
    with patch("api.endpoints.podcast.settings") as mock_settings:
        mock_settings.ELEVENLABS_API_KEY = ""
        mock_settings.ELEVENLABS_VOICE_MAX = "nPczCjzI2devNBz1zQrb"
        mock_settings.ELEVENLABS_VOICE_JULIA = "EXAVITQu4vr4xnSDxMaL"
        
        # We also mock edge_tts Communicate to prevent actual internet calls during test
        mock_comm = MagicMock()
        async def mock_stream():
            yield {"type": "audio", "data": b"fake-audio-chunk"}
        mock_comm.stream = mock_stream
        
        with patch("api.endpoints.podcast.edge_tts.Communicate", return_value=mock_comm) as mock_edge_comm:
            response = await client.get("/podcast/audio?text=Hello&host=Max&language=en")
            assert response.status_code == 200
            content = response.content
            assert content == b"fake-audio-chunk"
            mock_edge_comm.assert_called_once_with("Hello", "en-US-GuyNeural")

async def test_podcast_audio_elevenlabs_success(client: AsyncClient):
    # Enable ElevenLabs
    with patch("api.endpoints.podcast.settings") as mock_settings:
        mock_settings.ELEVENLABS_API_KEY = "fake-elevenlabs-key"
        mock_settings.ELEVENLABS_VOICE_MAX = "nPczCjzI2devNBz1zQrb"
        mock_settings.ELEVENLABS_VOICE_JULIA = "EXAVITQu4vr4xnSDxMaL"
        
        # Mock httpx client streaming
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        async def mock_aiter_bytes():
            yield b"elevenlabs-audio"
        mock_resp.aiter_bytes = mock_aiter_bytes
        
        # Mock client.stream context manager
        class MockStreamContext:
            async def __aenter__(self):
                return mock_resp
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass
                
        with patch("httpx.AsyncClient.stream", return_value=MockStreamContext()) as mock_stream:
            response = await client.get("/podcast/audio?text=Hello&host=Max&language=en")
            assert response.status_code == 200
            assert response.content == b"elevenlabs-audio"
            # Verify stream was called with ElevenLabs URL
            mock_stream.assert_called_once()
            args, kwargs = mock_stream.call_args
            assert "https://api.elevenlabs.io/v1/text-to-speech/nPczCjzI2devNBz1zQrb/stream" in args[1]

async def test_podcast_audio_elevenlabs_fallback_to_edge(client: AsyncClient):
    # Enable ElevenLabs but make it fail
    with patch("api.endpoints.podcast.settings") as mock_settings:
        mock_settings.ELEVENLABS_API_KEY = "fake-elevenlabs-key"
        mock_settings.ELEVENLABS_VOICE_MAX = "nPczCjzI2devNBz1zQrb"
        mock_settings.ELEVENLABS_VOICE_JULIA = "EXAVITQu4vr4xnSDxMaL"
        
        # Mock httpx client streaming to return error status
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.aread = AsyncMock(return_value=b"Unauthorized")
        
        class MockStreamContext:
            async def __aenter__(self):
                return mock_resp
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass
                
        # Mock edge_tts fallback Communicate
        mock_comm = MagicMock()
        async def mock_stream_fallback():
            yield {"type": "audio", "data": b"fallback-audio-chunk"}
        mock_comm.stream = mock_stream_fallback
        
        with patch("httpx.AsyncClient.stream", return_value=MockStreamContext()), \
             patch("api.endpoints.podcast.edge_tts.Communicate", return_value=mock_comm) as mock_edge_comm:
            response = await client.get("/podcast/audio?text=Hello&host=Max&language=en")
            assert response.status_code == 200
            assert response.content == b"fallback-audio-chunk"
            mock_edge_comm.assert_called_once_with("Hello", "en-US-GuyNeural")
