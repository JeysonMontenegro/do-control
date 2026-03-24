"""dedupe and enforce reminder rule uniqueness

Revision ID: 0044_reminder_rule_uniqueness
Revises: 0043_template_reminder_quality
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0044_reminder_rule_uniqueness"
down_revision = "0043_template_reminder_quality"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text("UPDATE communication_dispatches SET reminder_rule_id = 1 WHERE reminder_rule_id = 2"))
    connection.execute(sa.text("DELETE FROM reminder_rules WHERE id = 2"))

    op.create_index(
        "uq_reminder_rules_global_trigger_channel_minutes",
        "reminder_rules",
        ["trigger_type", "channel", "minutes_before"],
        unique=True,
        postgresql_where=sa.text("doctor_id IS NULL"),
    )
    op.create_index(
        "uq_reminder_rules_doctor_trigger_channel_minutes",
        "reminder_rules",
        ["doctor_id", "trigger_type", "channel", "minutes_before"],
        unique=True,
        postgresql_where=sa.text("doctor_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_reminder_rules_doctor_trigger_channel_minutes", table_name="reminder_rules")
    op.drop_index("uq_reminder_rules_global_trigger_channel_minutes", table_name="reminder_rules")
