"""create user_settings table

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-08

Adds the per-user settings table that replaces the insecure
.env file write vulnerability in the settings endpoint (Issue A fix).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("local_model_name", sa.Text(), nullable=True),
        sa.Column("groq_api_key", sa.Text(), nullable=True),
        sa.Column("qdrant_url", sa.Text(), nullable=True),
        sa.Column("qdrant_api_key", sa.Text(), nullable=True),
        sa.Column("ollama_url", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )
    op.create_index("ix_user_settings_user_id", "user_settings", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_settings_user_id", table_name="user_settings")
    op.drop_table("user_settings")
