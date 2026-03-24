from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class DoctorStaffAssignment(TimestampMixin, Base):
    __tablename__ = "doctor_staff_assignments"
    __table_args__ = (
        UniqueConstraint("doctor_id", "staff_user_id", "assignment_type", name="uq_doctor_staff_assignment"),
        Index("ix_doctor_staff_assignments_doctor_id", "doctor_id"),
        Index("ix_doctor_staff_assignments_staff_user_id", "staff_user_id"),
        Index("ix_doctor_staff_assignments_staff_active", "staff_user_id", "is_active"),
        Index("ix_doctor_staff_assignments_doctor_active", "doctor_id", "is_active"),
        CheckConstraint("assignment_type IN ('receptionist')", name="ck_doctor_staff_assignments_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=False)
    staff_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assignment_type: Mapped[str] = mapped_column(String(30), default="receptionist", server_default="receptionist")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    doctor = relationship("Doctor", back_populates="staff_assignments")
    staff_user = relationship("User", back_populates="doctor_staff_assignments")
