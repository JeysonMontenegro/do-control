"""add user phone numbers

Revision ID: 0027_user_phone_numbers
Revises: 0026_doctor_identity_norm
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0027_user_phone_numbers"
down_revision = "0026_doctor_identity_norm"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_phone_numbers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("phone_number", sa.String(length=30), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False, server_default="mobile"),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("can_talk_to_bot", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "phone_number", name="uq_user_phone_numbers_user_phone"),
    )
    op.create_index("ix_user_phone_numbers_phone_number", "user_phone_numbers", ["phone_number"], unique=False)
    op.create_index("ix_user_phone_numbers_user_primary", "user_phone_numbers", ["user_id", "is_primary"], unique=False)
    op.create_index(
        "uq_user_phone_numbers_primary_user",
        "user_phone_numbers",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true"),
    )

    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            INSERT INTO user_phone_numbers (
                user_id,
                phone_number,
                type,
                is_primary,
                is_verified,
                can_talk_to_bot,
                created_at,
                updated_at
            )
            SELECT
                id,
                phone_number,
                'mobile',
                true,
                false,
                true,
                now(),
                now()
            FROM users
            WHERE phone_number IS NOT NULL AND btrim(phone_number) <> ''
            ON CONFLICT ON CONSTRAINT uq_user_phone_numbers_user_phone DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.drop_index("uq_user_phone_numbers_primary_user", table_name="user_phone_numbers")
    op.drop_index("ix_user_phone_numbers_user_primary", table_name="user_phone_numbers")
    op.drop_index("ix_user_phone_numbers_phone_number", table_name="user_phone_numbers")
    op.drop_table("user_phone_numbers")
