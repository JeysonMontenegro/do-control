from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class AppointmentReviewItem(TimestampMixin, Base):
    __tablename__ = "appointment_review_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_name: Mapped[str] = mapped_column(String(255))
    phone_number: Mapped[str] = mapped_column(String(30))
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    doctor_phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    scheduled_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    appointment_type: Mapped[str] = mapped_column(String(100))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="appoint-me", server_default="appoint-me")
    review_status: Mapped[str] = mapped_column(String(30), default="pending_review", server_default="pending_review")
    review_reason: Mapped[str] = mapped_column(String(50))
    review_message: Mapped[str] = mapped_column(Text)
    existing_appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)
