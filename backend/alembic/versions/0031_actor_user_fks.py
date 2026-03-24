"""add actor user foreign keys

Revision ID: 0031_actor_user_fks
Revises: 0030_patient_owner_attach
Create Date: 2026-03-24
"""

from alembic import op
import sqlalchemy as sa


revision = "0031_actor_user_fks"
down_revision = "0030_patient_owner_attach"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("appointment_history", sa.Column("changed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("encounters", sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("file_attachments", sa.Column("uploaded_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))

    op.create_index("ix_appointments_created_by_user_id", "appointments", ["created_by_user_id"], unique=False)
    op.create_index("ix_appointment_history_changed_by_user_id", "appointment_history", ["changed_by_user_id"], unique=False)
    op.create_index("ix_encounters_created_by_user_id", "encounters", ["created_by_user_id"], unique=False)
    op.create_index("ix_file_attachments_uploaded_by_user_id", "file_attachments", ["uploaded_by_user_id"], unique=False)

    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE appointments AS a
        SET created_by_user_id = users.id
        FROM users
        WHERE a.created_by_user_id IS NULL
          AND a.created_by IS NOT NULL
          AND users.email = a.created_by
    """))
    connection.execute(sa.text("""
        UPDATE appointment_history AS ah
        SET changed_by_user_id = users.id
        FROM users
        WHERE ah.changed_by_user_id IS NULL
          AND ah.changed_by IS NOT NULL
          AND users.email = ah.changed_by
    """))
    connection.execute(sa.text("""
        UPDATE encounters AS e
        SET created_by_user_id = users.id
        FROM users
        WHERE e.created_by_user_id IS NULL
          AND e.created_by IS NOT NULL
          AND users.email = e.created_by
    """))
    connection.execute(sa.text("""
        UPDATE file_attachments AS fa
        SET uploaded_by_user_id = users.id
        FROM users
        WHERE fa.uploaded_by_user_id IS NULL
          AND fa.uploaded_by IS NOT NULL
          AND users.email = fa.uploaded_by
    """))


def downgrade() -> None:
    op.drop_index("ix_file_attachments_uploaded_by_user_id", table_name="file_attachments")
    op.drop_index("ix_encounters_created_by_user_id", table_name="encounters")
    op.drop_index("ix_appointment_history_changed_by_user_id", table_name="appointment_history")
    op.drop_index("ix_appointments_created_by_user_id", table_name="appointments")

    op.drop_column("file_attachments", "uploaded_by_user_id")
    op.drop_column("encounters", "created_by_user_id")
    op.drop_column("appointment_history", "changed_by_user_id")
    op.drop_column("appointments", "created_by_user_id")
