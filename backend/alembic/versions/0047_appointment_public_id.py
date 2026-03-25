"""add public id to appointments

Revision ID: 0047_appointment_public_id
Revises: 0046_audit_log_quality
Create Date: 2026-03-24 21:05:00.000000
"""

from collections.abc import Sequence
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision: str = "0047_appointment_public_id"
down_revision: str | None = "0046_audit_log_quality"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("public_id", sa.String(length=36), nullable=True))

    appointments = sa.table(
        "appointments",
        sa.column("id", sa.Integer),
        sa.column("public_id", sa.String(length=36)),
    )
    bind = op.get_bind()
    rows = bind.execute(sa.select(appointments.c.id)).fetchall()
    for row in rows:
        bind.execute(
            appointments.update()
            .where(appointments.c.id == row.id)
            .values(public_id=str(uuid4()))
        )

    op.alter_column("appointments", "public_id", nullable=False)
    op.create_index("ix_appointments_public_id", "appointments", ["public_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_appointments_public_id", table_name="appointments")
    op.drop_column("appointments", "public_id")
