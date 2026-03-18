"""doctor user links and receptionist assignments

Revision ID: 0015_doctor_user_assignments
Revises: 0014_appointment_review_items
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0015_doctor_user_assignments"
down_revision = "0014_appointment_review_items"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("gender", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(length=30), nullable=True))
    op.add_column("doctors", sa.Column("gender", sa.String(length=30), nullable=True))
    op.add_column("doctors", sa.Column("linked_user_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_doctors_linked_user_id", "doctors", ["linked_user_id"])
    op.create_foreign_key("fk_doctors_linked_user_id_users", "doctors", "users", ["linked_user_id"], ["id"])

    op.create_table(
        "receptionist_doctor_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "doctor_id", name="uq_receptionist_doctor_assignment"),
    )

    op.execute("UPDATE doctors SET gender = 'male' WHERE id = 1")
    op.execute("UPDATE users SET gender = 'male' WHERE id = 2")
    op.execute("UPDATE users SET gender = 'female' WHERE id = 3")
    op.execute("UPDATE doctors SET linked_user_id = 2 WHERE id = 1")
    op.execute(
        """
        INSERT INTO receptionist_doctor_assignments (user_id, doctor_id, created_at, updated_at)
        VALUES (3, 1, now(), now())
        ON CONFLICT ON CONSTRAINT uq_receptionist_doctor_assignment DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("receptionist_doctor_assignments")
    op.drop_constraint("fk_doctors_linked_user_id_users", "doctors", type_="foreignkey")
    op.drop_constraint("uq_doctors_linked_user_id", "doctors", type_="unique")
    op.drop_column("doctors", "linked_user_id")
    op.drop_column("doctors", "gender")
    op.drop_column("users", "phone_number")
    op.drop_column("users", "gender")
