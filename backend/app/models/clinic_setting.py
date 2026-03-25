from sqlalchemy import Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class ClinicSetting(TimestampMixin, Base):
    __tablename__ = "clinic_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    allow_multi_doctor_visibility: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    email_delivery_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    welcome_doctor_email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    welcome_receptionist_email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    password_reset_email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    admin_invite_email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    manual_test_email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    manual_resend_email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    email_whitelist_enabled: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    email_whitelist_addresses: Mapped[str] = mapped_column(Text, default="", server_default="")
    messaging_whitelist_enabled: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    messaging_whitelist_phones: Mapped[str] = mapped_column(Text, default="", server_default="")
