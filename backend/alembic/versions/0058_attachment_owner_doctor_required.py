"""require owner doctor on file attachments

Revision ID: 0058_attachment_owner
Revises: 0057_exam_owner_doctor
Create Date: 2026-04-03 15:55:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0058_attachment_owner"
down_revision = "0057_exam_owner_doctor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE file_attachments AS fa
        SET owner_doctor_id = COALESCE(
            fa.owner_doctor_id,
            (
                SELECT enc.owner_doctor_id
                FROM encounters AS enc
                WHERE enc.id = fa.encounter_id
            ),
            (
                SELECT enc.doctor_id
                FROM encounters AS enc
                WHERE enc.id = fa.encounter_id
            ),
            (
                SELECT p.owner_doctor_id
                FROM patients AS p
                WHERE p.id = fa.patient_id
            )
        )
        WHERE fa.owner_doctor_id IS NULL
        """
    )

    unresolved = op.get_bind().execute(
        sa.text("SELECT count(*) FROM file_attachments WHERE owner_doctor_id IS NULL")
    ).scalar_one()
    if unresolved:
        raise RuntimeError("Cannot enforce NOT NULL on file_attachments.owner_doctor_id; unresolved rows remain.")

    op.alter_column("file_attachments", "owner_doctor_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column("file_attachments", "owner_doctor_id", existing_type=sa.Integer(), nullable=True)
