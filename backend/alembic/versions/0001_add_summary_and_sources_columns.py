"""add summary to document and sources to chathistory

Revision ID: 0001
Revises: 
Create Date: 2026-07-08

These columns were previously added via try/except ALTER TABLE hacks
in database.py::init_db(). This migration replaces those hacks with
proper versioned schema management.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'summary' column to 'document' table if it doesn't exist
    # (safe: uses ADD COLUMN IF NOT EXISTS on PostgreSQL)
    op.execute(
        "ALTER TABLE document ADD COLUMN IF NOT EXISTS summary TEXT"
    )
    # Add 'sources' column to 'chathistory' table if it doesn't exist
    op.execute(
        "ALTER TABLE chathistory ADD COLUMN IF NOT EXISTS sources TEXT"
    )


def downgrade() -> None:
    op.drop_column("document", "summary")
    op.drop_column("chathistory", "sources")
