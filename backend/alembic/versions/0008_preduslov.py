"""više kurseva: preduslov kursa, nacrt kursa koji još nije objavljen

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-21 14:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("kursevi") as t:
        t.add_column(sa.Column("preduslov_id", sa.Integer(), nullable=True))
        t.create_foreign_key("fk_kursevi_preduslov_id_kursevi", "kursevi", ["preduslov_id"], ["id"], ondelete="SET NULL")
    with op.batch_alter_table("sadrzaj_nacrti") as t:
        t.alter_column("osnova_verzija_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.execute("DELETE FROM sadrzaj_nacrti WHERE osnova_verzija_id IS NULL")
    with op.batch_alter_table("sadrzaj_nacrti") as t:
        t.alter_column("osnova_verzija_id", existing_type=sa.Integer(), nullable=False)
    with op.batch_alter_table("kursevi") as t:
        t.drop_constraint("fk_kursevi_preduslov_id_kursevi", type_="foreignkey")
        t.drop_column("preduslov_id")
