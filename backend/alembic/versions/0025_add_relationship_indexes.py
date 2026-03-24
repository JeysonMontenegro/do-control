"""add relationship and queue indexes

Revision ID: 0025_add_relationship_indexes
Revises: 0024_require_doctor_user_links
Create Date: 2026-03-23
"""

from alembic import op


revision = "0025_add_relationship_indexes"
down_revision = "0024_require_doctor_user_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_appointment_history_appointment_created",
        "appointment_history",
        ["appointment_id", "created_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_review_items_doctor_id",
        "appointment_review_items",
        ["doctor_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_review_items_review_status_created",
        "appointment_review_items",
        ["review_status", "created_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_communication_dispatch_attempts_dispatch_attempted",
        "communication_dispatch_attempts",
        ["dispatch_id", "attempted_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_communication_dispatches_appointment_rule",
        "communication_dispatches",
        ["appointment_id", "reminder_rule_id"],
        unique=False,
    )
    op.create_index(
        "ix_communication_dispatches_doctor_id",
        "communication_dispatches",
        ["doctor_id"],
        unique=False,
    )
    op.create_index(
        "ix_communication_dispatches_exam_order_rule",
        "communication_dispatches",
        ["exam_order_id", "reminder_rule_id"],
        unique=False,
    )
    op.create_index(
        "ix_communication_dispatches_patient_id",
        "communication_dispatches",
        ["patient_id"],
        unique=False,
    )
    op.create_index(
        "ix_communication_dispatches_status_next_attempt",
        "communication_dispatches",
        ["status", "next_attempt_at"],
        unique=False,
    )
    op.create_index("ix_diagnoses_encounter_id", "diagnoses", ["encounter_id"], unique=False)
    op.create_index("ix_doctor_clinics_doctor_id", "doctor_clinics", ["doctor_id"], unique=False)
    op.create_index("ix_doctor_phone_numbers_doctor_id", "doctor_phone_numbers", ["doctor_id"], unique=False)
    op.create_index("ix_encounters_doctor_id", "encounters", ["doctor_id"], unique=False)
    op.create_index("ix_encounters_patient_id", "encounters", ["patient_id"], unique=False)
    op.create_index("ix_exam_orders_encounter_id", "exam_orders", ["encounter_id"], unique=False)
    op.create_index(
        "ix_file_attachments_encounter_id",
        "file_attachments",
        ["encounter_id"],
        unique=False,
    )
    op.create_index(
        "ix_file_attachments_patient_created",
        "file_attachments",
        ["patient_id", "created_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_patient_doctor_assignments_doctor_id",
        "patient_doctor_assignments",
        ["doctor_id"],
        unique=False,
    )
    op.create_index("ix_patient_phone_numbers_patient_id", "patient_phone_numbers", ["patient_id"], unique=False)
    op.create_index(
        "ix_reminder_rules_active_doctor_minutes",
        "reminder_rules",
        ["is_active", "doctor_id", "minutes_before"],
        unique=False,
    )
    op.create_index(
        "ix_reminder_rules_doctor_minutes",
        "reminder_rules",
        ["doctor_id", "minutes_before"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_reminder_rules_doctor_minutes", table_name="reminder_rules")
    op.drop_index("ix_reminder_rules_active_doctor_minutes", table_name="reminder_rules")
    op.drop_index("ix_patient_phone_numbers_patient_id", table_name="patient_phone_numbers")
    op.drop_index("ix_patient_doctor_assignments_doctor_id", table_name="patient_doctor_assignments")
    op.drop_index("ix_file_attachments_patient_created", table_name="file_attachments")
    op.drop_index("ix_file_attachments_encounter_id", table_name="file_attachments")
    op.drop_index("ix_exam_orders_encounter_id", table_name="exam_orders")
    op.drop_index("ix_encounters_patient_id", table_name="encounters")
    op.drop_index("ix_encounters_doctor_id", table_name="encounters")
    op.drop_index("ix_doctor_phone_numbers_doctor_id", table_name="doctor_phone_numbers")
    op.drop_index("ix_doctor_clinics_doctor_id", table_name="doctor_clinics")
    op.drop_index("ix_diagnoses_encounter_id", table_name="diagnoses")
    op.drop_index("ix_communication_dispatches_status_next_attempt", table_name="communication_dispatches")
    op.drop_index("ix_communication_dispatches_patient_id", table_name="communication_dispatches")
    op.drop_index("ix_communication_dispatches_exam_order_rule", table_name="communication_dispatches")
    op.drop_index("ix_communication_dispatches_doctor_id", table_name="communication_dispatches")
    op.drop_index("ix_communication_dispatches_appointment_rule", table_name="communication_dispatches")
    op.drop_index(
        "ix_communication_dispatch_attempts_dispatch_attempted",
        table_name="communication_dispatch_attempts",
    )
    op.drop_index(
        "ix_appointment_review_items_review_status_created",
        table_name="appointment_review_items",
    )
    op.drop_index("ix_appointment_review_items_doctor_id", table_name="appointment_review_items")
    op.drop_index("ix_appointment_history_appointment_created", table_name="appointment_history")
