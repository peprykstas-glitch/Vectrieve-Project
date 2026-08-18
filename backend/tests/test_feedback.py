import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from core.database import get_session
from models.sql_models import Feedback, FeedbackType, FeedbackStatus
from api.deps import get_current_user, require_admin
from unittest.mock import AsyncMock, MagicMock


class MockAdminUser:
    id = 1
    username = "admin@example.com"
    is_admin = True
    is_active = True
    is_approved = True


class MockRegularUser:
    id = 2
    username = "user@example.com"
    is_admin = False
    is_active = True
    is_approved = True


@pytest.mark.asyncio
async def test_feedback_submission_and_lifecycle():
    # 1. Test regular user submitting feedback
    app.dependency_overrides[get_current_user] = lambda: MockRegularUser()
    app.dependency_overrides[require_admin] = lambda: MockAdminUser()

    mock_db = AsyncMock()
    app.dependency_overrides[get_session] = lambda: mock_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Submit feedback
        res = await ac.post("/analytics/feedback", json={
            "type": "IDEA",
            "message": "Add WhatsApp direct template export"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["message"] == "Feedback recorded. Thank you!"

    app.dependency_overrides.clear()
