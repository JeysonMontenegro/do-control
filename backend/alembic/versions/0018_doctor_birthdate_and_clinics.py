"""doctor birthdate and clinics

Revision ID: 0018_doctor_clinics
Revises: 0017_patient_doctor_assignments
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0018_doctor_clinics"
down_revision = "0017_patient_doctor_assignments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("doctors", sa.Column("date_of_birth", sa.Date(), nullable=True))
    op.create_table(
        "doctor_clinics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("clinic_name", sa.String(length=150), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone_number", sa.String(length=30), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("doctor_clinics")
    op.drop_column("doctors", "date_of_birth")
