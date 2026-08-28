import pytest
import pytest_asyncio
from pathlib import Path
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock
from sqlmodel import select

from models.user import User
from services.audio_parser import is_media_file, is_video_file, MEDIA_EXTENSIONS, extract_audio_track

def test_audio_video_extension_detection():
    """Verify detection of media file formats."""
    assert is_media_file("recording.mp3") is True
    assert is_media_file("voice_note.m4a") is True
    assert is_media_file("interview.wav") is True
    assert is_media_file("meeting.mp4") is True
    assert is_media_file("screen_capture.mov") is True
    assert is_media_file("lecture.webm") is True
    assert is_media_file("document.pdf") is False
    assert is_media_file("spreadsheet.xlsx") is False


def test_video_detection():
    """Verify video vs audio discrimination."""
    assert is_video_file("video.mp4") is True
    assert is_video_file("video.mov") is True
    assert is_video_file("audio.mp3") is False
    assert is_video_file("audio.wav") is False


@pytest.mark.asyncio
async def test_admin_user_approval_flow(client: AsyncClient, test_session):
    """Verify admin listing, approval, active-toggle, and deletion of users."""
    from main import app
    from api.deps import get_current_user

    # 1. Register a regular user
    reg_data = {"fullName": "Pending Candidate", "email": "pending@company.com", "password": "SecurePassword123!"}
    reg_resp = await client.post("/auth/register", json=reg_data)
    assert reg_resp.status_code == 201
    assert reg_resp.json()["is_approved"] is False

    # 2. Verify non-approved user cannot login
    login_resp = await client.post("/auth/token", data={"username": "pending@company.com", "password": "SecurePassword123!"})
    assert login_resp.status_code == 403
    assert "pending administrator approval" in login_resp.json()["detail"].lower()

    # 3. Setup admin session
    admin_user = User(id=999, username="admin@company.com", hashed_password="pw", is_admin=True, is_active=True, is_approved=True)
    app.dependency_overrides[get_current_user] = lambda: admin_user

    # 4. List users
    users_resp = await client.get("/analytics/users")
    assert users_resp.status_code == 200
    user_list = users_resp.json()["users"]
    pending_user = next((u for u in user_list if u["username"] == "pending@company.com"), None)
    assert pending_user is not None
    assert pending_user["is_approved"] is False

    # 5. Approve user
    approve_resp = await client.post(f"/analytics/users/{pending_user['id']}/approve")
    assert approve_resp.status_code == 200
    assert approve_resp.json()["is_approved"] is True

    # 6. Toggle active status
    toggle_resp = await client.post(f"/analytics/users/{pending_user['id']}/toggle-active")
    assert toggle_resp.status_code == 200
    assert toggle_resp.json()["is_active"] is False

    # 7. Delete user
    del_resp = await client.delete(f"/analytics/users/{pending_user['id']}")
    assert del_resp.status_code == 200

    # Cleanup
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
