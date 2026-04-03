"""require owner doctor on exam analyses

Revision ID: 0057_exam_owner_doctor
Revises: 0056_exam_analysis_security
Create Date: 2026-04-02 12:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0057_exam_owner_doctor"
down_revision = "0056_exam_analysis_security"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE exam_analyses AS ea
        SET owner_doctor_id = COALESCE(
            ea.owner_doctor_id,
            (
                SELECT fa.owner_doctor_id
                FROM file_attachments AS fa
                WHERE fa.id = ea.attachment_id
            ),
            (
                SELECT enc.owner_doctor_id
                FROM encounters AS enc
                WHERE enc.id = ea.encounter_id
            ),
            (
                SELECT enc.doctor_id
                FROM encounters AS enc
                WHERE enc.id = ea.encounter_id
            ),
            (
                SELECT exam_enc.owner_doctor_id
                FROM exam_orders AS eo
                JOIN encounters AS exam_enc ON exam_enc.id = eo.encounter_id
                WHERE eo.id = ea.exam_order_id
            ),
            (
                SELECT exam_enc.doctor_id
                FROM exam_orders AS eo
                JOIN encounters AS exam_enc ON exam_enc.id = eo.encounter_id
                WHERE eo.id = ea.exam_order_id
            ),
            (
                SELECT p.owner_doctor_id
                FROM patients AS p
                WHERE p.id = ea.patient_id
            )
        )
        WHERE ea.owner_doctor_id IS NULL
        """
    )

    unresolved = op.get_bind().execute(
        sa.text("SELECT count(*) FROM exam_analyses WHERE owner_doctor_id IS NULL")
    ).scalar_one()
    if unresolved:
        raise RuntimeError("Cannot enforce NOT NULL on exam_analyses.owner_doctor_id; unresolved rows remain.")

    op.alter_column("exam_analyses", "owner_doctor_id", existing_type=sa.Integer(), nullable=False)
    op.create_index("ix_exam_analyses_owner_doctor_created", "exam_analyses", ["owner_doctor_id", "created_at", "id"])


def downgrade() -> None:
    op.drop_index("ix_exam_analyses_owner_doctor_created", table_name="exam_analyses")
    op.alter_column("exam_analyses", "owner_doctor_id", existing_type=sa.Integer(), nullable=True)
