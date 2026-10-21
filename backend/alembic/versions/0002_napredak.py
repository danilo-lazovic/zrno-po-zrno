"""napredak

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-20 15:44:14.411478
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('bedzevi_korisnika',
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('bedz', sa.String(length=20), nullable=False),
    sa.Column('u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_bedzevi_korisnika_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_bedzevi_korisnika_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('korisnik_id', 'kurs_id', 'bedz', name=op.f('pk_bedzevi_korisnika'))
    )
    op.create_table('kartice_korisnika',
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('pojam', sa.String(length=60), nullable=False),
    sa.Column('zna', sa.Boolean(), nullable=False),
    sa.Column('nagradjena', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_kartice_korisnika_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_kartice_korisnika_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('korisnik_id', 'kurs_id', 'pojam', name=op.f('pk_kartice_korisnika'))
    )
    op.create_table('nivoi_korisnika',
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('nivo', sa.String(length=20), nullable=False),
    sa.Column('zavrsen_u', sa.DateTime(timezone=True), nullable=False),
    sa.Column('zvezdice', sa.Integer(), nullable=False),
    sa.Column('najbolje', sa.Integer(), nullable=False),
    sa.Column('prolazaka', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_nivoi_korisnika_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_nivoi_korisnika_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('korisnik_id', 'kurs_id', 'nivo', name=op.f('pk_nivoi_korisnika'))
    )
    op.create_table('zrna',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('iznos', sa.Integer(), nullable=False),
    sa.Column('razlog', sa.String(length=20), nullable=False),
    sa.Column('objekat', sa.String(length=60), nullable=True),
    sa.Column('dan', sa.Date(), nullable=False),
    sa.Column('u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_zrna_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_zrna_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_zrna'))
    )
    op.create_index(op.f('ix_zrna_dan'), 'zrna', ['dan'], unique=False)
    op.create_index(op.f('ix_zrna_korisnik_id'), 'zrna', ['korisnik_id'], unique=False)
    op.create_table('prolazi_nivoa',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('verzija_id', sa.Integer(), nullable=False),
    sa.Column('nivo', sa.String(length=20), nullable=False),
    sa.Column('pocetak', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('kraj', sa.DateTime(timezone=True), nullable=True),
    sa.Column('poeni', sa.Float(), server_default=sa.text('0'), nullable=False),
    sa.Column('izazova', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('greske', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('niz', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('zrna', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('zvezdice', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_prolazi_nivoa_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_prolazi_nivoa_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['verzija_id'], ['sadrzaj_verzije.id'], name=op.f('fk_prolazi_nivoa_verzija_id_sadrzaj_verzije'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_prolazi_nivoa'))
    )
    op.create_index(op.f('ix_prolazi_nivoa_korisnik_id'), 'prolazi_nivoa', ['korisnik_id'], unique=False)
    op.create_table('odgovori',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('verzija_id', sa.Integer(), nullable=False),
    sa.Column('pitanje', sa.String(length=40), nullable=False),
    sa.Column('nivo', sa.String(length=20), nullable=False),
    sa.Column('kontekst', sa.String(length=20), nullable=False),
    sa.Column('prolaz_id', sa.Integer(), nullable=True),
    sa.Column('rezultat', sa.Float(), nullable=False),
    sa.Column('vreme_ms', sa.Integer(), nullable=True),
    sa.Column('u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_odgovori_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_odgovori_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['prolaz_id'], ['prolazi_nivoa.id'], name=op.f('fk_odgovori_prolaz_id_prolazi_nivoa'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['verzija_id'], ['sadrzaj_verzije.id'], name=op.f('fk_odgovori_verzija_id_sadrzaj_verzije'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_odgovori')),
    sa.UniqueConstraint('prolaz_id', 'pitanje', name='uq_odgovori_prolaz_pitanje')
    )
    op.create_index(op.f('ix_odgovori_korisnik_id'), 'odgovori', ['korisnik_id'], unique=False)
    op.create_index(op.f('ix_odgovori_pitanje'), 'odgovori', ['pitanje'], unique=False)
    op.create_index(op.f('ix_odgovori_prolaz_id'), 'odgovori', ['prolaz_id'], unique=False)
    op.add_column('korisnici', sa.Column('avatar', sa.String(length=20), nullable=True))
    op.add_column('lokali', sa.Column('format', sa.String(length=30), nullable=True))
    op.add_column('lokali', sa.Column('izvor', sa.String(length=20), server_default='rucno', nullable=False))
    op.add_column('lokali', sa.Column('portal_id', sa.Integer(), nullable=True))
    op.create_unique_constraint(op.f('uq_lokali_portal_id'), 'lokali', ['portal_id'])


def downgrade() -> None:
    op.drop_constraint(op.f('uq_lokali_portal_id'), 'lokali', type_='unique')
    op.drop_column('lokali', 'portal_id')
    op.drop_column('lokali', 'izvor')
    op.drop_column('lokali', 'format')
    op.drop_column('korisnici', 'avatar')
    op.drop_index(op.f('ix_odgovori_prolaz_id'), table_name='odgovori')
    op.drop_index(op.f('ix_odgovori_pitanje'), table_name='odgovori')
    op.drop_index(op.f('ix_odgovori_korisnik_id'), table_name='odgovori')
    op.drop_table('odgovori')
    op.drop_index(op.f('ix_prolazi_nivoa_korisnik_id'), table_name='prolazi_nivoa')
    op.drop_table('prolazi_nivoa')
    op.drop_index(op.f('ix_zrna_korisnik_id'), table_name='zrna')
    op.drop_index(op.f('ix_zrna_dan'), table_name='zrna')
    op.drop_table('zrna')
    op.drop_table('nivoi_korisnika')
    op.drop_table('kartice_korisnika')
    op.drop_table('bedzevi_korisnika')
