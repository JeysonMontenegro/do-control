from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class DoctorPhoneNumber(TimestampMixin, Base):
    __tablename__ = "doctor_phone_numbers"
    __table_args__ = (
        UniqueConstraint("doctor_id", "phone_number", name="uq_doctor_phone_numbers_doctor_phone"),
        CheckConstraint("length(btrim(phone_number)) > 0", name="ck_doctor_phone_numbers_not_blank"),
        Index("ix_doctor_phone_numbers_doctor_id", "doctor_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))
    phone_number: Mapped[str] = mapped_column(String(30), index=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    channel_type: Mapped[str | None] = mapped_column(String(30), nullable=True)

    doctor = relationship("Doctor", back_populates="phone_numbers")
