"""add attached_filenames column to chathistory

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-11

The ChatHistory SQLModel has an `attached_filenames` Optional[str] field
that was added to the model but never migrated to the database.
This caused every /chat/stream request to fail with:
  asyncpg.exceptions.UndefinedColumnError: column "attached_filenames"
  of relation "chathistory" does not exist
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chathistory",
        sa.Column("attached_filenames", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chathistory", "attached_filenames")
