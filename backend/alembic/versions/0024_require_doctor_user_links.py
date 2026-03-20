"""require linked users for every doctor

Revision ID: 0024_require_doctor_user_links
Revises: 0023_email_process_toggles
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

revision = "0024_require_doctor_user_links"
down_revision = "0023_email_process_toggles"
branch_labels = None
depends_on = None


def _doctor_role_id(connection) -> int:
    role_id = connection.execute(sa.text("SELECT id FROM roles WHERE name = 'doctor'")).scalar_one_or_none()
    if role_id is not None:
        return role_id

    inserted = connection.execute(
        sa.text(
            """
            INSERT INTO roles (name, description)
            VALUES (:name, :description)
            RETURNING id
            """
        ),
        {"name": "doctor", "description": "Doctor role"},
    )
    return inserted.scalar_one()


def _primary_phone_for_doctor(connection, doctor_id: int) -> str | None:
    return connection.execute(
        sa.text(
            """
            SELECT phone_number
            FROM doctor_phone_numbers
            WHERE doctor_id = :doctor_id
            ORDER BY is_primary DESC, is_active DESC, id ASC
            LIMIT 1
            """
        ),
        {"doctor_id": doctor_id},
    ).scalar_one_or_none()


def upgrade() -> None:
    connection = op.get_bind()
    doctor_role_id = _doctor_role_id(connection)

    doctors_without_user = connection.execute(
        sa.text(
            """
            SELECT id, first_name, last_name, gender, is_active
            FROM doctors
            WHERE linked_user_id IS NULL
            ORDER BY id
            """
        )
    ).mappings()

    for doctor in doctors_without_user:
        primary_phone = _primary_phone_for_doctor(connection, doctor["id"])
        inserted_user = connection.execute(
            sa.text(
                """
                INSERT INTO users (
                    email,
                    password_hash,
                    first_name,
                    last_name,
                    gender,
                    phone_number,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES (
                    :email,
                    :password_hash,
                    :first_name,
                    :last_name,
                    :gender,
                    :phone_number,
                    :is_active,
                    now(),
                    now()
                )
                RETURNING id
                """
            ),
            {
                "email": f"migrated.doctor.{doctor['id']}@docontrol.local",
                "password_hash": pwd_context.hash(f"TempDoctor!{doctor['id']}"),
                "first_name": doctor["first_name"],
                "last_name": doctor["last_name"],
                "gender": doctor["gender"],
                "phone_number": primary_phone,
                "is_active": doctor["is_active"],
            },
        )
        user_id = inserted_user.scalar_one()
        connection.execute(
            sa.text(
                """
                INSERT INTO user_roles (user_id, role_id)
                VALUES (:user_id, :role_id)
                ON CONFLICT ON CONSTRAINT uq_user_roles_user_role DO NOTHING
                """
            ),
            {"user_id": user_id, "role_id": doctor_role_id},
        )
        connection.execute(
            sa.text(
                """
                UPDATE doctors
                SET linked_user_id = :user_id
                WHERE id = :doctor_id
                """
            ),
            {"user_id": user_id, "doctor_id": doctor["id"]},
        )

    connection.execute(
        sa.text(
            """
            INSERT INTO user_roles (user_id, role_id)
            SELECT d.linked_user_id, :role_id
            FROM doctors d
            WHERE d.linked_user_id IS NOT NULL
            ON CONFLICT ON CONSTRAINT uq_user_roles_user_role DO NOTHING
            """
        ),
        {"role_id": doctor_role_id},
    )

    connection.execute(
        sa.text(
            """
            UPDATE users u
            SET
                first_name = d.first_name,
                last_name = d.last_name,
                gender = d.gender,
                phone_number = COALESCE(
                    (
                        SELECT phone_number
                        FROM doctor_phone_numbers p
                        WHERE p.doctor_id = d.id
                        ORDER BY p.is_primary DESC, p.is_active DESC, p.id ASC
                        LIMIT 1
                    ),
                    u.phone_number
                ),
                is_active = d.is_active,
                updated_at = now()
            FROM doctors d
            WHERE d.linked_user_id = u.id
            """
        )
    )

    op.alter_column("doctors", "linked_user_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    op.alter_column("doctors", "linked_user_id", existing_type=sa.Integer(), nullable=True)
