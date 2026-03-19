"""add email process toggles

Revision ID: 0023_email_process_toggles
Revises: 0022_clinic_email_delivery
Create Date: 2026-03-19 00:55:00
"""

from alembic import op
import sqlalchemy as sa


revision = "0023_email_process_toggles"
down_revision = "0022_clinic_email_delivery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clinic_settings", sa.Column("welcome_doctor_email_enabled", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("clinic_settings", sa.Column("welcome_receptionist_email_enabled", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("clinic_settings", sa.Column("password_reset_email_enabled", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("clinic_settings", sa.Column("admin_invite_email_enabled", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("clinic_settings", sa.Column("manual_test_email_enabled", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("clinic_settings", sa.Column("manual_resend_email_enabled", sa.Boolean(), server_default="true", nullable=False))


def downgrade() -> None:
    op.drop_column("clinic_settings", "manual_resend_email_enabled")
    op.drop_column("clinic_settings", "manual_test_email_enabled")
    op.drop_column("clinic_settings", "admin_invite_email_enabled")
    op.drop_column("clinic_settings", "password_reset_email_enabled")
    op.drop_column("clinic_settings", "welcome_receptionist_email_enabled")
    op.drop_column("clinic_settings", "welcome_doctor_email_enabled")
