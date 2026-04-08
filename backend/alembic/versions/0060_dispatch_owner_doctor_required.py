"""require owner doctor on communication dispatches

Revision ID: 0060_dispatch_owner
Revises: 0059_core_owner_doctor
Create Date: 2026-04-07 10:35:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0060_dispatch_owner"
down_revision = "0059_core_owner_doctor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE communication_dispatches AS cd
        SET owner_doctor_id = COALESCE(
            cd.owner_doctor_id,
            cd.doctor_id,
            (
                SELECT a.owner_doctor_id
                FROM appointments AS a
                WHERE a.id = cd.appointment_id
            ),
            (
                SELECT a.doctor_id
                FROM appointments AS a
                WHERE a.id = cd.appointment_id
            ),
            (
                SELECT enc.owner_doctor_id
                FROM exam_orders AS eo
                JOIN encounters AS enc ON enc.id = eo.encounter_id
                WHERE eo.id = cd.exam_order_id
            ),
            (
                SELECT enc.doctor_id
                FROM exam_orders AS eo
                JOIN encounters AS enc ON enc.id = eo.encounter_id
                WHERE eo.id = cd.exam_order_id
            ),
            (
                SELECT rr.doctor_id
                FROM reminder_rules AS rr
                WHERE rr.id = cd.reminder_rule_id
            ),
            (
                SELECT p.owner_doctor_id
                FROM patients AS p
                WHERE p.id = cd.patient_id
            )
        )
        WHERE cd.owner_doctor_id IS NULL
        """
    )

    unresolved = op.get_bind().execute(
        sa.text("SELECT count(*) FROM communication_dispatches WHERE owner_doctor_id IS NULL")
    ).scalar_one()
    if unresolved:
        raise RuntimeError("Cannot enforce NOT NULL on communication_dispatches.owner_doctor_id; unresolved rows remain.")

    op.alter_column("communication_dispatches", "owner_doctor_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column("communication_dispatches", "owner_doctor_id", existing_type=sa.Integer(), nullable=True)
