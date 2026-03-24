"""add user and doctor data quality constraints

Revision ID: 0040_user_doctor_quality
Revises: 0039_patient_quality
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0040_user_doctor_quality"
down_revision = "0039_patient_quality"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_users_email_not_blank", "users", "btrim(email) <> ''")
    op.create_check_constraint("ck_users_first_name_not_blank", "users", "btrim(first_name) <> ''")
    op.create_check_constraint("ck_users_last_name_not_blank", "users", "btrim(last_name) <> ''")
    op.create_check_constraint("ck_doctors_license_number_not_blank", "doctors", "license_number IS NULL OR btrim(license_number) <> ''")
    op.create_check_constraint("ck_doctors_specialty_not_blank", "doctors", "specialty IS NULL OR btrim(specialty) <> ''")
    op.create_index(
        "uq_doctors_license_number",
        "doctors",
        ["license_number"],
        unique=True,
        postgresql_where=sa.text("license_number IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_doctors_license_number", table_name="doctors")
    op.drop_constraint("ck_doctors_specialty_not_blank", "doctors", type_="check")
    op.drop_constraint("ck_doctors_license_number_not_blank", "doctors", type_="check")
    op.drop_constraint("ck_users_last_name_not_blank", "users", type_="check")
    op.drop_constraint("ck_users_first_name_not_blank", "users", type_="check")
    op.drop_constraint("ck_users_email_not_blank", "users", type_="check")
