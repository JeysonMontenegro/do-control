from datetime import date, datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class Encounter(TimestampMixin, Base):
    __tablename__ = "encounters"
    __table_args__ = (
        Index("ix_encounters_patient_id", "patient_id"),
        Index("ix_encounters_doctor_id", "doctor_id"),
        CheckConstraint("status IN ('draft', 'closed')", name="ck_encounters_status"),
        CheckConstraint("created_by IS NULL OR btrim(created_by) <> ''", name="ck_encounters_created_by_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    owner_doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True, unique=True)
    encounter_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    encounter_type: Mapped[str] = mapped_column(String(100))
    chief_complaint: Mapped[str] = mapped_column(Text)
    present_illness: Mapped[str | None] = mapped_column(Text, nullable=True)
    relevant_history: Mapped[str | None] = mapped_column(Text, nullable=True)
    vital_signs: Mapped[str | None] = mapped_column(Text, nullable=True)
    physical_exam: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinical_impression: Mapped[str | None] = mapped_column(Text, nullable=True)
    treatment_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="draft", server_default="draft")
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    patient = relationship("Patient", back_populates="encounters")
    doctor = relationship("Doctor", back_populates="encounters", foreign_keys=[doctor_id])
    appointment = relationship("Appointment", back_populates="encounter")
    diagnoses = relationship("Diagnosis", back_populates="encounter", cascade="all, delete-orphan")
    prescription = relationship("Prescription", back_populates="encounter", uselist=False, cascade="all, delete-orphan")
    exam_orders = relationship("ExamOrder", back_populates="encounter", cascade="all, delete-orphan")


class Diagnosis(Base):
    __tablename__ = "diagnoses"
    __table_args__ = (Index("ix_diagnoses_encounter_id", "encounter_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    encounter_id: Mapped[int] = mapped_column(ForeignKey("encounters.id"))
    diagnosis_text: Mapped[str] = mapped_column(Text)
    diagnosis_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_primary: Mapped[bool] = mapped_column(default=False, server_default="false")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    encounter = relationship("Encounter", back_populates="diagnoses")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    encounter_id: Mapped[int] = mapped_column(ForeignKey("encounters.id"), unique=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    encounter = relationship("Encounter", back_populates="prescription")
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    prescription_id: Mapped[int] = mapped_column(ForeignKey("prescriptions.id"))
    medication_name: Mapped[str] = mapped_column(String(255))
    dosage: Mapped[str | None] = mapped_column(String(255), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(255), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    prescription = relationship("Prescription", back_populates="items")


class ExamOrder(Base):
    __tablename__ = "exam_orders"
    __table_args__ = (
        Index("ix_exam_orders_encounter_id", "encounter_id"),
        CheckConstraint("status IN ('ordered', 'pending_result', 'completed', 'cancelled')", name="ck_exam_orders_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    encounter_id: Mapped[int] = mapped_column(ForeignKey("encounters.id"))
    exam_name: Mapped[str] = mapped_column(String(255))
    exam_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_date: Mapped[date | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ordered", server_default="ordered")
    ordered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    encounter = relationship("Encounter", back_populates="exam_orders")
