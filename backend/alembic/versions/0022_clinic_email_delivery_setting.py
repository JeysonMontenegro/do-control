"""add clinic email delivery setting

Revision ID: 0022_clinic_email_delivery
Revises: 0021_user_profile_fields
Create Date: 2026-03-19 00:35:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0022_clinic_email_delivery"
down_revision = "0021_user_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clinic_settings",
        sa.Column("email_delivery_enabled", sa.Boolean(), server_default="true", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("clinic_settings", "email_delivery_enabled")
