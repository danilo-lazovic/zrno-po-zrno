"""nacrti

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-21 09:50:01.056070
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('sadrzaj_nacrti',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('dokument', postgresql.JSONB(), nullable=False),
    sa.Column('osnova_verzija_id', sa.Integer(), nullable=False),
    sa.Column('revizija', sa.Integer(), nullable=False),
    sa.Column('izmenio_id', sa.Integer(), nullable=True),
    sa.Column('izmenjen_u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['izmenio_id'], ['korisnici.id'], name=op.f('fk_sadrzaj_nacrti_izmenio_id_korisnici'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_sadrzaj_nacrti_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['osnova_verzija_id'], ['sadrzaj_verzije.id'], name=op.f('fk_sadrzaj_nacrti_osnova_verzija_id_sadrzaj_verzije'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_sadrzaj_nacrti')),
    sa.UniqueConstraint('kurs_id', name=op.f('uq_sadrzaj_nacrti_kurs_id'))
    )


def downgrade() -> None:
    op.drop_table('sadrzaj_nacrti')
