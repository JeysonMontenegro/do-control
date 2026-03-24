"""add audit log quality constraints

Revision ID: 0046_audit_log_quality
Revises: 0045_email_quality
Create Date: 2026-03-24
"""

from alembic import op


revision = "0046_audit_log_quality"
down_revision = "0045_email_quality"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_audit_logs_actor_type_not_blank", "audit_logs", "btrim(actor_type) <> ''")
    op.create_check_constraint("ck_audit_logs_actor_id_not_blank", "audit_logs", "actor_id IS NULL OR btrim(actor_id) <> ''")
    op.create_check_constraint("ck_audit_logs_action_not_blank", "audit_logs", "btrim(action) <> ''")
    op.create_check_constraint("ck_audit_logs_entity_type_not_blank", "audit_logs", "btrim(entity_type) <> ''")
    op.create_check_constraint("ck_audit_logs_entity_id_not_blank", "audit_logs", "btrim(entity_id) <> ''")


def downgrade() -> None:
    op.drop_constraint("ck_audit_logs_entity_id_not_blank", "audit_logs", type_="check")
    op.drop_constraint("ck_audit_logs_entity_type_not_blank", "audit_logs", type_="check")
    op.drop_constraint("ck_audit_logs_action_not_blank", "audit_logs", type_="check")
    op.drop_constraint("ck_audit_logs_actor_id_not_blank", "audit_logs", type_="check")
    op.drop_constraint("ck_audit_logs_actor_type_not_blank", "audit_logs", type_="check")
