"""add exam analyses orchestration

Revision ID: 0055_exam_analyses
Revises: 0054_onboarding_token_revocation
Create Date: 2026-03-31 22:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0055_exam_analyses"
down_revision = "0054_onboarding_token_revocation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "exam_analyses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("owner_doctor_id", sa.Integer(), nullable=True),
        sa.Column("attachment_id", sa.Integer(), nullable=False),
        sa.Column("encounter_id", sa.Integer(), nullable=True),
        sa.Column("exam_order_id", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=False, server_default="integration"),
        sa.Column("provider_name", sa.String(length=50), nullable=False, server_default="med-ia"),
        sa.Column("provider_job_id", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="pending_submission"),
        sa.Column("review_status", sa.String(length=30), nullable=False, server_default="not_ready"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("anomalies", sa.JSON(), nullable=True),
        sa.Column("structured_results", sa.JSON(), nullable=True),
        sa.Column("raw_provider_payload", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("requested_by", sa.String(length=100), nullable=True),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_by", sa.String(length=100), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_callback_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending_submission', 'submitted', 'processing', 'completed', 'failed')",
            name="ck_exam_analyses_status",
        ),
        sa.CheckConstraint(
            "review_status IN ('not_ready', 'pending_review', 'reviewed')",
            name="ck_exam_analyses_review_status",
        ),
        sa.CheckConstraint("btrim(source) <> ''", name="ck_exam_analyses_source_not_blank"),
        sa.CheckConstraint("btrim(provider_name) <> ''", name="ck_exam_analyses_provider_name_not_blank"),
        sa.CheckConstraint(
            "requested_by IS NULL OR btrim(requested_by) <> ''",
            name="ck_exam_analyses_requested_by_not_blank",
        ),
        sa.CheckConstraint(
            "reviewed_by IS NULL OR btrim(reviewed_by) <> ''",
            name="ck_exam_analyses_reviewed_by_not_blank",
        ),
        sa.ForeignKeyConstraint(["attachment_id"], ["file_attachments.id"]),
        sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"]),
        sa.ForeignKeyConstraint(["exam_order_id"], ["exam_orders.id"]),
        sa.ForeignKeyConstraint(["owner_doctor_id"], ["doctors.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_exam_analyses_attachment_created", "exam_analyses", ["attachment_id", "created_at", "id"])
    op.create_index("ix_exam_analyses_patient_created", "exam_analyses", ["patient_id", "created_at", "id"])
    op.create_index("ix_exam_analyses_provider_job_id", "exam_analyses", ["provider_job_id"])


def downgrade() -> None:
    op.drop_index("ix_exam_analyses_provider_job_id", table_name="exam_analyses")
    op.drop_index("ix_exam_analyses_patient_created", table_name="exam_analyses")
    op.drop_index("ix_exam_analyses_attachment_created", table_name="exam_analyses")
    op.drop_table("exam_analyses")
