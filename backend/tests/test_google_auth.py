import pytest
from httpx import Response
from unittest.mock import AsyncMock, patch
from sqlmodel import select
from models.user import User


@pytest.mark.asyncio
async def test_google_auth_smart_account_unification(client, test_session):
    """Test that Google OAuth correctly links with an existing email user and creates new users."""
    mock_http_client = AsyncMock()
    mock_http_client.post.return_value = Response(200, json={"access_token": "mock_google_token_123"})
    mock_http_client.get.return_value = Response(200, json={
        "sub": "google_uid_99999",
        "email": "test_google_user@example.com",
        "email_verified": True,
        "name": "Google Tester"
    })
    mock_http_client.__aenter__.return_value = mock_http_client
    mock_http_client.__aexit__.return_value = None

    with patch("api.endpoints.auth.httpx.AsyncClient", return_value=mock_http_client):
        # 1. First-time Google user creation (non-admin -> pending approval)
        res = await client.post("/auth/google", json={
            "code": "4/0AeanS0...",
            "redirect_uri": "http://localhost:3000/api/auth/callback/google"
        })
        assert res.status_code == 403
        assert "pending administrator approval" in res.json()["detail"]

        # 2. Existing user account linking (User created via password, then signs in with Google)
        existing_pwd_user = User(
            username="existing_staff@example.com",
            hashed_password="hashed_dummy_password",
            is_active=True,
            is_approved=True,
            google_id=None
        )
        test_session.add(existing_pwd_user)
        await test_session.commit()

        mock_http_client.get.return_value = Response(200, json={
            "sub": "google_uid_linked_888",
            "email": "existing_staff@example.com",
            "email_verified": True,
            "name": "Existing Staff"
        })

        res_link = await client.post("/auth/google", json={
            "code": "4/0AeanS1...",
            "redirect_uri": "http://localhost:3000/api/auth/callback/google"
        })
        assert res_link.status_code == 200
        data_link = res_link.json()
        assert data_link["user"]["email"] == "existing_staff@example.com"

        # Verify google_id was linked in DB
        stmt = select(User).where(User.username == "existing_staff@example.com")
        linked_db_user = (await test_session.execute(stmt)).scalar_one()
        assert linked_db_user.google_id == "google_uid_linked_888"
