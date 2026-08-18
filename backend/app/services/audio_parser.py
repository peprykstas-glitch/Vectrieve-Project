"""
Audio & Video Parser and Speech-to-Text Pipeline (Phase 6).

Capabilities:
1. Supports audio formats: .mp3, .wav, .m4a, .ogg, .flac, .aac, .wma
2. Supports video formats: .mp4, .mov, .mkv, .webm, .avi
3. Automatically extracts audio track from video files using ffmpeg / moviepy fallback.
4. Transcribes speech via Groq Whisper API (whisper-large-v3) with timestamped segments.
5. Generates structured semantic chunks with time markers for vector search in Qdrant & PostgreSQL.
"""

import os
import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional
import httpx
from core.config import settings

AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma"}
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
MEDIA_EXTENSIONS = AUDIO_EXTENSIONS.union(VIDEO_EXTENSIONS)


def is_media_file(filename: str) -> bool:
    """Check if the filename has an audio or video extension."""
    suffix = Path(filename).suffix.lower()
    return suffix in MEDIA_EXTENSIONS


def is_video_file(filename: str) -> bool:
    """Check if the filename is a video file."""
    suffix = Path(filename).suffix.lower()
    return suffix in VIDEO_EXTENSIONS


class MediaPayload:
    def __init__(self, file_path: Path, filename: str):
        self.file_path = file_path
        self.filename = filename


def extract_audio_track(file_path: Path, filename: str) -> Path:
    """
    Extract an audio stream from video (or return original path if already audio).
    Uses ffmpeg to convert to 16kHz mono MP3 for optimal Whisper transcription speed and size.
    """
    if not is_video_file(filename):
        return file_path

    out_temp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    out_path = Path(out_temp.name)
    out_temp.close()

    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(file_path),
            "-vn",                      # No video
            "-acodec", "libmp3lame",    # MP3 codec
            "-ar", "16000",             # 16kHz sample rate (Whisper native)
            "-ac", "1",                 # Mono
            "-b:a", "64k",              # Compact bitrate
            str(out_path)
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if result.returncode == 0 and out_path.exists() and out_path.stat().st_size > 0:
            print(f"🎬 Successfully extracted audio track from video: {filename} ({out_path.stat().st_size} bytes)")
            return out_path
    except Exception as ex:
        print(f"⚠️ ffmpeg extraction failed for {filename}: {ex}. Trying direct pass-through...")

    return file_path


async def transcribe_media_async(file_path: Path, filename: str) -> str:
    """
    Transcribes audio/video file using Groq Whisper API (whisper-large-v3).
    Returns formatted markdown transcript with timestamps.
    """
    audio_path = extract_audio_track(file_path, filename)
    groq_api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")

    if not groq_api_key:
        return f"# Media Transcript: {filename}\n\n[Warning: GROQ_API_KEY is not configured. Transcription unavailable.]"

    try:
        # Groq Whisper API accepts up to 25MB audio files
        file_size = audio_path.stat().st_size
        if file_size == 0:
            return f"# Media Transcript: {filename}\n\n[Empty media file]"

        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        async with httpx.AsyncClient(timeout=180.0) as client:
            files = {
                "file": (audio_path.name, audio_bytes, "audio/mpeg")
            }
            data = {
                "model": "whisper-large-v3",
                "response_format": "verbose_json",
                "temperature": "0.0"
            }
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {groq_api_key}"},
                files=files,
                data=data
            )

            if response.status_code != 200:
                print(f"[Whisper] Transcription failed ({response.status_code}): {response.text}")
                return f"# Media Transcript: {filename}\n\n[Transcription failed: HTTP {response.status_code}]"

            res_json = response.json()
            full_text = res_json.get("text", "").strip()
            segments = res_json.get("segments", [])

            if not segments:
                return f"# Media Transcript: {filename}\n\n{full_text}"

            # Format formatted transcript with timestamps
            transcript_lines = [
                f"# Media Transcript: {filename}",
                f"**Type:** {'Video Recording' if is_video_file(filename) else 'Audio Recording'}",
                f"**Language:** {res_json.get('language', 'auto').upper()} | **Duration:** {res_json.get('duration', 0):.1f}s",
                "---",
                ""
            ]

            for seg in segments:
                start_sec = int(seg.get("start", 0))
                m, s = divmod(start_sec, 60)
                h, m = divmod(m, 60)
                time_str = f"[{h:02d}:{m:02d}:{s:02d}]" if h > 0 else f"[{m:02d}:{s:02d}]"
                text_seg = seg.get("text", "").strip()
                if text_seg:
                    transcript_lines.append(f"**{time_str}** {text_seg}")

            return "\n\n".join(transcript_lines)

    except Exception as ex:
        print(f"[Whisper] Error processing {filename}: {ex}")
        return f"# Media Transcript: {filename}\n\n[Error processing audio track: {str(ex)}]"
    finally:
        # Clean up temporary extracted audio file if different from original
        if audio_path != file_path and audio_path.exists():
            try:
                audio_path.unlink()
            except Exception:
                pass


async def extract_meeting_action_items_async(
    transcript_text: str,
    filename: str,
    custom_api_key: Optional[str] = None
) -> str:
    """
    Analyzes meeting transcript using Groq LLaMA 3.3 70B to extract:
    1. Executive Summary & Objective
    2. Key Decisions Agreed Upon
    3. Action Items & Assignees
    4. Open Questions / Next Steps
    """
    groq_api_key = custom_api_key if custom_api_key is not None else (settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", ""))
    if not groq_api_key:
        return "Executive briefing unavailable (GROQ_API_KEY not configured)."

    prompt = f"""You are an elite enterprise meeting intelligence analyst.
Analyze the following meeting transcript from "{filename}" and produce a structured executive report.

Requirements:
- Preserve the natural language of the meeting (if meeting was in Ukrainian, write report in Ukrainian; if Polish, in Polish; if Spanish, in Spanish; otherwise in English).
- Do NOT use emojis.
- Structure clearly with the following markdown headings:

### Executive Summary
A concise 2-3 sentence overview of the meeting's primary objective and outcome.

### Key Decisions
Bullet points of all agreed decisions and finalized conclusions.

### Action Items & Ownership
Bullet list of concrete tasks assigned during the meeting with assignees and context (e.g., "- [ ] Task description — Owner").

### Open Questions & Next Steps
Any unresolved questions or scheduled follow-ups.

Meeting Transcript:
{transcript_text[:12000]}
"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_api_key}"},
                json={
                    "model": "openai/gpt-oss-120b",
                    "messages": [
                        {"role": "system", "content": "You are a professional enterprise meeting intelligence assistant."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 1200
                }
            )
            if res.status_code == 200:
                data = res.json()
                return data["choices"][0]["message"]["content"].strip()
            return f"Failed to generate meeting intelligence: HTTP {res.status_code}"
    except Exception as e:
        return f"Error extracting meeting action items: {str(e)}"

