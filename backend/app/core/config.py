import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Vectrieve AI"
    VERSION: str = "1.0.0"

    # --- API KEYS ---
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # --- SENTRY ---
    # Додаємо DSN, бо main.py його шукає
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "https://162733163284ed4d753c832e2c17bdd1@o4510608367747072.ingest.de.sentry.io/4510608375873616")

    # --- DATABASE ---
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", 6333))
    COLLECTION_NAME: str = "Vectrieve_knowledge"

    # --- MODELS ---
    MODEL_NAME: str = "llama-3.3-70b-versatile"
    LOCAL_MODEL_NAME: str = "qwen2.5-coder:7b"  # <-- Було відсутнє
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")

    # --- LOGGING ---
    LOG_FILE: str = "chat_logs.csv" # <-- Було відсутнє

    # --- THINKING MODES (Критично для llm_service) ---
    THINKING_MODES: dict = {
        "auditor": {
            "role": "You are a strict Code Auditor and Security Expert.",
            "instruction": "Be critical. Focus on security vulnerabilities. Output should be dry and factual.",
            "temp": 0.1
        },
        "mentor": {
            "role": "You are a helpful Senior Developer acting as a Mentor.",
            "instruction": "Explain concepts simply and clearly. Encourage best practices.",
            "temp": 0.4
        },
        "architect": {
            "role": "You are a creative Software Architect and Tech Lead.",
            "instruction": "Propose architectural improvements and optimizations.",
            "temp": 0.7
        }
    }

settings = Settings()