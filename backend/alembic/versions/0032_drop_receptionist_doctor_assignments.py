"""drop receptionist doctor assignments

Revision ID: 0032_drop_receptionist
Revises: 0031_actor_user_fks
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0032_drop_receptionist"
down_revision = "0031_actor_user_fks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("receptionist_doctor_assignments")


def downgrade() -> None:
    op.create_table(
        "receptionist_doctor_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "doctor_id", name="uq_receptionist_doctor_assignment"),
    )
