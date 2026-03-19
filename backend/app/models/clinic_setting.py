from sqlalchemy import Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class ClinicSetting(TimestampMixin, Base):
    __tablename__ = "clinic_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    allow_multi_doctor_visibility: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
