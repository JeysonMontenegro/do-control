"""add email whitelist to clinic settings

Revision ID: 0049_email_wl
Revises: 0048_msg_whitelist
Create Date: 2026-03-24 22:55:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0049_email_wl"
down_revision: str | None = "0048_msg_whitelist"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clinic_settings", sa.Column("email_whitelist_enabled", sa.Boolean(), nullable=True))
    op.add_column(
        "clinic_settings",
        sa.Column("email_whitelist_addresses", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("clinic_settings", "email_whitelist_addresses")
    op.drop_column("clinic_settings", "email_whitelist_enabled")
