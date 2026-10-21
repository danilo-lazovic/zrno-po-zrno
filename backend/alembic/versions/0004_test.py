"""test

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-21 09:15:21.597894
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('testovi',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('verzija_id', sa.Integer(), nullable=False),
    sa.Column('pitanja', postgresql.JSONB(), nullable=False),
    sa.Column('pocetak', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('kraj', sa.DateTime(timezone=True), nullable=True),
    sa.Column('procenat', sa.Integer(), nullable=True),
    sa.Column('polozen', sa.Boolean(), nullable=True),
    sa.Column('po_nivoima', postgresql.JSONB(), nullable=True),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_testovi_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_testovi_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['verzija_id'], ['sadrzaj_verzije.id'], name=op.f('fk_testovi_verzija_id_sadrzaj_verzije'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_testovi'))
    )
    op.create_index(op.f('ix_testovi_korisnik_id'), 'testovi', ['korisnik_id'], unique=False)
    op.create_table('sertifikati',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('test_id', sa.Integer(), nullable=False),
    sa.Column('kod', sa.String(length=16), nullable=False),
    sa.Column('procenat', sa.Integer(), nullable=False),
    sa.Column('izdat_u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('opozvan_u', sa.DateTime(timezone=True), nullable=True),
    sa.Column('opozvao_id', sa.Integer(), nullable=True),
    sa.Column('razlog_opoziva', sa.String(length=300), nullable=True),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_sertifikati_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_sertifikati_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['opozvao_id'], ['korisnici.id'], name=op.f('fk_sertifikati_opozvao_id_korisnici'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['test_id'], ['testovi.id'], name=op.f('fk_sertifikati_test_id_testovi'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_sertifikati')),
    sa.UniqueConstraint('kod', name=op.f('uq_sertifikati_kod')),
    sa.UniqueConstraint('korisnik_id', 'kurs_id', name='uq_sertifikati_korisnik_kurs')
    )
    op.create_index(op.f('ix_sertifikati_korisnik_id'), 'sertifikati', ['korisnik_id'], unique=False)
    op.add_column('odgovori', sa.Column('test_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_odgovori_test_id'), 'odgovori', ['test_id'], unique=False)
    op.create_unique_constraint('uq_odgovori_test_pitanje', 'odgovori', ['test_id', 'pitanje'])
    op.create_foreign_key(op.f('fk_odgovori_test_id_testovi'), 'odgovori', 'testovi', ['test_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    op.drop_constraint(op.f('fk_odgovori_test_id_testovi'), 'odgovori', type_='foreignkey')
    op.drop_constraint('uq_odgovori_test_pitanje', 'odgovori', type_='unique')
    op.drop_index(op.f('ix_odgovori_test_id'), table_name='odgovori')
    op.drop_column('odgovori', 'test_id')
    op.drop_index(op.f('ix_sertifikati_korisnik_id'), table_name='sertifikati')
    op.drop_table('sertifikati')
    op.drop_index(op.f('ix_testovi_korisnik_id'), table_name='testovi')
    op.drop_table('testovi')
