"""add reminder rules

Revision ID: 0006_reminder_rules
Revises: 0005_patient_phone_numbers
Create Date: 2026-03-14 00:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0006_reminder_rules"
down_revision = "0005_patient_phone_numbers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reminder_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=True),
        sa.Column("channel", sa.String(length=30), server_default="whatsapp", nullable=False),
        sa.Column("trigger_type", sa.String(length=30), server_default="before_appointment", nullable=False),
        sa.Column("minutes_before", sa.Integer(), nullable=False),
        sa.Column("template_key", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        """
        INSERT INTO reminder_rules (id, doctor_id, channel, trigger_type, minutes_before, template_key, is_active, created_at, updated_at)
        VALUES
        (1, NULL, 'whatsapp', 'before_appointment', 1440, 'appointment_24h', true, now(), now()),
        (2, NULL, 'whatsapp', 'before_appointment', 120, 'appointment_2h', true, now(), now());
        """
    )


def downgrade() -> None:
    op.drop_table("reminder_rules")
