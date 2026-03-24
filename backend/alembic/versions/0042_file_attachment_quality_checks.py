"""add file attachment quality checks

Revision ID: 0042_file_attachment_quality
Revises: 0041_actor_string_quality
Create Date: 2026-03-24
"""

from alembic import op


revision = "0042_file_attachment_quality"
down_revision = "0041_actor_string_quality"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint("ck_file_attachments_file_type_not_blank", "file_attachments", "btrim(file_type) <> ''")
    op.create_check_constraint("ck_file_attachments_file_name_not_blank", "file_attachments", "btrim(file_name) <> ''")
    op.create_check_constraint("ck_file_attachments_storage_key_not_blank", "file_attachments", "btrim(storage_key) <> ''")
    op.create_check_constraint("ck_file_attachments_content_type_not_blank", "file_attachments", "content_type IS NULL OR btrim(content_type) <> ''")
    op.create_check_constraint("ck_file_attachments_file_size_positive", "file_attachments", "file_size IS NULL OR file_size > 0")


def downgrade() -> None:
    op.drop_constraint("ck_file_attachments_file_size_positive", "file_attachments", type_="check")
    op.drop_constraint("ck_file_attachments_content_type_not_blank", "file_attachments", type_="check")
    op.drop_constraint("ck_file_attachments_storage_key_not_blank", "file_attachments", type_="check")
    op.drop_constraint("ck_file_attachments_file_name_not_blank", "file_attachments", type_="check")
    op.drop_constraint("ck_file_attachments_file_type_not_blank", "file_attachments", type_="check")
