"""add patient phone numbers

Revision ID: 0005_patient_phone_numbers
Revises: 0004_seed_role_users
Create Date: 2026-03-14 00:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0005_patient_phone_numbers"
down_revision = "0004_seed_role_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patient_phone_numbers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("phone_number", sa.String(length=30), nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_patient_phone_numbers_phone_number", "patient_phone_numbers", ["phone_number"], unique=False)
    op.execute(
        """
        INSERT INTO patient_phone_numbers (patient_id, phone_number, is_primary, is_active, created_at, updated_at)
        SELECT id, primary_phone, true, true, now(), now()
        FROM patients
        WHERE primary_phone IS NOT NULL AND primary_phone <> '';
        """
    )


def downgrade() -> None:
    op.drop_index("ix_patient_phone_numbers_phone_number", table_name="patient_phone_numbers")
    op.drop_table("patient_phone_numbers")
