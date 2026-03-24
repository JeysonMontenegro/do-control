"""add doctor staff assignments

Revision ID: 0028_doctor_staff_assignments
Revises: 0027_user_phone_numbers
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0028_doctor_staff_assignments"
down_revision = "0027_user_phone_numbers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "doctor_staff_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("staff_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assignment_type", sa.String(length=30), nullable=False, server_default="receptionist"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("doctor_id", "staff_user_id", "assignment_type", name="uq_doctor_staff_assignment"),
    )
    op.create_index("ix_doctor_staff_assignments_doctor_id", "doctor_staff_assignments", ["doctor_id"], unique=False)
    op.create_index("ix_doctor_staff_assignments_staff_user_id", "doctor_staff_assignments", ["staff_user_id"], unique=False)
    op.create_index("ix_doctor_staff_assignments_staff_active", "doctor_staff_assignments", ["staff_user_id", "is_active"], unique=False)
    op.create_index("ix_doctor_staff_assignments_doctor_active", "doctor_staff_assignments", ["doctor_id", "is_active"], unique=False)

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            INSERT INTO doctor_staff_assignments (
                doctor_id,
                staff_user_id,
                assignment_type,
                is_active,
                created_at,
                updated_at
            )
            SELECT
                doctor_id,
                user_id,
                'receptionist',
                true,
                created_at,
                updated_at
            FROM receptionist_doctor_assignments
            ON CONFLICT ON CONSTRAINT uq_doctor_staff_assignment DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_doctor_staff_assignments_doctor_active", table_name="doctor_staff_assignments")
    op.drop_index("ix_doctor_staff_assignments_staff_active", table_name="doctor_staff_assignments")
    op.drop_index("ix_doctor_staff_assignments_staff_user_id", table_name="doctor_staff_assignments")
    op.drop_index("ix_doctor_staff_assignments_doctor_id", table_name="doctor_staff_assignments")
    op.drop_table("doctor_staff_assignments")
