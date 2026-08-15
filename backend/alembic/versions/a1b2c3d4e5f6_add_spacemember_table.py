"""add_spacemember_table

Revision ID: a1b2c3d4e5f6
Revises: e076dee3d986
Create Date: 2026-07-18 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '31dcc69db8de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the spacemember table
    op.create_table(
        'spacemember',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('space_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sqlmodel.sql.sqltypes.AutoString(), nullable=False,
                  server_default='Viewer'),
        sa.ForeignKeyConstraint(['space_id'], ['space.id'], name='fk_spacemember_space_id'),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], name='fk_spacemember_user_id'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_spacemember_space_id'), 'spacemember', ['space_id'], unique=False)
    op.create_index(op.f('ix_spacemember_user_id'), 'spacemember', ['user_id'], unique=False)

    # 2. Data migration: seed existing space owners as SpaceMember(role='Owner')
    #    Uses raw SQL so it works in both online and offline mode.
    op.execute(
        """
        INSERT INTO spacemember (space_id, user_id, role)
        SELECT s.id, s.user_id, 'Owner'
        FROM space s
        WHERE NOT EXISTS (
            SELECT 1 FROM spacemember sm
            WHERE sm.space_id = s.id AND sm.user_id = s.user_id
        )
        """
    )


def downgrade() -> None:
    # ⚠️ WARNING: This drops ALL SpaceMember rows, not just the ones this
    # migration created. Any Editor/Viewer memberships added via the API
    # after this migration ran will be PERMANENTLY LOST — a subsequent
    # `upgrade head` only re-seeds Owner rows from space.user_id, it does
    # NOT restore manually-added collaborators. Back up the spacemember
    # table before downgrading on any environment with real shared spaces.
    op.drop_index(op.f('ix_spacemember_user_id'), table_name='spacemember')
    op.drop_index(op.f('ix_spacemember_space_id'), table_name='spacemember')
    op.drop_table('spacemember')
