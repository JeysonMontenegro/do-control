from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ClinicSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    allow_multi_doctor_visibility: bool
    email_delivery_enabled: bool
    email_delivery_available: bool
    email_delivery_active: bool
    welcome_doctor_email_enabled: bool
    welcome_receptionist_email_enabled: bool
    password_reset_email_enabled: bool
    admin_invite_email_enabled: bool
    manual_test_email_enabled: bool
    manual_resend_email_enabled: bool
    created_at: datetime
    updated_at: datetime


class ClinicSettingUpdate(BaseModel):
    allow_multi_doctor_visibility: bool | None = None
    email_delivery_enabled: bool | None = None
    welcome_doctor_email_enabled: bool | None = None
    welcome_receptionist_email_enabled: bool | None = None
    password_reset_email_enabled: bool | None = None
    admin_invite_email_enabled: bool | None = None
    manual_test_email_enabled: bool | None = None
    manual_resend_email_enabled: bool | None = None
