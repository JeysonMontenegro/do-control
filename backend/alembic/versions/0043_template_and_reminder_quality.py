"""add template and reminder quality constraints

Revision ID: 0043_template_reminder_quality
Revises: 0042_file_attachment_quality
Create Date: 2026-03-24
"""

from alembic import op


revision = "0043_template_reminder_quality"
down_revision = "0042_file_attachment_quality"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_communication_templates_doctor_channel_key",
        "communication_templates",
        ["doctor_id", "channel", "template_key"],
    )
    op.create_check_constraint("ck_communication_templates_template_key_not_blank", "communication_templates", "btrim(template_key) <> ''")
    op.create_check_constraint("ck_communication_templates_title_not_blank", "communication_templates", "btrim(title) <> ''")
    op.create_check_constraint("ck_communication_templates_body_not_blank", "communication_templates", "btrim(body) <> ''")
    op.create_check_constraint("ck_reminder_rules_template_key_not_blank", "reminder_rules", "btrim(template_key) <> ''")
    op.create_check_constraint("ck_reminder_rules_minutes_before_positive", "reminder_rules", "minutes_before > 0")


def downgrade() -> None:
    op.drop_constraint("ck_reminder_rules_minutes_before_positive", "reminder_rules", type_="check")
    op.drop_constraint("ck_reminder_rules_template_key_not_blank", "reminder_rules", type_="check")
    op.drop_constraint("ck_communication_templates_body_not_blank", "communication_templates", type_="check")
    op.drop_constraint("ck_communication_templates_title_not_blank", "communication_templates", type_="check")
    op.drop_constraint("ck_communication_templates_template_key_not_blank", "communication_templates", type_="check")
    op.drop_constraint("uq_communication_templates_doctor_channel_key", "communication_templates", type_="unique")
