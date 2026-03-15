"""add auth users and roles

Revision ID: 0003_auth_users_roles
Revises: 0002_file_attachments
Create Date: 2026-03-14 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

revision = "0003_auth_users_roles"
down_revision = "0002_file_attachments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),
    )

    admin_password_hash = pwd_context.hash("ChangeMe123!")
    doctor_password_hash = pwd_context.hash("Doctor123!")
    receptionist_password_hash = pwd_context.hash("Reception123!")
    op.execute(
        f"""
        INSERT INTO roles (id, name, description) VALUES
        (1, 'admin', 'System administrator'),
        (2, 'doctor', 'Doctor role'),
        (3, 'receptionist', 'Reception role');

        INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, created_at, updated_at) VALUES
        (1, 'admin@docontrol.local', '{admin_password_hash}', 'System', 'Admin', true, now(), now()),
        (2, 'doctor@docontrol.local', '{doctor_password_hash}', 'Demo', 'Doctor', true, now(), now()),
        (3, 'reception@docontrol.local', '{receptionist_password_hash}', 'Front', 'Desk', true, now(), now());

        INSERT INTO user_roles (id, user_id, role_id) VALUES
        (1, 1, 1),
        (2, 2, 2),
        (3, 3, 3);
        """
    )


def downgrade() -> None:
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
