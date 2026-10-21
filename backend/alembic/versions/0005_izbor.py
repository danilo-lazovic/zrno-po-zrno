"""izbor

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-21 09:36:30.923016
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('odgovori', sa.Column('izbor', postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('odgovori', 'izbor')
