"""normalize doctor identity fields

Revision ID: 0026_doctor_identity_norm
Revises: 0025_add_relationship_indexes
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa


revision = "0026_doctor_identity_norm"
down_revision = "0025_add_relationship_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    connection.execute(
        sa.text(
            """
            UPDATE users u
            SET
                first_name = COALESCE(NULLIF(BTRIM(d.first_name), ''), u.first_name),
                last_name = COALESCE(NULLIF(BTRIM(d.last_name), ''), u.last_name),
                gender = COALESCE(d.gender, u.gender),
                is_active = d.is_active
            FROM doctors d
            WHERE d.linked_user_id = u.id
            """
        )
    )

    op.drop_column("doctors", "is_active")
    op.drop_column("doctors", "gender")
    op.drop_column("doctors", "last_name")
    op.drop_column("doctors", "first_name")


def downgrade() -> None:
    op.add_column("doctors", sa.Column("first_name", sa.String(length=100), nullable=True))
    op.add_column("doctors", sa.Column("last_name", sa.String(length=100), nullable=True))
    op.add_column("doctors", sa.Column("gender", sa.String(length=30), nullable=True))
    op.add_column("doctors", sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False))

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE doctors d
            SET
                first_name = u.first_name,
                last_name = u.last_name,
                gender = u.gender,
                is_active = u.is_active
            FROM users u
            WHERE d.linked_user_id = u.id
            """
        )
    )

    op.alter_column("doctors", "first_name", existing_type=sa.String(length=100), nullable=False)
    op.alter_column("doctors", "last_name", existing_type=sa.String(length=100), nullable=False)
