import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock
from.main import app

client = TestClient(app)

def test_upload_file_endpoint_success():
    """
    Тестуємо повний шлях завантаження файлу.
    URL згідно з check_routes.py: /upload/
    """
    file_content = b"print('Hello Integration')"
    files = {
        "file": ("test_script.py", file_content, "text/plain")
    }

    with patch("app.api.endpoints.upload.parse_file", new_callable=AsyncMock) as mock_parser, \
         patch("app.api.endpoints.upload.vector_service") as mock_vs:
        
        mock_parser.return_value = "Parsed content code"
        mock_vs.add_document.return_value = "test-uuid-12345"

        # ✅ БУЛО: /api/v1/upload/
        # ✅ СТАЛО: /upload/ (так каже твій сервер)
        response = client.post("/upload/", files=files)

        if response.status_code != 200:
            print(f"DEBUG ERROR: {response.json()}")

        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "test_script.py"

def test_upload_no_file():
    # ✅ БУЛО: /api/v1/upload/
    # ✅ СТАЛО: /upload/
    response = client.post("/upload/") 
    assert response.status_code == 422