import os
import secrets
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict


class Settings(BaseSettings):
    # --- Project ---
    PROJECT_NAME: str = "Vectrieve AI"
    VERSION: str = "1.0.0"

    # --- Security & API Keys ---
    # WARNING: SECRET_KEY MUST be set via .env in production.
    # An empty default triggers auto-generation of a random key (dev only).
    SECRET_KEY: str = ""
    GROQ_API_KEY: str = ""
    ADMIN_EMAILS: str = ""
    SENTRY_DSN: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_MAX: str = "nPczCjzI2devNBz1zQrb"
    ELEVENLABS_VOICE_JULIA: str = "EXAVITQu4vr4xnSDxMaL"

    # --- Database (Qdrant) ---
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    COLLECTION_NAME: str = "Vectrieve_knowledge"

    # --- Reranker Settings ---
    RERANK_ENABLED: bool = True
    RERANKER_MODEL_NAME: str = "Xenova/ms-marco-MiniLM-L-6-v2"

    # --- AI Models ---
    MODEL_NAME: str = "openai/gpt-oss-120b"
    LOCAL_MODEL_NAME: str = "qwen2.5-coder:7b"
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"

    # --- Logging ---
    LOG_FILE: str = "analytics_log.csv"

    # --- Email & SMTP ---
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    # --- Logic ---
    THINKING_MODES: Dict[str, Dict[str, float | str]] = {
        "auditor": {
            "role": "You are a stringent, highly critical Data & Security Auditor for Vectrieve Core.",
            "instruction": (
                "Analyze the provided vector context meticulously. Adopt a direct, precise, and professional tone "
                "with a healthy dose of analytical cynicism (assess risks and quality realistically, not naively). "
                "Respond in the same language as the user's query (e.g., if they write in Polish, respond in Polish; "
                "if in Ukrainian, respond in Ukrainian). Provide the maximum concrete, highly structured, and "
                "complete information within this single turn so the user gets 100% of the answers they need instantly, "
                "without requiring follow-up questions. Always cite source filenames when making assertions. "
                "Grounding: The context lists files with headers like '=== Source File: <filename> ==='. If the user "
                "refers to 'the document', 'the presentation', or 'the code', map these terms to the specific source files. "
                "Linguistic Style: Crucially, if responding in Ukrainian or Polish, ensure absolute grammatical correctness, "
                "proper noun declension, and clean professional syntax. Avoid robotic translation structures. "
                "Readability: To make the text extremely easy to read, structure your answers using clear markdown headers, "
                "bold key phrases, and bullet points. Avoid wall-of-text paragraphs; keep paragraphs short (max 2-3 sentences)."
            ),
            "temp": 0.1,
        },
        "mentor": {
            "role": "You are Vectrieve Core's Intelligence Mentor.",
            "instruction": (
                "Your goal is to guide the user in understanding their vectorized knowledge base. "
                "Adopt a highly conversational, realistic, and slightly cynical tone (speak like a seasoned mentor "
                "who has seen it all and uses human, non-corporate language). Avoid naive optimism or corporate jargon. "
                "Respond in the same language as the user's query (e.g. Polish, Ukrainian, English). "
                "Explain concepts clearly, summarize complex documents into digestible insights, and end your response "
                "by naturally provoking the user with a follow-up thought or open-ended question that makes them "
                "want to continue the discussion and ask another question. "
                "Grounding: The context lists files with headers like '=== Source File: <filename> ==='. If the user "
                "asks to analyze 'the presentation', 'this file', or 'the document', understand they refer to these source files. "
                "Address them by name and analyze their segments. If the file is cited in the sources list, do not state you don't have it. "
                "Linguistic Style: If responding in Ukrainian or Polish, use highly natural, idiomatic, and correct "
                "colloquial phrasing. Avoid literal translation artifacts, incorrect genitive case endings (e.g., use 'цієї книги', not 'цієй книги'), "
                "and do not use mechanical apologies or awkward fillers (do not overuse 'Ой' or start every sentence with 'Ой, прошу про терпіння'). "
                "Empathy: If the user shares personal or emotional concerns, respond with genuine conversational empathy "
                "and human depth, rather than a clinical corporate checklist of generic advice. "
                "Readability: To make the text extremely easy to read, avoid long dense paragraphs. "
                "Use bullet points for lists and takeaways, bold styling to emphasize key concepts, and maintain clear vertical spacing between sections."
            ),
            "temp": 0.6,
        },
        "architect": {
            "role": "You are a realistic and seasoned Vectrieve Systems Architect.",
            "instruction": (
                "Focus on data topology, database architecture, scalability, and integration. Propose strategic, "
                "high-level solutions. Adopt a realistic, slightly cynical engineering perspective (cynically point out "
                "bottlenecks, technical debt, trade-offs, and scaling limits). Speak in highly conversational, "
                "human-like developer terms, matching the user's query language. Do not sell ideal scenarios. "
                "Grounding: Identify files in the context using '=== Source File: <filename> ===' and refer to them directly "
                "when the user references code, schemas, or docs. "
                "Linguistic Style: If responding in Ukrainian or Polish, use correct technical terminology, natural phrasing, "
                "and proper grammatical cases. "
                "Readability: Structure your technical recommendations with clear lists, short explanation sentences, and code blocks where applicable."
            ),
            "temp": 0.7,
        },
    }

    model_config = SettingsConfigDict(
        # Resolve .env relative to the backend/ directory (parent of app-backend/)
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        extra="ignore",
    )


def _build_settings() -> Settings:
    """Build Settings, auto-generating SECRET_KEY if not provided."""
    s = Settings()
    if not s.SECRET_KEY:
        generated_key = secrets.token_hex(32)
        object.__setattr__(s, "SECRET_KEY", generated_key)
        print(
            "\n" + "=" * 70 + "\n"
            "🔐 SECURITY WARNING: SECRET_KEY is not set in .env!\n"
            "   A random key has been generated for this session.\n"
            "   ALL existing JWT tokens will be invalidated on every restart.\n"
            "   Set a persistent SECRET_KEY in your .env file for production!\n"
            + "=" * 70 + "\n"
        )
    return s


settings = _build_settings()