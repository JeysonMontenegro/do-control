"""sync seeded table sequences

Revision ID: 0008_sync_seeded_sequences
Revises: 0007_doctor_phone_numbers
Create Date: 2026-03-14 01:10:00
"""
from alembic import op


revision = "0008_sync_seeded_sequences"
down_revision = "0007_doctor_phone_numbers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        SELECT setval(pg_get_serial_sequence('doctors', 'id'), COALESCE((SELECT MAX(id) FROM doctors), 1), true);
        SELECT setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 1), true);
        SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);
        SELECT setval(pg_get_serial_sequence('user_roles', 'id'), COALESCE((SELECT MAX(id) FROM user_roles), 1), true);
        SELECT setval(pg_get_serial_sequence('reminder_rules', 'id'), COALESCE((SELECT MAX(id) FROM reminder_rules), 1), true);
        """
    )


def downgrade() -> None:
    pass
