"""add expected date to exam orders

Revision ID: 0010_exam_order_expected_date
Revises: 0009_communications
Create Date: 2026-03-14 21:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = "0010_exam_order_expected_date"
down_revision = "0009_communications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exam_orders", sa.Column("expected_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("exam_orders", "expected_date")
