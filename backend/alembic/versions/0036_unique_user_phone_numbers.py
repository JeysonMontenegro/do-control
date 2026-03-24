"""unique user phone numbers

Revision ID: 0036_unique_user_phone
Revises: 0035_phone_value_ck
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0036_unique_user_phone"
down_revision = "0035_phone_value_ck"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text("""
        delete from user_phone_numbers up
        using user_phone_numbers dup
        join users u_keep on u_keep.id = dup.user_id
        where up.phone_number = dup.phone_number
          and up.id <> dup.id
          and up.phone_number in (
              select phone_number
              from user_phone_numbers
              group by phone_number
              having count(*) > 1
          )
          and dup.id = (
              select keeper.id
              from user_phone_numbers keeper
              join users u2 on u2.id = keeper.user_id
              where keeper.phone_number = up.phone_number
              order by u2.is_active desc, keeper.is_primary desc, keeper.updated_at desc nulls last, keeper.id desc
              limit 1
          )
    """))
    op.create_unique_constraint(
        "uq_user_phone_numbers_phone_number",
        "user_phone_numbers",
        ["phone_number"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_user_phone_numbers_phone_number", "user_phone_numbers", type_="unique")
