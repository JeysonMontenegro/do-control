"""add doctor phone numbers

Revision ID: 0007_doctor_phone_numbers
Revises: 0006_reminder_rules
Create Date: 2026-03-14 00:30:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0007_doctor_phone_numbers"
down_revision = "0006_reminder_rules"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "doctor_phone_numbers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("phone_number", sa.String(length=30), nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("channel_type", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_doctor_phone_numbers_phone_number", "doctor_phone_numbers", ["phone_number"], unique=False)
    op.execute(
        """
        INSERT INTO doctor_phone_numbers (doctor_id, phone_number, is_primary, is_active, channel_type, created_at, updated_at)
        SELECT id, '55510001', true, true, 'whatsapp', now(), now()
        FROM doctors
        WHERE id = 1
        """
    )


def downgrade() -> None:
    op.drop_index("ix_doctor_phone_numbers_phone_number", table_name="doctor_phone_numbers")
    op.drop_table("doctor_phone_numbers")
