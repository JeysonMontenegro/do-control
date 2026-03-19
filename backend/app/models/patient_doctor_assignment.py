from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class PatientDoctorAssignment(TimestampMixin, Base):
    __tablename__ = "patient_doctor_assignments"
    __table_args__ = (UniqueConstraint("patient_id", "doctor_id", name="uq_patient_doctor_assignment"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))

    patient = relationship("Patient", back_populates="doctor_assignments")
    doctor = relationship("Doctor", back_populates="patient_assignments")
