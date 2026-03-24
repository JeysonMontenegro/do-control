from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class Appointment(TimestampMixin, Base):
    __tablename__ = "appointments"
    __table_args__ = (
        Index("ix_appointments_doctor_schedule", "doctor_id", "scheduled_start", "scheduled_end"),
        CheckConstraint("scheduled_end > scheduled_start", name="ck_appointments_scheduled_range"),
        CheckConstraint("status IN ('scheduled', 'confirmed', 'cancelled')", name="ck_appointments_status"),
        CheckConstraint("confirmation_status IN ('pending', 'confirmed', 'cancelled')", name="ck_appointments_confirmation_status"),
        CheckConstraint("source IN ('receptionist', 'appoint-me')", name="ck_appointments_source"),
        CheckConstraint("created_by IS NULL OR btrim(created_by) <> ''", name="ck_appointments_created_by_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    owner_doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    scheduled_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    appointment_type: Mapped[str] = mapped_column(String(100))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="scheduled", server_default="scheduled")
    confirmation_status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
        server_default="pending",
    )
    source: Mapped[str] = mapped_column(String(30), default="receptionist", server_default="receptionist")
    created_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments", foreign_keys=[doctor_id])
    history_entries = relationship("AppointmentHistory", back_populates="appointment")
    encounter = relationship("Encounter", back_populates="appointment", uselist=False)


class AppointmentHistory(Base):
    __tablename__ = "appointment_history"
    __table_args__ = (
        Index("ix_appointment_history_appointment_created", "appointment_id", "created_at", "id"),
        CheckConstraint("changed_by IS NULL OR btrim(changed_by) <> ''", name="ck_appointment_history_changed_by_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"))
    old_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    new_status: Mapped[str] = mapped_column(String(30))
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    changed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    appointment = relationship("Appointment", back_populates="history_entries")
