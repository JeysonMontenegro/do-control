"""add onboarding token revocation

Revision ID: 0054_onboarding_token_revocation
Revises: 0053_patient_display_name
Create Date: 2026-04-01 01:05:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0054_onboarding_token_revocation"
down_revision = "0053_patient_display_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_action_tokens", sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("user_action_tokens", "revoked_at")
