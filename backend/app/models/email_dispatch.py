from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class EmailDispatch(TimestampMixin, Base):
    __tablename__ = "email_dispatches"
    __table_args__ = (
        CheckConstraint("btrim(recipient_email) <> ''", name="ck_email_dispatches_recipient_email_not_blank"),
        CheckConstraint("btrim(subject) <> ''", name="ck_email_dispatches_subject_not_blank"),
        CheckConstraint("btrim(html_body) <> ''", name="ck_email_dispatches_html_body_not_blank"),
        CheckConstraint("text_body IS NULL OR btrim(text_body) <> ''", name="ck_email_dispatches_text_body_not_blank"),
        CheckConstraint("template_key IS NULL OR btrim(template_key) <> ''", name="ck_email_dispatches_template_key_not_blank"),
        CheckConstraint("provider_message_id IS NULL OR btrim(provider_message_id) <> ''", name="ck_email_dispatches_provider_message_id_not_blank"),
        CheckConstraint("error_message IS NULL OR btrim(error_message) <> ''", name="ck_email_dispatches_error_message_not_blank"),
        CheckConstraint("retry_count >= 0", name="ck_email_dispatches_retry_count_nonnegative"),
        CheckConstraint("status IN ('pending', 'sent', 'skipped', 'failed')", name="ck_email_dispatches_status"),
        CheckConstraint("provider IN ('brevo')", name="ck_email_dispatches_provider"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("email_templates.id"), nullable=True)
    recipient_email: Mapped[str] = mapped_column(String(255), index=True)
    subject: Mapped[str] = mapped_column(String(255))
    html_body: Mapped[str] = mapped_column(Text)
    text_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", server_default="pending")
    provider: Mapped[str] = mapped_column(String(50), default="brevo", server_default="brevo")
    provider_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    user = relationship("User")
    template = relationship("EmailTemplate")
