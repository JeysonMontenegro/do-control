"""add doctor clinic coordinates

Revision ID: 0052_doctor_clinic_coordinates
Revises: 0051_appointment_internal_notes
Create Date: 2026-03-26 00:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0052_doctor_clinic_coordinates"
down_revision = "0051_appointment_internal_notes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("doctor_clinics", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("doctor_clinics", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("doctor_clinics", "longitude")
    op.drop_column("doctor_clinics", "latitude")
