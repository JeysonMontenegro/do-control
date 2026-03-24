from sqlalchemy import Boolean, CheckConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class EmailTemplate(TimestampMixin, Base):
    __tablename__ = "email_templates"
    __table_args__ = (
        CheckConstraint("btrim(template_key) <> ''", name="ck_email_templates_template_key_not_blank"),
        CheckConstraint("btrim(title) <> ''", name="ck_email_templates_title_not_blank"),
        CheckConstraint("btrim(subject) <> ''", name="ck_email_templates_subject_not_blank"),
        CheckConstraint("btrim(html_body) <> ''", name="ck_email_templates_html_body_not_blank"),
        CheckConstraint("text_body IS NULL OR btrim(text_body) <> ''", name="ck_email_templates_text_body_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    template_key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(150))
    subject: Mapped[str] = mapped_column(String(255))
    html_body: Mapped[str] = mapped_column(Text)
    text_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
