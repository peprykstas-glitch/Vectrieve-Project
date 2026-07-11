"""
Alembic env.py — configured for async SQLAlchemy with SQLModel models.

To create a new migration after changing a model:
    alembic revision --autogenerate -m "describe_your_change"

To apply all pending migrations:
    alembic upgrade head

To roll back one migration:
    alembic downgrade -1
"""
import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Make app-backend importable so SQLModel models can be discovered
APP_DIR = Path(__file__).resolve().parent.parent / "app-backend"
sys.path.insert(0, str(APP_DIR))

# Import all models so their metadata is populated
from sqlmodel import SQLModel
import models  # noqa: F401 — ensures all model tables are registered

# Load .env so DATABASE_URL is available
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Alembic Config object
config = context.config

# Override sqlalchemy.url from environment (takes precedence over alembic.ini)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://vectrieve:vectrieve_password@localhost:5432/vectrievedb"
)
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no DB connection needed)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in online mode with an async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
