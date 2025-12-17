import os
from dotenv import load_dotenv

# Завантажуємо змінні з файлу .env
load_dotenv()

class Config:
    # ----------------------------------------
    # 1. Налаштування Проєкту (Цього не вистачало)python backend/main.py
    # ----------------------------------------
    PROJECT_NAME = "CoreMind AI"
    VERSION = "1.0.0"

    # ----------------------------------------
    # 2. Ключі та Безпека
    # ----------------------------------------
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    
    if not GROQ_API_KEY:
        raise ValueError("❌ ПОМИЛКА: Не знайдено GROQ_API_KEY у файлі .env!")

    # ----------------------------------------
    # 3. База Даних та Модель
    # ----------------------------------------
    QDRANT_HOST = "localhost"
    QDRANT_PORT = 6333
    COLLECTION_NAME = "coremind_knowledge"
    MODEL_NAME = "llama-3.3-70b-versatile"

# Створюємо об'єкт налаштувань
settings = Config()