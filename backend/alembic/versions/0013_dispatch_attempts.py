"""add communication dispatch attempts

Revision ID: 0013_dispatch_attempts
Revises: 0012_dispatch_retry_backoff
Create Date: 2026-03-14 22:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0013_dispatch_attempts"
down_revision = "0012_dispatch_retry_backoff"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "communication_dispatch_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dispatch_id", sa.Integer(), sa.ForeignKey("communication_dispatches.id"), nullable=False),
        sa.Column("attempt_source", sa.String(length=50), nullable=False, server_default="system"),
        sa.Column("result_status", sa.String(length=30), nullable=False),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("external_reference", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("rendered_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("communication_dispatch_attempts")
