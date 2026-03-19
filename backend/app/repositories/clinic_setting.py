from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.clinic_setting import ClinicSetting


class ClinicSettingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_singleton(self) -> ClinicSetting | None:
        return self.db.scalar(select(ClinicSetting).where(ClinicSetting.id == 1))

    def create_default(self) -> ClinicSetting:
        setting = ClinicSetting(id=1, allow_multi_doctor_visibility=False)
        self.db.add(setting)
        self.db.flush()
        return setting
