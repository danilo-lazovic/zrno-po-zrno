"""kostur

Revision ID: 0001
Revises:
Create Date: 2026-10-20 14:06:56.361527
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('kursevi',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('kljuc', sa.String(length=40), nullable=False),
    sa.Column('naziv', sa.String(length=120), nullable=False),
    sa.Column('opis', sa.Text(), nullable=True),
    sa.Column('aktivan', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('redosled', sa.Integer(), server_default='0', nullable=False),
    sa.Column('verzija_id', sa.Integer(), nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_kursevi')),
    sa.UniqueConstraint('kljuc', name=op.f('uq_kursevi_kljuc'))
    )
    op.create_table('lokali',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('naziv', sa.String(length=120), nullable=False),
    sa.Column('grad', sa.String(length=80), nullable=True),
    sa.Column('aktivan', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_lokali')),
    sa.UniqueConstraint('naziv', name=op.f('uq_lokali_naziv'))
    )
    op.create_table('korisnici',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('ime', sa.String(length=80), nullable=False),
    sa.Column('prezime', sa.String(length=80), nullable=False),
    sa.Column('korisnicko_ime', sa.String(length=254), nullable=False),
    sa.Column('email', sa.String(length=254), nullable=True),
    sa.Column('uloga', sa.String(length=20), nullable=False),
    sa.Column('lokal_id', sa.Integer(), nullable=True),
    sa.Column('lozinka_hash', sa.String(length=255), nullable=True),
    sa.Column('pin_hash', sa.String(length=255), nullable=True),
    sa.Column('neuspeli_pin', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('zakljucan', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('aktivan', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('sesije_od', sa.DateTime(timezone=True), nullable=True),
    sa.Column('poslednja_prijava', sa.DateTime(timezone=True), nullable=True),
    sa.Column('kreiran_u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('kreirao_id', sa.Integer(), nullable=True),
    sa.CheckConstraint("uloga IN ('admin', 'trener', 'menadzer', 'polaznik')", name=op.f('ck_korisnici_uloga')),
    sa.ForeignKeyConstraint(['kreirao_id'], ['korisnici.id'], name=op.f('fk_korisnici_kreirao_id_korisnici'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['lokal_id'], ['lokali.id'], name=op.f('fk_korisnici_lokal_id_lokali'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_korisnici')),
    sa.UniqueConstraint('email', name=op.f('uq_korisnici_email')),
    sa.UniqueConstraint('korisnicko_ime', name=op.f('uq_korisnici_korisnicko_ime'))
    )
    op.create_index(op.f('ix_korisnici_lokal_id'), 'korisnici', ['lokal_id'], unique=False)
    op.create_index(op.f('ix_korisnici_uloga'), 'korisnici', ['uloga'], unique=False)
    op.create_table('pitanja',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('kljuc', sa.String(length=40), nullable=False),
    sa.Column('nivo', sa.String(length=20), nullable=False),
    sa.Column('tip', sa.String(length=20), nullable=False),
    sa.Column('gde', sa.String(length=20), nullable=False),
    sa.Column('tekst', sa.Text(), nullable=False),
    sa.Column('za_test', sa.Boolean(), nullable=False),
    sa.Column('aktivno', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_pitanja_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_pitanja')),
    sa.UniqueConstraint('kurs_id', 'kljuc', name='uq_pitanja_kurs_kljuc')
    )
    op.create_index(op.f('ix_pitanja_kurs_id'), 'pitanja', ['kurs_id'], unique=False)
    op.create_table('audit_log',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('korisnik_id', sa.Integer(), nullable=True),
    sa.Column('korisnik_naziv', sa.String(length=254), nullable=True),
    sa.Column('kada', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('akcija', sa.String(length=60), nullable=False),
    sa.Column('objekat', sa.String(length=120), nullable=True),
    sa.Column('detalji', postgresql.JSONB(), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_audit_log_korisnik_id_korisnici'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_audit_log'))
    )
    op.create_index(op.f('ix_audit_log_akcija'), 'audit_log', ['akcija'], unique=False)
    op.create_index(op.f('ix_audit_log_kada'), 'audit_log', ['kada'], unique=False)
    op.create_index(op.f('ix_audit_log_korisnik_id'), 'audit_log', ['korisnik_id'], unique=False)
    op.create_table('korisnik_lokal',
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('lokal_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_korisnik_lokal_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['lokal_id'], ['lokali.id'], name=op.f('fk_korisnik_lokal_lokal_id_lokali'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('korisnik_id', 'lokal_id', name=op.f('pk_korisnik_lokal'))
    )
    op.create_index(op.f('ix_korisnik_lokal_lokal_id'), 'korisnik_lokal', ['lokal_id'], unique=False)
    op.create_table('pozivnice',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('korisnik_id', sa.Integer(), nullable=False),
    sa.Column('otisak', sa.String(length=64), nullable=False),
    sa.Column('istice_u', sa.DateTime(timezone=True), nullable=False),
    sa.Column('iskoriscena_u', sa.DateTime(timezone=True), nullable=True),
    sa.Column('ponistena_u', sa.DateTime(timezone=True), nullable=True),
    sa.Column('kreirao_id', sa.Integer(), nullable=True),
    sa.Column('kreirana_u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['korisnik_id'], ['korisnici.id'], name=op.f('fk_pozivnice_korisnik_id_korisnici'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['kreirao_id'], ['korisnici.id'], name=op.f('fk_pozivnice_kreirao_id_korisnici'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_pozivnice')),
    sa.UniqueConstraint('otisak', name=op.f('uq_pozivnice_otisak'))
    )
    op.create_index(op.f('ix_pozivnice_korisnik_id'), 'pozivnice', ['korisnik_id'], unique=False)
    op.create_table('sadrzaj_verzije',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('kurs_id', sa.Integer(), nullable=False),
    sa.Column('broj', sa.Integer(), nullable=False),
    sa.Column('dokument', postgresql.JSONB(), nullable=False),
    sa.Column('otisak', sa.String(length=64), nullable=False),
    sa.Column('napomena', sa.String(length=400), nullable=True),
    sa.Column('kreirana_u', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('objavljena_u', sa.DateTime(timezone=True), nullable=True),
    sa.Column('kreirao_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['kreirao_id'], ['korisnici.id'], name=op.f('fk_sadrzaj_verzije_kreirao_id_korisnici'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['kurs_id'], ['kursevi.id'], name=op.f('fk_sadrzaj_verzije_kurs_id_kursevi'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_sadrzaj_verzije')),
    sa.UniqueConstraint('kurs_id', 'broj', name='uq_sadrzaj_verzije_kurs_broj')
    )
    op.create_index(op.f('ix_sadrzaj_verzije_kurs_id'), 'sadrzaj_verzije', ['kurs_id'], unique=False)
    # kursevi i sadrzaj_verzije pokazuju jedni na druge, pa veza ide posle obe tabele
    op.create_foreign_key(op.f('fk_kursevi_verzija_id_sadrzaj_verzije'), 'kursevi', 'sadrzaj_verzije', ['verzija_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint(op.f('fk_kursevi_verzija_id_sadrzaj_verzije'), 'kursevi', type_='foreignkey')
    op.drop_index(op.f('ix_sadrzaj_verzije_kurs_id'), table_name='sadrzaj_verzije')
    op.drop_table('sadrzaj_verzije')
    op.drop_index(op.f('ix_pozivnice_korisnik_id'), table_name='pozivnice')
    op.drop_table('pozivnice')
    op.drop_index(op.f('ix_korisnik_lokal_lokal_id'), table_name='korisnik_lokal')
    op.drop_table('korisnik_lokal')
    op.drop_index(op.f('ix_audit_log_korisnik_id'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_kada'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_akcija'), table_name='audit_log')
    op.drop_table('audit_log')
    op.drop_index(op.f('ix_pitanja_kurs_id'), table_name='pitanja')
    op.drop_table('pitanja')
    op.drop_index(op.f('ix_korisnici_uloga'), table_name='korisnici')
    op.drop_index(op.f('ix_korisnici_lokal_id'), table_name='korisnici')
    op.drop_table('korisnici')
    op.drop_table('lokali')
    op.drop_table('kursevi')
