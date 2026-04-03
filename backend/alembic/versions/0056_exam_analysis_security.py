"""harden exam analysis integration security

Revision ID: 0056_exam_analysis_security
Revises: 0055_exam_analyses
Create Date: 2026-04-03 04:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0056_exam_analysis_security"
down_revision = "0055_exam_analyses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exam_analyses", sa.Column("request_idempotency_key", sa.String(length=255), nullable=True))
    op.create_unique_constraint(
        "uq_exam_analyses_request_idempotency_key",
        "exam_analyses",
        ["request_idempotency_key"],
    )
    op.create_check_constraint(
        "ck_exam_analyses_request_idempotency_key_not_blank",
        "exam_analyses",
        "request_idempotency_key IS NULL OR btrim(request_idempotency_key) <> ''",
    )
    op.create_table(
        "exam_analysis_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("analysis_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=30), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("payload_hash", sa.String(length=64), nullable=False),
        sa.Column("signature_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("event_type IN ('request', 'callback')", name="ck_exam_analysis_events_event_type"),
        sa.CheckConstraint("btrim(idempotency_key) <> ''", name="ck_exam_analysis_events_idempotency_key_not_blank"),
        sa.CheckConstraint("btrim(payload_hash) <> ''", name="ck_exam_analysis_events_payload_hash_not_blank"),
        sa.ForeignKeyConstraint(["analysis_id"], ["exam_analyses.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_type", "idempotency_key", name="uq_exam_analysis_events_type_key"),
    )
    op.create_index(
        "ix_exam_analysis_events_analysis_created",
        "exam_analysis_events",
        ["analysis_id", "created_at", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_exam_analysis_events_analysis_created", table_name="exam_analysis_events")
    op.drop_table("exam_analysis_events")
    op.drop_constraint("ck_exam_analyses_request_idempotency_key_not_blank", "exam_analyses", type_="check")
    op.drop_constraint("uq_exam_analyses_request_idempotency_key", "exam_analyses", type_="unique")
    op.drop_column("exam_analyses", "request_idempotency_key")
