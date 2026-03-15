"""add exam order dispatch support

Revision ID: 0011_dispatch_exam_rule
Revises: 0010_exam_order_expected_date
Create Date: 2026-03-14 21:25:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0011_dispatch_exam_rule"
down_revision = "0010_exam_order_expected_date"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("communication_dispatches", sa.Column("exam_order_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_communication_dispatches_exam_order_id",
        "communication_dispatches",
        "exam_orders",
        ["exam_order_id"],
        ["id"],
    )
    op.execute(
        """
        INSERT INTO communication_templates (doctor_id, channel, template_key, title, body, is_active, created_at, updated_at)
        VALUES (
          NULL,
          'whatsapp',
          'exam_due_today',
          'Examen pendiente hoy',
          'Recordatorio para {doctor_name}: el examen {exam_name} del paciente {patient_name} está pendiente para {expected_date}.',
          true,
          now(),
          now()
        )
        ON CONFLICT DO NOTHING;

        INSERT INTO reminder_rules (doctor_id, channel, trigger_type, minutes_before, template_key, is_active, created_at, updated_at)
        VALUES (
          NULL,
          'whatsapp',
          'on_expected_exam_date',
          0,
          'exam_due_today',
          true,
          now(),
          now()
        );
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM reminder_rules WHERE trigger_type = 'on_expected_exam_date' AND template_key = 'exam_due_today'")
    op.execute("DELETE FROM communication_templates WHERE template_key = 'exam_due_today'")
    op.drop_constraint("fk_communication_dispatches_exam_order_id", "communication_dispatches", type_="foreignkey")
    op.drop_column("communication_dispatches", "exam_order_id")
