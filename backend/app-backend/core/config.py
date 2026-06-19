import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Dict


class Settings(BaseSettings):
    # --- Project ---
    PROJECT_NAME: str = "Vectrieve AI"
    VERSION: str = "1.0.0"

    # --- Security & API Keys ---
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7" # Fallback if not in .env
    GROQ_API_KEY: str = ""
    SENTRY_DSN: str = ""

    # --- Database (Qdrant) ---
    QDRANT_URL: str = ""
    QDRANT_API_KEY: str = ""
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    COLLECTION_NAME: str = "Vectrieve_knowledge"

    # --- AI Models ---
    MODEL_NAME: str = "llama-3.3-70b-versatile"
    LOCAL_MODEL_NAME: str = "qwen2.5-coder:7b"
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"

    # --- Logging ---
    LOG_FILE: str = "analytics_log.csv"

    # --- Logic ---
    THINKING_MODES: Dict[str, Dict[str, float | str]] = {
        "auditor": {
            "role": "You are a stringent Data & Security Auditor for Vectrieve Core.",
            "instruction": "Analyze the provided vector context meticulously. Point out anomalies, risks, or discrepancies in the user's data. Be exact, critical, and explicitly cite the documents when making assertions. Do not hallucinate.",
            "temp": 0.1,
        },
        "mentor": {
            "role": "You are Vectrieve Core's Intelligence Mentor.",
            "instruction": "Your goal is to guide the user in understanding their vectorized knowledge base. Explain concepts clearly, summarize complex documents into digestible insights, and help the user extract the most value from their data in a friendly tone.",
            "temp": 0.5,
        },
        "architect": {
            "role": "You are the Vectrieve Systems Architect.",
            "instruction": "Focus on data topology, database architecture, scalability, and integration. Propose strategic, high-level solutions for structuring and managing their vectorized data efficiently.",
            "temp": 0.7,
        },
    }

    class Config:
        # Resolve .env relative to the backend/ directory (parent of app-backend/)
        env_file = str(Path(__file__).resolve().parent.parent.parent / ".env")
        extra = "ignore"


settings = Settings()