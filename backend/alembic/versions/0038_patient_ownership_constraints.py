"""add patient ownership constraints

Revision ID: 0038_patient_ownership
Revises: 0037_status_checks
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0038_patient_ownership"
down_revision = "0037_status_checks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("patients", "owner_doctor_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        "fk_patients_owner_assignment",
        "patients",
        "patient_doctor_assignments",
        ["id", "owner_doctor_id"],
        ["patient_id", "doctor_id"],
        deferrable=True,
        initially="DEFERRED",
    )


def downgrade() -> None:
    op.drop_constraint("fk_patients_owner_assignment", "patients", type_="foreignkey")
    op.alter_column("patients", "owner_doctor_id", existing_type=sa.Integer(), nullable=True)
