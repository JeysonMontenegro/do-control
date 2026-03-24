"""add phone and schedule constraints

Revision ID: 0034_phone_schedule_ck
Revises: 0033_drop_user_phone
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0034_phone_schedule_ck"
down_revision = "0033_drop_user_phone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_doctor_phone_numbers_primary_active",
        "doctor_phone_numbers",
        ["doctor_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true AND is_active = true"),
    )
    op.create_index(
        "uq_patient_phone_numbers_primary_active",
        "patient_phone_numbers",
        ["patient_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true AND is_active = true"),
    )
    op.create_check_constraint(
        "ck_appointments_scheduled_range",
        "appointments",
        "scheduled_end > scheduled_start",
    )


def downgrade() -> None:
    op.drop_constraint("ck_appointments_scheduled_range", "appointments", type_="check")
    op.drop_index("uq_patient_phone_numbers_primary_active", table_name="patient_phone_numbers")
    op.drop_index("uq_doctor_phone_numbers_primary_active", table_name="doctor_phone_numbers")
