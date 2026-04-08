"""require owner doctor on appointments and encounters

Revision ID: 0059_core_owner_doctor
Revises: 0058_attachment_owner
Create Date: 2026-04-07 10:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0059_core_owner_doctor"
down_revision = "0058_attachment_owner"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE appointments
        SET owner_doctor_id = doctor_id
        WHERE owner_doctor_id IS NULL
          AND doctor_id IS NOT NULL
        """
    )
    unresolved_appointments = op.get_bind().execute(
        sa.text("SELECT count(*) FROM appointments WHERE owner_doctor_id IS NULL")
    ).scalar_one()
    if unresolved_appointments:
        raise RuntimeError("Cannot enforce NOT NULL on appointments.owner_doctor_id; unresolved rows remain.")
    op.alter_column("appointments", "owner_doctor_id", existing_type=sa.Integer(), nullable=False)

    op.execute(
        """
        UPDATE encounters
        SET owner_doctor_id = doctor_id
        WHERE owner_doctor_id IS NULL
          AND doctor_id IS NOT NULL
        """
    )
    unresolved_encounters = op.get_bind().execute(
        sa.text("SELECT count(*) FROM encounters WHERE owner_doctor_id IS NULL")
    ).scalar_one()
    if unresolved_encounters:
        raise RuntimeError("Cannot enforce NOT NULL on encounters.owner_doctor_id; unresolved rows remain.")
    op.alter_column("encounters", "owner_doctor_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column("encounters", "owner_doctor_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("appointments", "owner_doctor_id", existing_type=sa.Integer(), nullable=True)
