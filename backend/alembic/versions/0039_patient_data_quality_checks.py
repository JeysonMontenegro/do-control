"""add patient data quality checks

Revision ID: 0039_patient_quality
Revises: 0038_patient_ownership
Create Date: 2026-03-24
"""

from alembic import op


revision = "0039_patient_quality"
down_revision = "0038_patient_ownership"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_patients_first_name_not_blank", "patients", "btrim(first_name) <> ''")
    op.create_check_constraint("ck_patients_last_name_not_blank", "patients", "btrim(last_name) <> ''")
    op.create_check_constraint("ck_patients_primary_phone_not_blank", "patients", "btrim(primary_phone) <> ''")
    op.create_check_constraint("ck_patients_mrn_not_blank", "patients", "btrim(medical_record_number) <> ''")
    op.create_check_constraint("ck_patients_national_id_not_blank", "patients", "national_id IS NULL OR btrim(national_id) <> ''")
    op.create_check_constraint("ck_patients_tax_id_not_blank", "patients", "tax_id IS NULL OR btrim(tax_id) <> ''")


def downgrade() -> None:
    op.drop_constraint("ck_patients_tax_id_not_blank", "patients", type_="check")
    op.drop_constraint("ck_patients_national_id_not_blank", "patients", type_="check")
    op.drop_constraint("ck_patients_mrn_not_blank", "patients", type_="check")
    op.drop_constraint("ck_patients_primary_phone_not_blank", "patients", type_="check")
    op.drop_constraint("ck_patients_last_name_not_blank", "patients", type_="check")
    op.drop_constraint("ck_patients_first_name_not_blank", "patients", type_="check")
