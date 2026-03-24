from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class PatientPhoneNumber(TimestampMixin, Base):
    __tablename__ = "patient_phone_numbers"
    __table_args__ = (
        UniqueConstraint("patient_id", "phone_number", name="uq_patient_phone_numbers_patient_phone"),
        CheckConstraint("length(btrim(phone_number)) > 0", name="ck_patient_phone_numbers_not_blank"),
        Index("ix_patient_phone_numbers_patient_id", "patient_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    phone_number: Mapped[str] = mapped_column(String(30), index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    patient = relationship("Patient", back_populates="phone_numbers")
