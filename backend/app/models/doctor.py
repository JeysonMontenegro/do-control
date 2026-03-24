from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class Doctor(TimestampMixin, Base):
    __tablename__ = "doctors"
    __table_args__ = (
        CheckConstraint("license_number IS NULL OR btrim(license_number) <> ''", name="ck_doctors_license_number_not_blank"),
        CheckConstraint("specialty IS NULL OR btrim(specialty) <> ''", name="ck_doctors_specialty_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    specialty: Mapped[str | None] = mapped_column(String(100), nullable=True)
    linked_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)

    appointments = relationship("Appointment", back_populates="doctor", foreign_keys="Appointment.doctor_id")
    encounters = relationship("Encounter", back_populates="doctor", foreign_keys="Encounter.doctor_id")
    clinics = relationship("DoctorClinic", back_populates="doctor", cascade="all, delete-orphan")
    phone_numbers = relationship("DoctorPhoneNumber", back_populates="doctor", cascade="all, delete-orphan")
    linked_user = relationship("User", back_populates="doctor_profile")
    staff_assignments = relationship("DoctorStaffAssignment", back_populates="doctor", cascade="all, delete-orphan")
    patient_assignments = relationship("PatientDoctorAssignment", back_populates="doctor", cascade="all, delete-orphan")

    @property
    def first_name(self) -> str:
        return self.linked_user.first_name if self.linked_user is not None else ""

    @first_name.setter
    def first_name(self, value: str) -> None:
        if self.linked_user is not None:
            self.linked_user.first_name = value

    @property
    def last_name(self) -> str:
        return self.linked_user.last_name if self.linked_user is not None else ""

    @last_name.setter
    def last_name(self, value: str) -> None:
        if self.linked_user is not None:
            self.linked_user.last_name = value

    @property
    def gender(self) -> str | None:
        return self.linked_user.gender if self.linked_user is not None else None

    @gender.setter
    def gender(self, value: str | None) -> None:
        if self.linked_user is not None:
            self.linked_user.gender = value

    @property
    def is_active(self) -> bool:
        return self.linked_user.is_active if self.linked_user is not None else False

    @is_active.setter
    def is_active(self, value: bool) -> None:
        if self.linked_user is not None:
            self.linked_user.is_active = value
