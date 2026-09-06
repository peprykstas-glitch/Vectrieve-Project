import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta, timezone
from sqlmodel import select
import uuid

from main import app
from models.user import User
from models.password_reset import PasswordResetToken
from core.security import get_password_hash, verify_password
from core.database import get_session


@pytest.mark.asyncio
async def test_forgot_password_creates_token_and_case_insensitive(test_session):
    async def override_get_session():
        yield test_session

    app.dependency_overrides[get_session] = override_get_session

    # Create user with lowercase email
    hashed = await get_password_hash("OldPassword123!@#")
    user = User(username="user@example.com", hashed_password=hashed, is_active=True, is_approved=True)
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Request with mixed-case email
        res = await client.post("/auth/forgot-password", json={"email": "USER@Example.Com"})
        assert res.status_code == 200
        assert "link has been sent" in res.json()["message"]

    # Verify token was created with used=False
    stmt = select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
    result = await test_session.execute(stmt)
    token = result.scalar_one_or_none()
    assert token is not None
    assert token.used is False
    assert token.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_reset_password_success(test_session):
    async def override_get_session():
        yield test_session

    app.dependency_overrides[get_session] = override_get_session

    # Create user
    old_hash = await get_password_hash("OldPassword123!@#")
    user = User(username="target@example.com", hashed_password=old_hash, is_active=True, is_approved=True)
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)

    # Create active reset token
    test_token_str = str(uuid.uuid4())
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=test_token_str,
        expires_at=(datetime.now(timezone.utc) + timedelta(hours=1)).replace(tzinfo=None),
        used=False,
    )
    test_session.add(reset_token)
    await test_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Reset password
        new_pwd = "NewSecurePassword456!@#"
        res = await client.post(
            "/auth/reset-password",
            json={"token": test_token_str, "new_password": new_pwd},
        )
        assert res.status_code == 200
        assert "Password has been reset" in res.json()["message"]

    # Verify token is now marked used
    await test_session.refresh(reset_token)
    assert reset_token.used is True

    # Verify user's password was updated
    await test_session.refresh(user)
    assert await verify_password(new_pwd, user.hashed_password) is True

    # Attempting to reuse the token must fail with 400
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res_reuse = await client.post(
            "/auth/reset-password",
            json={"token": test_token_str, "new_password": "AnotherPassword789!@#"},
        )
        assert res_reuse.status_code == 400
        assert "Invalid or expired" in res_reuse.json()["detail"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_reset_password_expired_token(test_session):
    async def override_get_session():
        yield test_session

    app.dependency_overrides[get_session] = override_get_session

    user = User(username="expired@example.com", hashed_password="dummy", is_active=True, is_approved=True)
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)

    # Token expired 1 hour ago
    expired_token_str = str(uuid.uuid4())
    expired_token = PasswordResetToken(
        user_id=user.id,
        token=expired_token_str,
        expires_at=(datetime.now(timezone.utc) - timedelta(hours=1)).replace(tzinfo=None),
        used=False,
    )
    test_session.add(expired_token)
    await test_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/auth/reset-password",
            json={"token": expired_token_str, "new_password": "NewSecurePassword456!@#"},
        )
        assert res.status_code == 400
        assert "expired" in res.json()["detail"]

    app.dependency_overrides.clear()
