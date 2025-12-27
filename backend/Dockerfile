# Використовуємо Python 3.10 (краще для нових type hints)
FROM python:3.10-slim

WORKDIR /app

# Системні залежності для OpenCV (якщо треба) та інструментів збірки
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо requirements
COPY requirements.txt .

# Встановлюємо залежності
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо код
COPY . .

# Створюємо папку для логів та даних, щоб не було помилок
RUN mkdir -p logs data books_to_test

# Відкриваємо порт FastAPI
EXPOSE 8000

# ЗАПУСК: Uvicorn сервер для FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]