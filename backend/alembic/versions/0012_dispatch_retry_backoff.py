"""add retry tracking to communication dispatches

Revision ID: 0012_dispatch_retry_backoff
Revises: 0011_dispatch_exam_rule
Create Date: 2026-03-14 21:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0012_dispatch_retry_backoff"
down_revision = "0011_dispatch_exam_rule"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "communication_dispatches",
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "communication_dispatches",
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "communication_dispatches",
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(
        """
        UPDATE communication_dispatches
        SET next_attempt_at = created_at
        WHERE status = 'pending' AND next_attempt_at IS NULL
        """
    )
    op.alter_column("communication_dispatches", "retry_count", server_default=None)


def downgrade() -> None:
    op.drop_column("communication_dispatches", "next_attempt_at")
    op.drop_column("communication_dispatches", "last_attempt_at")
    op.drop_column("communication_dispatches", "retry_count")
