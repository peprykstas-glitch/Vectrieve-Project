import pytest

# Маркуємо тест як асинхронний
@pytest.mark.asyncio
async def test_health_check(client):
    """Перевіряємо, чи сервер взагалі дихає"""
    response = await client.get("/health")  # Або "/" якщо ти не міняв рут
    assert response.status_code == 200
    assert response.json()["status"] == "ok" # Або те, що повертає твій рут

@pytest.mark.asyncio
async def test_upload_endpoint_exists(client):
    """Перевіряємо, що ендпоінт завантаження доступний (навіть без файлу має бути 422)"""
    response = await client.post("/upload") # Перевір свій шлях в api.py
    # 422 Unprocessable Entity означає, що FastAPI працює і свариться на відсутність файлу
    assert response.status_code == 422