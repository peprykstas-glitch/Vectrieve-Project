import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../app-backend")))

from main import app
from core.database import get_session

# In-memory database for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)

import core.database
core.database.engine = test_engine

TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine, class_=AsyncSession, expire_on_commit=False
)

@pytest_asyncio.fixture(scope="function")
async def test_session():
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    
    # Yield session
    async with TestingSessionLocal() as session:
        yield session
        
    # Drop tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)

from api.deps import get_current_user
from models.user import User

from fastapi import Request, HTTPException, Depends
from sqlmodel import select

@pytest_asyncio.fixture(scope="function")
async def test_user(test_session: AsyncSession):
    user = User(id=1, username="owner@example.com", hashed_password="dummy", is_active=True, is_admin=False)
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user

@pytest_asyncio.fixture(scope="function")
async def test_user_2(test_session: AsyncSession):
    user = User(id=2, username="viewer@example.com", hashed_password="dummy", is_active=True, is_admin=False)
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user

@pytest_asyncio.fixture(scope="function")
async def client(test_session: AsyncSession):
    async def override_get_session():
        yield test_session

    async def override_get_current_user(request: Request, session: AsyncSession = Depends(override_get_session)):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            # Fallback to user 1 for backward compatibility
            stmt = select(User).where(User.id == 1)
            res = await session.execute(stmt)
            d_user = res.scalar_one_or_none()
            if not d_user:
                d_user = User(id=1, username="owner@example.com", hashed_password="dummy", is_active=True)
                session.add(d_user)
                await session.commit()
                await session.refresh(d_user)
            return d_user
            
        token = auth_header.replace("Bearer ", "").strip()
        stmt = select(User).where(User.username == token)
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
        
    app.dependency_overrides.clear()