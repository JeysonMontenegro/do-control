"""add status check constraints

Revision ID: 0037_status_checks
Revises: 0036_unique_user_phone
Create Date: 2026-03-24
"""

from alembic import op


revision = "0037_status_checks"
down_revision = "0036_unique_user_phone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_appointments_status", "appointments", "status IN ($$scheduled$$, $$confirmed$$, $$cancelled$$)")
    op.create_check_constraint("ck_appointments_confirmation_status", "appointments", "confirmation_status IN ($$pending$$, $$confirmed$$, $$cancelled$$)")
    op.create_check_constraint("ck_appointments_source", "appointments", "source IN ($$receptionist$$, $$appoint-me$$)")
    op.create_check_constraint("ck_encounters_status", "encounters", "status IN ($$draft$$, $$closed$$)")
    op.create_check_constraint("ck_exam_orders_status", "exam_orders", "status IN ($$ordered$$, $$pending_result$$, $$completed$$, $$cancelled$$)")
    op.create_check_constraint("ck_communication_dispatches_status", "communication_dispatches", "status IN ($$pending$$, $$sent$$, $$failed$$, $$cancelled$$)")
    op.create_check_constraint("ck_communication_dispatches_channel", "communication_dispatches", "channel IN ($$whatsapp$$)")
    op.create_check_constraint("ck_reminder_rules_trigger_type", "reminder_rules", "trigger_type IN ($$before_appointment$$, $$on_expected_exam_date$$)")
    op.create_check_constraint("ck_reminder_rules_channel", "reminder_rules", "channel IN ($$whatsapp$$)")
    op.create_check_constraint("ck_communication_templates_channel", "communication_templates", "channel IN ($$whatsapp$$)")
    op.create_check_constraint("ck_doctor_staff_assignments_type", "doctor_staff_assignments", "assignment_type IN ($$receptionist$$)")


def downgrade() -> None:
    op.drop_constraint("ck_doctor_staff_assignments_type", "doctor_staff_assignments", type_="check")
    op.drop_constraint("ck_communication_templates_channel", "communication_templates", type_="check")
    op.drop_constraint("ck_reminder_rules_channel", "reminder_rules", type_="check")
    op.drop_constraint("ck_reminder_rules_trigger_type", "reminder_rules", type_="check")
    op.drop_constraint("ck_communication_dispatches_channel", "communication_dispatches", type_="check")
    op.drop_constraint("ck_communication_dispatches_status", "communication_dispatches", type_="check")
    op.drop_constraint("ck_exam_orders_status", "exam_orders", type_="check")
    op.drop_constraint("ck_encounters_status", "encounters", type_="check")
    op.drop_constraint("ck_appointments_source", "appointments", type_="check")
    op.drop_constraint("ck_appointments_confirmation_status", "appointments", type_="check")
    op.drop_constraint("ck_appointments_status", "appointments", type_="check")
