"""patient doctor assignments

Revision ID: 0017_patient_doctor_assignments
Revises: 0016_clinic_settings
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0017_patient_doctor_assignments"
down_revision = "0016_clinic_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patient_doctor_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("patient_id", "doctor_id", name="uq_patient_doctor_assignment"),
    )
    op.execute(
        """
        INSERT INTO patient_doctor_assignments (patient_id, doctor_id)
        SELECT DISTINCT patient_id, doctor_id FROM appointments
        WHERE patient_id IS NOT NULL AND doctor_id IS NOT NULL
        ON CONFLICT ON CONSTRAINT uq_patient_doctor_assignment DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO patient_doctor_assignments (patient_id, doctor_id)
        SELECT DISTINCT patient_id, doctor_id FROM encounters
        WHERE patient_id IS NOT NULL AND doctor_id IS NOT NULL
        ON CONFLICT ON CONSTRAINT uq_patient_doctor_assignment DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("patient_doctor_assignments")
