"""add patient owner and attachment owner fields

Revision ID: 0030_patient_owner_attach
Revises: 0029_owner_doctor_fields
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0030_patient_owner_attach"
down_revision = "0029_owner_doctor_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("owner_doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True))
    op.add_column("file_attachments", sa.Column("owner_doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=True))

    op.create_index("ix_patients_owner_doctor_id", "patients", ["owner_doctor_id"], unique=False)
    op.create_index("ix_file_attachments_owner_doctor_id", "file_attachments", ["owner_doctor_id"], unique=False)

    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE patients AS p
        SET owner_doctor_id = chosen.doctor_id
        FROM (
            SELECT DISTINCT ON (patient_id)
                patient_id,
                doctor_id
            FROM patient_doctor_assignments
            ORDER BY patient_id, created_at ASC, id ASC
        ) AS chosen
        WHERE p.id = chosen.patient_id
          AND p.owner_doctor_id IS NULL
    """))
    connection.execute(sa.text("""
        UPDATE file_attachments AS fa
        SET owner_doctor_id = COALESCE(
            (SELECT e.owner_doctor_id FROM encounters AS e WHERE e.id = fa.encounter_id),
            (SELECT e.doctor_id FROM encounters AS e WHERE e.id = fa.encounter_id),
            (SELECT p.owner_doctor_id FROM patients AS p WHERE p.id = fa.patient_id)
        )
        WHERE fa.owner_doctor_id IS NULL
    """))


def downgrade() -> None:
    op.drop_index("ix_file_attachments_owner_doctor_id", table_name="file_attachments")
    op.drop_index("ix_patients_owner_doctor_id", table_name="patients")
    op.drop_column("file_attachments", "owner_doctor_id")
    op.drop_column("patients", "owner_doctor_id")
