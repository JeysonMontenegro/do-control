"""email service and templates

Revision ID: 0019_email_service
Revises: 0018_doctor_clinics
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa


revision = "0019_email_service"
down_revision = "0018_doctor_clinics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("template_key", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("html_body", sa.Text(), nullable=False),
        sa.Column("text_body", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_email_templates_template_key", "email_templates", ["template_key"], unique=True)

    op.create_table(
        "email_dispatches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("template_id", sa.Integer(), nullable=True),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("html_body", sa.Text(), nullable=False),
        sa.Column("text_body", sa.Text(), nullable=True),
        sa.Column("template_key", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(length=50), nullable=False, server_default="brevo"),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["email_templates.id"]),
    )
    op.create_index("ix_email_dispatches_recipient_email", "email_dispatches", ["recipient_email"], unique=False)

    op.create_table(
        "user_action_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("action_type", sa.String(length=50), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_user_action_tokens_user_id", "user_action_tokens", ["user_id"], unique=False)
    op.create_index("ix_user_action_tokens_action_type", "user_action_tokens", ["action_type"], unique=False)
    op.create_index("ix_user_action_tokens_token_hash", "user_action_tokens", ["token_hash"], unique=True)
    op.create_index("ix_user_action_tokens_expires_at", "user_action_tokens", ["expires_at"], unique=False)

    op.execute(
        """
        INSERT INTO email_templates (template_key, title, subject, html_body, text_body, is_active, created_at, updated_at)
        VALUES
          (
            'welcome_email',
            'Bienvenida',
            'Bienvenido a {app_name}',
            '<p>Hola {recipient_name},</p><p>Tu acceso a {app_name} ya está listo.</p><p>Usuario: {email}</p><p>Contraseña temporal: {temporary_password}</p>',
            'Hola {recipient_name}, tu acceso a {app_name} ya está listo. Usuario: {email}. Contraseña temporal: {temporary_password}.',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          ),
          (
            'password_reset_email',
            'Recuperación de contraseña',
            'Restablece tu contraseña en {app_name}',
            '<p>Hola {recipient_name},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href=\"{reset_link}\">Haz clic aquí para cambiarla</a></p><p>Este enlace vence en {expires_in_minutes} minutos.</p>',
            'Hola {recipient_name}. Restablece tu contraseña aquí: {reset_link}. Este enlace vence en {expires_in_minutes} minutos.',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          ),
          (
            'admin_invite_email',
            'Invitación de administrador',
            'Tienes una invitación de administrador en {app_name}',
            '<p>Hola {recipient_name},</p><p>Has sido invitado como administrador.</p><p><a href=\"{invite_link}\">Activa tu acceso aquí</a></p><p>La invitación vence en {expires_in_minutes} minutos.</p>',
            'Hola {recipient_name}. Has sido invitado como administrador. Activa tu acceso aquí: {invite_link}. La invitación vence en {expires_in_minutes} minutos.',
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_user_action_tokens_expires_at", table_name="user_action_tokens")
    op.drop_index("ix_user_action_tokens_token_hash", table_name="user_action_tokens")
    op.drop_index("ix_user_action_tokens_action_type", table_name="user_action_tokens")
    op.drop_index("ix_user_action_tokens_user_id", table_name="user_action_tokens")
    op.drop_table("user_action_tokens")
    op.drop_index("ix_email_dispatches_recipient_email", table_name="email_dispatches")
    op.drop_table("email_dispatches")
    op.drop_index("ix_email_templates_template_key", table_name="email_templates")
    op.drop_table("email_templates")
