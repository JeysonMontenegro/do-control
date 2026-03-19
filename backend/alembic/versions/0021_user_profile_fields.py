"""add user profile fields

Revision ID: 0021_user_profile_fields
Revises: 0020_admin_phone_and_user_verify
Create Date: 2026-03-18 23:55:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0021_user_profile_fields"
down_revision = "0020_admin_phone_and_user_verify"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(length=150), nullable=True))
    op.add_column("users", sa.Column("profile_photo_storage_key", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_photo_storage_key")
    op.drop_column("users", "display_name")
