"""add doctor title

Revision ID: 0050_doctor_title
Revises: 0049_email_wl
Create Date: 2026-03-25 23:59:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0050_doctor_title"
down_revision = "0049_email_wl"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("doctors", sa.Column("doctor_title", sa.String(length=50), nullable=True))
    op.create_check_constraint(
        "ck_doctors_title_not_blank",
        "doctors",
        "doctor_title IS NULL OR btrim(doctor_title) <> ''",
    )


def downgrade() -> None:
    op.drop_constraint("ck_doctors_title_not_blank", "doctors", type_="check")
    op.drop_column("doctors", "doctor_title")
