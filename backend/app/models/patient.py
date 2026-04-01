from datetime import date

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, ForeignKeyConstraint, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class Patient(TimestampMixin, Base):
    __tablename__ = "patients"
    __table_args__ = (
        Index("ix_patients_name", "last_name", "first_name"),
        Index("ix_patients_primary_phone", "primary_phone"),
        Index("ix_patients_national_id", "national_id"),
        Index("ix_patients_owner_doctor_id", "owner_doctor_id"),
        CheckConstraint("btrim(first_name) <> ''", name="ck_patients_first_name_not_blank"),
        CheckConstraint("btrim(last_name) <> ''", name="ck_patients_last_name_not_blank"),
        CheckConstraint("display_name IS NULL OR btrim(display_name) <> ''", name="ck_patients_display_name_not_blank"),
        CheckConstraint("btrim(primary_phone) <> ''", name="ck_patients_primary_phone_not_blank"),
        CheckConstraint("btrim(medical_record_number) <> ''", name="ck_patients_mrn_not_blank"),
        CheckConstraint("national_id IS NULL OR btrim(national_id) <> ''", name="ck_patients_national_id_not_blank"),
        CheckConstraint("tax_id IS NULL OR btrim(tax_id) <> ''", name="ck_patients_tax_id_not_blank"),
        ForeignKeyConstraint(
            ["id", "owner_doctor_id"],
            ["patient_doctor_assignments.patient_id", "patient_doctor_assignments.doctor_id"],
            name="fk_patients_owner_assignment",
            deferrable=True,
            initially="DEFERRED",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=False)
    medical_record_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str] = mapped_column(String(100))
    second_last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    married_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sex: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    national_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    primary_phone: Mapped[str] = mapped_column(String(30))
    secondary_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    chronic_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    appointments = relationship("Appointment", back_populates="patient")
    encounters = relationship("Encounter", back_populates="patient")
    phone_numbers = relationship("PatientPhoneNumber", back_populates="patient", cascade="all, delete-orphan")
    doctor_assignments = relationship(
        "PatientDoctorAssignment",
        back_populates="patient",
        cascade="all, delete-orphan",
        foreign_keys="PatientDoctorAssignment.patient_id",
    )

    @property
    def assigned_doctors(self):
        return [assignment.doctor for assignment in self.doctor_assignments if assignment.doctor is not None]
