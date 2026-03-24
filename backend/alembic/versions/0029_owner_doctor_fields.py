"""add owner doctor fields

Revision ID: 0029_owner_doctor_fields
Revises: 0028_doctor_staff_assignments
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0029_owner_doctor_fields"
down_revision = "0028_doctor_staff_assignments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("owner_doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True))
    op.add_column("encounters", sa.Column("owner_doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True))
    op.add_column("communication_templates", sa.Column("owner_doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True))
    op.add_column("reminder_rules", sa.Column("owner_doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True))
    op.add_column("communication_dispatches", sa.Column("owner_doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True))

    op.create_index("ix_appointments_owner_doctor_id", "appointments", ["owner_doctor_id"], unique=False)
    op.create_index("ix_encounters_owner_doctor_id", "encounters", ["owner_doctor_id"], unique=False)
    op.create_index("ix_communication_templates_owner_doctor_id", "communication_templates", ["owner_doctor_id"], unique=False)
    op.create_index("ix_reminder_rules_owner_doctor_id", "reminder_rules", ["owner_doctor_id"], unique=False)
    op.create_index("ix_communication_dispatches_owner_doctor_id", "communication_dispatches", ["owner_doctor_id"], unique=False)

    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE appointments
        SET owner_doctor_id = doctor_id
        WHERE owner_doctor_id IS NULL AND doctor_id IS NOT NULL
    """))
    connection.execute(sa.text("""
        UPDATE encounters
        SET owner_doctor_id = doctor_id
        WHERE owner_doctor_id IS NULL AND doctor_id IS NOT NULL
    """))
    connection.execute(sa.text("""
        UPDATE communication_templates
        SET owner_doctor_id = doctor_id
        WHERE owner_doctor_id IS NULL AND doctor_id IS NOT NULL
    """))
    connection.execute(sa.text("""
        UPDATE reminder_rules
        SET owner_doctor_id = doctor_id
        WHERE owner_doctor_id IS NULL AND doctor_id IS NOT NULL
    """))
    connection.execute(sa.text("""
        UPDATE communication_dispatches AS cd
        SET owner_doctor_id = resolved.owner_doctor_id
        FROM (
            SELECT
                cd_inner.id,
                COALESCE(
                    cd_inner.doctor_id,
                    appointments.doctor_id,
                    encounters.doctor_id,
                    reminder_rules.doctor_id,
                    communication_templates.doctor_id
                ) AS owner_doctor_id
            FROM communication_dispatches AS cd_inner
            LEFT JOIN appointments ON appointments.id = cd_inner.appointment_id
            LEFT JOIN exam_orders ON exam_orders.id = cd_inner.exam_order_id
            LEFT JOIN encounters ON encounters.id = exam_orders.encounter_id
            LEFT JOIN reminder_rules ON reminder_rules.id = cd_inner.reminder_rule_id
            LEFT JOIN communication_templates ON communication_templates.id = cd_inner.template_id
        ) AS resolved
        WHERE cd.id = resolved.id
          AND cd.owner_doctor_id IS NULL
          AND resolved.owner_doctor_id IS NOT NULL
    """))


def downgrade() -> None:
    op.drop_index("ix_communication_dispatches_owner_doctor_id", table_name="communication_dispatches")
    op.drop_index("ix_reminder_rules_owner_doctor_id", table_name="reminder_rules")
    op.drop_index("ix_communication_templates_owner_doctor_id", table_name="communication_templates")
    op.drop_index("ix_encounters_owner_doctor_id", table_name="encounters")
    op.drop_index("ix_appointments_owner_doctor_id", table_name="appointments")

    op.drop_column("communication_dispatches", "owner_doctor_id")
    op.drop_column("reminder_rules", "owner_doctor_id")
    op.drop_column("communication_templates", "owner_doctor_id")
    op.drop_column("encounters", "owner_doctor_id")
    op.drop_column("appointments", "owner_doctor_id")
