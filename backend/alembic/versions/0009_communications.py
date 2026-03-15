"""add communication templates and dispatches

Revision ID: 0009_communications
Revises: 0008_sync_seeded_sequences
Create Date: 2026-03-14 01:35:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0009_communications"
down_revision = "0008_sync_seeded_sequences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "communication_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=True),
        sa.Column("channel", sa.String(length=30), server_default="whatsapp", nullable=False),
        sa.Column("template_key", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "communication_dispatches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=True),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column("reminder_rule_id", sa.Integer(), nullable=True),
        sa.Column("template_id", sa.Integer(), nullable=True),
        sa.Column("channel", sa.String(length=30), server_default="whatsapp", nullable=False),
        sa.Column("recipient_phone", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=30), server_default="pending", nullable=False),
        sa.Column("external_reference", sa.String(length=255), nullable=True),
        sa.Column("rendered_message", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"]),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["reminder_rule_id"], ["reminder_rules.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["communication_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        """
        INSERT INTO communication_templates (id, doctor_id, channel, template_key, title, body, is_active, created_at, updated_at)
        VALUES
        (1, NULL, 'whatsapp', 'appointment_24h', 'Cita 24 horas', 'Hola {patient_name}, le recordamos su cita el {appointment_date} con {doctor_name}.', true, now(), now()),
        (2, NULL, 'whatsapp', 'appointment_2h', 'Cita 2 horas', 'Hola {patient_name}, su cita es hoy a las {appointment_time} con {doctor_name}.', true, now(), now());
        """
    )
    op.execute(
        """
        SELECT setval(pg_get_serial_sequence('communication_templates', 'id'), COALESCE((SELECT MAX(id) FROM communication_templates), 1), true);
        SELECT setval(pg_get_serial_sequence('communication_dispatches', 'id'), COALESCE((SELECT MAX(id) FROM communication_dispatches), 1), true);
        """
    )


def downgrade() -> None:
    op.drop_table("communication_dispatches")
    op.drop_table("communication_templates")
