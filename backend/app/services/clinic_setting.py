from sqlalchemy.orm import Session

from app.repositories.clinic_setting import ClinicSettingRepository
from app.schemas.clinic_setting import ClinicSettingRead, ClinicSettingUpdate
from app.services.audit import create_audit_log


class ClinicSettingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ClinicSettingRepository(db)

    def get_settings(self) -> ClinicSettingRead:
        setting = self.repository.get_singleton()
        if setting is None:
            setting = self.repository.create_default()
            self.db.commit()
            self.db.refresh(setting)
        return ClinicSettingRead.model_validate(setting)

    def update_settings(self, payload: ClinicSettingUpdate) -> ClinicSettingRead:
        setting = self.repository.get_singleton()
        if setting is None:
            setting = self.repository.create_default()

        before = {"allow_multi_doctor_visibility": setting.allow_multi_doctor_visibility}
        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(setting, field, value)

        create_audit_log(
            self.db,
            action="update",
            entity_type="clinic_setting",
            entity_id=str(setting.id),
            before_data=before,
            after_data={"allow_multi_doctor_visibility": setting.allow_multi_doctor_visibility},
        )
        self.db.commit()
        self.db.refresh(setting)
        return ClinicSettingRead.model_validate(setting)
