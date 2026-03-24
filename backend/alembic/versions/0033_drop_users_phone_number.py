"""drop users phone number

Revision ID: 0033_drop_user_phone
Revises: 0032_drop_receptionist
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0033_drop_user_phone"
down_revision = "0032_drop_receptionist"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("users", "phone_number")


def downgrade() -> None:
    op.add_column("users", sa.Column("phone_number", sa.String(length=30), nullable=True))
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE users AS u
        SET phone_number = phones.phone_number
        FROM (
            SELECT DISTINCT ON (user_id)
                user_id,
                phone_number
            FROM user_phone_numbers
            WHERE is_primary = true
            ORDER BY user_id, updated_at DESC, id DESC
        ) AS phones
        WHERE u.id = phones.user_id
    """))
