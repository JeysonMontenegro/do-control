"""clinic settings

Revision ID: 0016_clinic_settings
Revises: 0015_doctor_user_assignments
Create Date: 2026-03-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0016_clinic_settings"
down_revision = "0015_doctor_user_assignments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "clinic_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("allow_multi_doctor_visibility", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.execute(
        """
        INSERT INTO clinic_settings (id, allow_multi_doctor_visibility)
        VALUES (1, false)
        """
    )


def downgrade() -> None:
    op.drop_table("clinic_settings")
