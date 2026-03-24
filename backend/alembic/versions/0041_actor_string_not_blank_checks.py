"""add actor string not blank checks

Revision ID: 0041_actor_string_quality
Revises: 0040_user_doctor_quality
Create Date: 2026-03-24
"""

from alembic import op


revision = "0041_actor_string_quality"
down_revision = "0040_user_doctor_quality"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_appointments_created_by_not_blank", "appointments", "created_by IS NULL OR btrim(created_by) <> ''")
    op.create_check_constraint("ck_appointment_history_changed_by_not_blank", "appointment_history", "changed_by IS NULL OR btrim(changed_by) <> ''")
    op.create_check_constraint("ck_encounters_created_by_not_blank", "encounters", "created_by IS NULL OR btrim(created_by) <> ''")
    op.create_check_constraint("ck_file_attachments_uploaded_by_not_blank", "file_attachments", "uploaded_by IS NULL OR btrim(uploaded_by) <> ''")


def downgrade() -> None:
    op.drop_constraint("ck_file_attachments_uploaded_by_not_blank", "file_attachments", type_="check")
    op.drop_constraint("ck_encounters_created_by_not_blank", "encounters", type_="check")
    op.drop_constraint("ck_appointment_history_changed_by_not_blank", "appointment_history", type_="check")
    op.drop_constraint("ck_appointments_created_by_not_blank", "appointments", type_="check")
