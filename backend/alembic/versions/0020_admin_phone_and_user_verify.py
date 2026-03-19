"""set admin phone and add integration user verification support

Revision ID: 0020_admin_phone_and_user_verify
Revises: 0019_email_service
Create Date: 2026-03-18 23:10:00
"""

from alembic import op


revision = "0020_admin_phone_and_user_verify"
down_revision = "0019_email_service"
branch_labels = None
depends_on = None


ADMIN_EMAIL = "admin@docontrol.local"
ADMIN_PHONE = "50258420737"


def upgrade() -> None:
    op.execute(
        f"""
        UPDATE users
        SET phone_number = '{ADMIN_PHONE}',
            updated_at = now()
        WHERE email = '{ADMIN_EMAIL}';
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        UPDATE users
        SET phone_number = NULL,
            updated_at = now()
        WHERE email = '{ADMIN_EMAIL}' AND phone_number = '{ADMIN_PHONE}';
        """
    )
