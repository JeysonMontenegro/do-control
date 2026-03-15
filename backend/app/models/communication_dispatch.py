from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class CommunicationDispatch(TimestampMixin, Base):
    __tablename__ = "communication_dispatches"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)
    reminder_rule_id: Mapped[int | None] = mapped_column(ForeignKey("reminder_rules.id"), nullable=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("communication_templates.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(30), default="whatsapp", server_default="whatsapp")
    recipient_phone: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="pending", server_default="pending")
    external_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rendered_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
