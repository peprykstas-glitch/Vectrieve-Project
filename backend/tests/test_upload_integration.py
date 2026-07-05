"""
Integration tests for the file upload endpoint.
These tests use an in-memory SQLite DB and mock out background processing.
"""
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


pytestmark = pytest.mark.asyncio


async def test_upload_file_endpoint_success(client: AsyncClient):
    """
    POST /upload returns 202 Accepted with the document record.
    Background processing (PDF parse + vector upsert) is mocked.
    """
    file_content = b"print('Hello Integration')"
    files = {"file": ("test_script.py", file_content, "text/plain")}

    with patch("api.endpoints.upload.process_pdf_background", new_callable=AsyncMock) as mock_bg:
        response = await client.post("/upload", files=files)

        assert response.status_code == 202, response.text
        data = response.json()
        assert data["filename"] == "test_script.py"

        # Verify background task was scheduled
        assert mock_bg.called


async def test_upload_no_file(client: AsyncClient):
    """POST /upload without a file returns 422 Unprocessable Entity."""
    response = await client.post("/upload")
    assert response.status_code == 422


async def test_upload_and_list_files(client: AsyncClient):
    """
    After uploading a file the GET /upload endpoint lists it.
    The file status starts as PROCESSING (background job not run).
    """
    file_content = b"# hello"
    files = {"file": ("hello.py", file_content, "text/plain")}

    with patch("api.endpoints.upload.process_pdf_background", new_callable=AsyncMock):
        upload_resp = await client.post("/upload", files=files)
        assert upload_resp.status_code == 202

    list_resp = await client.get("/upload")
    assert list_resp.status_code == 200
    filenames = [d["filename"] for d in list_resp.json()]
    assert "hello.py" in filenames