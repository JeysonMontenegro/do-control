"""add email template and dispatch quality constraints

Revision ID: 0045_email_quality
Revises: 0044_reminder_rule_uniqueness
Create Date: 2026-03-24
"""

from alembic import op


revision = "0045_email_quality"
down_revision = "0044_reminder_rule_uniqueness"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_email_templates_template_key_not_blank", "email_templates", "btrim(template_key) <> ''")
    op.create_check_constraint("ck_email_templates_title_not_blank", "email_templates", "btrim(title) <> ''")
    op.create_check_constraint("ck_email_templates_subject_not_blank", "email_templates", "btrim(subject) <> ''")
    op.create_check_constraint("ck_email_templates_html_body_not_blank", "email_templates", "btrim(html_body) <> ''")
    op.create_check_constraint("ck_email_templates_text_body_not_blank", "email_templates", "text_body IS NULL OR btrim(text_body) <> ''")

    op.create_check_constraint("ck_email_dispatches_recipient_email_not_blank", "email_dispatches", "btrim(recipient_email) <> ''")
    op.create_check_constraint("ck_email_dispatches_subject_not_blank", "email_dispatches", "btrim(subject) <> ''")
    op.create_check_constraint("ck_email_dispatches_html_body_not_blank", "email_dispatches", "btrim(html_body) <> ''")
    op.create_check_constraint("ck_email_dispatches_text_body_not_blank", "email_dispatches", "text_body IS NULL OR btrim(text_body) <> ''")
    op.create_check_constraint("ck_email_dispatches_template_key_not_blank", "email_dispatches", "template_key IS NULL OR btrim(template_key) <> ''")
    op.create_check_constraint("ck_email_dispatches_provider_message_id_not_blank", "email_dispatches", "provider_message_id IS NULL OR btrim(provider_message_id) <> ''")
    op.create_check_constraint("ck_email_dispatches_error_message_not_blank", "email_dispatches", "error_message IS NULL OR btrim(error_message) <> ''")
    op.create_check_constraint("ck_email_dispatches_retry_count_nonnegative", "email_dispatches", "retry_count >= 0")
    op.create_check_constraint("ck_email_dispatches_status", "email_dispatches", "status IN ('pending', 'sent', 'skipped', 'failed')")
    op.create_check_constraint("ck_email_dispatches_provider", "email_dispatches", "provider IN ('brevo')")


def downgrade() -> None:
    op.drop_constraint("ck_email_dispatches_provider", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_status", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_retry_count_nonnegative", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_error_message_not_blank", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_provider_message_id_not_blank", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_template_key_not_blank", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_text_body_not_blank", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_html_body_not_blank", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_subject_not_blank", "email_dispatches", type_="check")
    op.drop_constraint("ck_email_dispatches_recipient_email_not_blank", "email_dispatches", type_="check")

    op.drop_constraint("ck_email_templates_text_body_not_blank", "email_templates", type_="check")
    op.drop_constraint("ck_email_templates_html_body_not_blank", "email_templates", type_="check")
    op.drop_constraint("ck_email_templates_subject_not_blank", "email_templates", type_="check")
    op.drop_constraint("ck_email_templates_title_not_blank", "email_templates", type_="check")
    op.drop_constraint("ck_email_templates_template_key_not_blank", "email_templates", type_="check")
