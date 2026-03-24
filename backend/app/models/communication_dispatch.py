from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class CommunicationDispatch(TimestampMixin, Base):
    __tablename__ = "communication_dispatches"
    __table_args__ = (
        Index("ix_communication_dispatches_patient_id", "patient_id"),
        Index("ix_communication_dispatches_doctor_id", "doctor_id"),
        Index("ix_communication_dispatches_status_next_attempt", "status", "next_attempt_at"),
        Index("ix_communication_dispatches_appointment_rule", "appointment_id", "reminder_rule_id"),
        Index("ix_communication_dispatches_exam_order_rule", "exam_order_id", "reminder_rule_id"),
        CheckConstraint("status IN ('pending', 'sent', 'failed', 'cancelled')", name="ck_communication_dispatches_status"),
        CheckConstraint("channel IN ('whatsapp')", name="ck_communication_dispatches_channel"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    owner_doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)
    exam_order_id: Mapped[int | None] = mapped_column(ForeignKey("exam_orders.id"), nullable=True)
    reminder_rule_id: Mapped[int | None] = mapped_column(ForeignKey("reminder_rules.id"), nullable=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("communication_templates.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(30), default="whatsapp", server_default="whatsapp")
    recipient_phone: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="pending", server_default="pending")
    retry_count: Mapped[int] = mapped_column(default=0, server_default="0")
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    external_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rendered_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
