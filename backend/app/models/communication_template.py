from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class CommunicationTemplate(TimestampMixin, Base):
    __tablename__ = "communication_templates"
    __table_args__ = (
        UniqueConstraint("doctor_id", "channel", "template_key", name="uq_communication_templates_doctor_channel_key"),
        CheckConstraint("channel IN ('whatsapp')", name="ck_communication_templates_channel"),
        CheckConstraint("btrim(template_key) <> ''", name="ck_communication_templates_template_key_not_blank"),
        CheckConstraint("btrim(title) <> ''", name="ck_communication_templates_title_not_blank"),
        CheckConstraint("btrim(body) <> ''", name="ck_communication_templates_body_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    owner_doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(30), default="whatsapp", server_default="whatsapp")
    template_key: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
