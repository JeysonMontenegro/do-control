"""seed doctor and receptionist users

Revision ID: 0004_seed_role_users
Revises: 0003_auth_users_roles
Create Date: 2026-03-14 00:00:00
"""
from alembic import op
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

revision = "0004_seed_role_users"
down_revision = "0003_auth_users_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    doctor_password_hash = pwd_context.hash("Doctor123!")
    receptionist_password_hash = pwd_context.hash("Reception123!")
    op.execute(
        f"""
        INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, created_at, updated_at)
        VALUES
        (2, 'doctor@docontrol.local', '{doctor_password_hash}', 'Demo', 'Doctor', true, now(), now()),
        (3, 'reception@docontrol.local', '{receptionist_password_hash}', 'Front', 'Desk', true, now(), now())
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO user_roles (id, user_id, role_id)
        VALUES
        (2, 2, 2),
        (3, 3, 3)
        ON CONFLICT (id) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM user_roles WHERE id IN (2, 3)")
    op.execute("DELETE FROM users WHERE id IN (2, 3)")
