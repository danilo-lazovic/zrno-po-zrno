"""nivo pređen bez mreže: ključ prolaza

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-21 12:30:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("prolazi_nivoa") as t:
        t.add_column(sa.Column("kljuc", sa.String(length=36), nullable=True))
        t.create_unique_constraint("uq_prolazi_nivoa_kljuc", ["kljuc"])


def downgrade() -> None:
    with op.batch_alter_table("prolazi_nivoa") as t:
        t.drop_constraint("uq_prolazi_nivoa_kljuc", type_="unique")
        t.drop_column("kljuc")
