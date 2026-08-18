from typing import AsyncGenerator
from pathlib import Path
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

import os
from dotenv import load_dotenv

load_dotenv()

# We use asyncpg for asynchronous PostgreSQL connections
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://vectrieve:vectrieve_password@localhost:5432/vectrievedb"
)

engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    pool_size=5,
    max_overflow=5,
    pool_timeout=30
)


async def init_db():
    """
    Create all tables on startup if they don't exist yet (safe for new installs).

    Column additions are done via safe ALTER TABLE ... ADD COLUMN IF NOT EXISTS
    which is idempotent on PostgreSQL. This handles incremental schema changes
    without requiring Alembic for simple column additions.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        # --- Incremental column migrations (safe, idempotent) ---
        await conn.execute(
            __import__("sqlalchemy").text(
                "ALTER TABLE user_settings "
                "ADD COLUMN IF NOT EXISTS trial_queries_used INTEGER NOT NULL DEFAULT 0"
            )
        )
        await conn.execute(
            __import__("sqlalchemy").text(
                'ALTER TABLE "user" '
                "ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE"
            )
        )


def get_session_factory():
    """Session factory for background tasks"""
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining a session in API routes"""
    async_session = get_session_factory()
    async with async_session() as session:
        yield session