from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.clinic_setting import ClinicSetting


class ClinicSettingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_singleton(self) -> ClinicSetting | None:
        return self.db.scalar(select(ClinicSetting).where(ClinicSetting.id == 1))

    def create_default(self) -> ClinicSetting:
        setting = ClinicSetting(
            id=1,
            allow_multi_doctor_visibility=False,
            email_delivery_enabled=True,
            welcome_doctor_email_enabled=True,
            welcome_receptionist_email_enabled=True,
            password_reset_email_enabled=True,
            admin_invite_email_enabled=True,
            manual_test_email_enabled=True,
            manual_resend_email_enabled=True,
        )
        self.db.add(setting)
        self.db.flush()
        return setting
