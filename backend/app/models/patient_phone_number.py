from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class PatientPhoneNumber(TimestampMixin, Base):
    __tablename__ = "patient_phone_numbers"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    phone_number: Mapped[str] = mapped_column(String(30), index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    patient = relationship("Patient", back_populates="phone_numbers")
