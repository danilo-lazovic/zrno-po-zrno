"""igre

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-21 09:03:36.593122
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('igre_rezultati',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('igra', sa.String(length=20), nullable=False),
    sa.Column('izvor', sa.String(length=10), nullable=False),
    sa.Column('kontekst', sa.String(length=20), nullable=False),
    sa.Column('rezultat', sa.Float(), nullable=False),
    sa.Column('zvezdice', sa.Integer(), nullable=False),
    sa.Column('poeni', sa.Integer(), nullable=False),
    sa.Column('trajanje_ms', sa.Integer(), nullable=False),
    sa.Column('detalji', postgresql.JSONB(), nullable=False),
    sa.Column('zrna', sa.Integer(), nullable=False),
    sa.Column('dan', sa.Date(), nullable=False),
    sa.Column('u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_igre_rezultati_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_igre_rezultati_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_igre_rezultati'))
    )
    op.create_index(op.f('ix_igre_rezultati_korisnik_id'), 'igre_rezultati', ['korisnik_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_igre_rezultati_korisnik_id'), table_name='igre_rezultati')
    op.drop_table('igre_rezultati')
