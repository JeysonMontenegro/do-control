from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class CommunicationTemplate(TimestampMixin, Base):
    __tablename__ = "communication_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(30), default="whatsapp", server_default="whatsapp")
    template_key: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(150))
    body: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
