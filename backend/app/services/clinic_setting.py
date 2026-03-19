from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.clinic_setting import ClinicSettingRepository
from app.schemas.clinic_setting import ClinicSettingRead, ClinicSettingUpdate
from app.services.audit import create_audit_log


class ClinicSettingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ClinicSettingRepository(db)

    @staticmethod
    def _serialize(setting) -> ClinicSettingRead:
        env_enabled = settings.email_delivery_enabled
        return ClinicSettingRead(
            id=setting.id,
            allow_multi_doctor_visibility=setting.allow_multi_doctor_visibility,
            email_delivery_enabled=setting.email_delivery_enabled,
            email_delivery_available=env_enabled,
            email_delivery_active=env_enabled and setting.email_delivery_enabled,
            welcome_doctor_email_enabled=setting.welcome_doctor_email_enabled,
            welcome_receptionist_email_enabled=setting.welcome_receptionist_email_enabled,
            password_reset_email_enabled=setting.password_reset_email_enabled,
            admin_invite_email_enabled=setting.admin_invite_email_enabled,
            manual_test_email_enabled=setting.manual_test_email_enabled,
            manual_resend_email_enabled=setting.manual_resend_email_enabled,
            created_at=setting.created_at,
            updated_at=setting.updated_at,
        )

    def get_settings(self) -> ClinicSettingRead:
        setting = self.repository.get_singleton()
        if setting is None:
            setting = self.repository.create_default()
            self.db.commit()
            self.db.refresh(setting)
        return self._serialize(setting)

    def update_settings(self, payload: ClinicSettingUpdate) -> ClinicSettingRead:
        setting = self.repository.get_singleton()
        if setting is None:
            setting = self.repository.create_default()

        before = {
            "allow_multi_doctor_visibility": setting.allow_multi_doctor_visibility,
            "email_delivery_enabled": setting.email_delivery_enabled,
            "welcome_doctor_email_enabled": setting.welcome_doctor_email_enabled,
            "welcome_receptionist_email_enabled": setting.welcome_receptionist_email_enabled,
            "password_reset_email_enabled": setting.password_reset_email_enabled,
            "admin_invite_email_enabled": setting.admin_invite_email_enabled,
            "manual_test_email_enabled": setting.manual_test_email_enabled,
            "manual_resend_email_enabled": setting.manual_resend_email_enabled,
        }
        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(setting, field, value)

        create_audit_log(
            self.db,
            action="update",
            entity_type="clinic_setting",
            entity_id=str(setting.id),
            before_data=before,
            after_data={
                "allow_multi_doctor_visibility": setting.allow_multi_doctor_visibility,
                "email_delivery_enabled": setting.email_delivery_enabled,
                "welcome_doctor_email_enabled": setting.welcome_doctor_email_enabled,
                "welcome_receptionist_email_enabled": setting.welcome_receptionist_email_enabled,
                "password_reset_email_enabled": setting.password_reset_email_enabled,
                "admin_invite_email_enabled": setting.admin_invite_email_enabled,
                "manual_test_email_enabled": setting.manual_test_email_enabled,
                "manual_resend_email_enabled": setting.manual_resend_email_enabled,
            },
        )
        self.db.commit()
        self.db.refresh(setting)
        return self._serialize(setting)
