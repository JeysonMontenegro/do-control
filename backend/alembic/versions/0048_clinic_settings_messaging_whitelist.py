"""add messaging whitelist to clinic settings

Revision ID: 0048_msg_whitelist
Revises: 0047_appointment_public_id
Create Date: 2026-03-24 22:40:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0048_msg_whitelist"
down_revision: str | None = "0047_appointment_public_id"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clinic_settings", sa.Column("messaging_whitelist_enabled", sa.Boolean(), nullable=True))
    op.add_column(
        "clinic_settings",
        sa.Column("messaging_whitelist_phones", sa.Text(), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("clinic_settings", "messaging_whitelist_phones")
    op.drop_column("clinic_settings", "messaging_whitelist_enabled")
