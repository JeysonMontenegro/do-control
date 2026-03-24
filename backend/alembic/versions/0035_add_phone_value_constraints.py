"""add phone value constraints

Revision ID: 0035_phone_value_ck
Revises: 0034_phone_schedule_ck
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0035_phone_value_ck"
down_revision = "0034_phone_schedule_ck"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_doctor_phone_numbers_doctor_phone",
        "doctor_phone_numbers",
        ["doctor_id", "phone_number"],
    )
    op.create_unique_constraint(
        "uq_patient_phone_numbers_patient_phone",
        "patient_phone_numbers",
        ["patient_id", "phone_number"],
    )
    op.create_check_constraint(
        "ck_user_phone_numbers_not_blank",
        "user_phone_numbers",
        "length(btrim(phone_number)) > 0",
    )
    op.create_check_constraint(
        "ck_doctor_phone_numbers_not_blank",
        "doctor_phone_numbers",
        "length(btrim(phone_number)) > 0",
    )
    op.create_check_constraint(
        "ck_patient_phone_numbers_not_blank",
        "patient_phone_numbers",
        "length(btrim(phone_number)) > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_patient_phone_numbers_not_blank", "patient_phone_numbers", type_="check")
    op.drop_constraint("ck_doctor_phone_numbers_not_blank", "doctor_phone_numbers", type_="check")
    op.drop_constraint("ck_user_phone_numbers_not_blank", "user_phone_numbers", type_="check")
    op.drop_constraint("uq_patient_phone_numbers_patient_phone", "patient_phone_numbers", type_="unique")
    op.drop_constraint("uq_doctor_phone_numbers_doctor_phone", "doctor_phone_numbers", type_="unique")
