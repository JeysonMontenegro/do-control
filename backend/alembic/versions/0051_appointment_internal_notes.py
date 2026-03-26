"""add appointment internal notes

Revision ID: 0051_appointment_internal_notes
Revises: 0050_doctor_title
Create Date: 2026-03-26 00:25:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0051_appointment_internal_notes"
down_revision = "0050_doctor_title"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("internal_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("appointments", "internal_notes")
