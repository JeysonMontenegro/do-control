"""add appointment review items

Revision ID: 0014_appointment_review_items
Revises: 0013_dispatch_attempts
Create Date: 2026-03-15 22:30:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0014_appointment_review_items"
down_revision = "0013_dispatch_attempts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "appointment_review_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_name", sa.String(length=255), nullable=False),
        sa.Column("phone_number", sa.String(length=30), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=True),
        sa.Column("doctor_name", sa.String(length=255), nullable=True),
        sa.Column("doctor_phone_number", sa.String(length=30), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("appointment_type", sa.String(length=100), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=30), server_default="appoint-me", nullable=False),
        sa.Column("review_status", sa.String(length=30), server_default="pending_review", nullable=False),
        sa.Column("review_reason", sa.String(length=50), nullable=False),
        sa.Column("review_message", sa.Text(), nullable=False),
        sa.Column("existing_appointment_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.ForeignKeyConstraint(["existing_appointment_id"], ["appointments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("appointment_review_items")
