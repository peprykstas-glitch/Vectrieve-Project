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
    """
    Create all tables on startup if they don't exist yet (safe for new installs).

    Schema changes (new columns, indexes, etc.) are managed by Alembic migrations.
    Run `alembic upgrade head` to apply pending migrations before starting the server.
    Do NOT add raw ALTER TABLE statements here — that is not how production databases
    are versioned.
    """
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # Automatically migrate existing Spaces to have SpaceMember records as Owners
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlmodel import select
    from models.sql_models import Space, SpaceMember, SpaceRole

    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        try:
            # Query all spaces and existing space members
            spaces_res = await session.execute(select(Space))
            spaces = spaces_res.scalars().all()

            members_res = await session.execute(select(SpaceMember))
            members = members_res.scalars().all()

            existing_pairs = {(m.space_id, m.user_id) for m in members}

            migrated_count = 0
            for space in spaces:
                pair = (space.id, space.user_id)
                if pair not in existing_pairs:
                    new_member = SpaceMember(
                        space_id=space.id,
                        user_id=space.user_id,
                        role=SpaceRole.OWNER
                    )
                    session.add(new_member)
                    existing_pairs.add(pair)
                    migrated_count += 1

            if migrated_count > 0:
                await session.commit()
                print(f"✅ Data Migration: Created {migrated_count} SpaceMember owner records for existing Spaces.")
        except Exception as e:
            await session.rollback()
            print(f"⚠️ Data Migration failed: {e}")



def get_session_factory():
    """Session factory for background tasks"""
    return sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining a session in API routes"""
    async_session = get_session_factory()
    async with async_session() as session:
        yield session