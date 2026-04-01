"""add patient display name

Revision ID: 0053_patient_display_name
Revises: 0052_doctor_clinic_coordinates
Create Date: 2026-04-01 00:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0053_patient_display_name"
down_revision = "0052_doctor_clinic_coordinates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("display_name", sa.String(length=150), nullable=True))
    op.create_check_constraint(
        "ck_patients_display_name_not_blank",
        "patients",
        "display_name IS NULL OR btrim(display_name) <> ''",
    )


def downgrade() -> None:
    op.drop_constraint("ck_patients_display_name_not_blank", "patients", type_="check")
    op.drop_column("patients", "display_name")
