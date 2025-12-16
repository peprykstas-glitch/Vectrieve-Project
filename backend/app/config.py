import os

class Settings:
    PROJECT_NAME: str = "CoreMind API"
    VERSION: str = "2.2.0 (Groq Edition)"
    API_V1_STR: str = "/api/v1"
    
    # --- GROQ CLOUD SETTINGS ---
    # We using protocol by OpenAI, but we knok to Groq
    OLLAMA_HOST: str = "https://api.groq.com/openai/v1"
    
    # The most powerfull LLM model for the moment
    OLLAMA_MODEL: str = "llama-3.3-70b-versatile" 
    
    # API key
    GROQ_API_KEY = "YOUR_API_KEY_HERE"
    
    # --- VECTOR DB SETTINGS ---
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    COLLECTION_NAME: str = "coremind_knowledge"

settings = Settings()