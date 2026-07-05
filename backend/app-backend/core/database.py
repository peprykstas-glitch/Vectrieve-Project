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

engine = create_async_engine(DATABASE_URL, echo=False)


async def init_db():
    """Create tables on startup if they don't exist yet"""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # Dynamic migration: add 'summary' column to 'document' and 'sources' to 'chathistory' if not exists
        try:
            from sqlalchemy import text
            dialect_name = conn.dialect.name
            if dialect_name == "postgresql":
                await conn.execute(text("ALTER TABLE document ADD COLUMN IF NOT EXISTS summary TEXT"))
                await conn.execute(text("ALTER TABLE chathistory ADD COLUMN IF NOT EXISTS sources TEXT"))
            else:
                try:
                    await conn.execute(text("ALTER TABLE document ADD COLUMN summary TEXT"))
                except Exception as sq_err:
                    err_str = str(sq_err).lower()
                    if "duplicate column" not in err_str and "already exists" not in err_str:
                        print(f"⚠️ SQLite migration info (document): {sq_err}")
                try:
                    await conn.execute(text("ALTER TABLE chathistory ADD COLUMN sources TEXT"))
                except Exception as sq_err:
                    err_str = str(sq_err).lower()
                    if "duplicate column" not in err_str and "already exists" not in err_str:
                        print(f"⚠️ SQLite migration info (chathistory): {sq_err}")
        except Exception as mig_err:
            print(f"⚠️ Dynamic database migration warning: {mig_err}")


def get_session_factory():
    """Session factory for background tasks"""
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining a session in API routes"""
    async_session = get_session_factory()
    async with async_session() as session:
        yield session