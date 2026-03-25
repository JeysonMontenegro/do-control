from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.clinic_setting import ClinicSettingRepository
from app.schemas.integration import (
    MessagingWhitelistAllowedRead,
    MessagingWhitelistPhoneMutation,
    MessagingWhitelistPhoneMutationRead,
    MessagingWhitelistStateRead,
    MessagingWhitelistToggle,
)
from app.services.audit import create_audit_log
from app.services.errors import ValidationError
from app.services.phone_number import normalize_phone_number, phone_number_candidates


class MessagingWhitelistService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ClinicSettingRepository(db)

    @staticmethod
    def _default_enabled() -> bool:
        return settings.environment.strip().lower() not in {"production", "prod"}

    @staticmethod
    def _parse_phones(raw_value: str | None) -> list[str]:
        if not raw_value:
            return []

        phones: list[str] = []
        seen: set[str] = set()
        for item in raw_value.split(","):
            normalized = normalize_phone_number(item)
            if normalized and normalized not in seen:
                phones.append(normalized)
                seen.add(normalized)
        return phones

    @classmethod
    def _serialize_state(cls, setting) -> MessagingWhitelistStateRead:
        enabled = cls._default_enabled() if setting.messaging_whitelist_enabled is None else setting.messaging_whitelist_enabled
        return MessagingWhitelistStateRead(
            enabled=enabled,
            phones=cls._parse_phones(setting.messaging_whitelist_phones),
        )

    def _get_or_create_setting(self):
        setting = self.repository.get_singleton()
        if setting is None:
            setting = self.repository.create_default()
            self.db.commit()
            self.db.refresh(setting)
        return setting

    def get_state(self) -> MessagingWhitelistStateRead:
        setting = self._get_or_create_setting()
        return self._serialize_state(setting)

    def can_send(self, phone: str) -> MessagingWhitelistAllowedRead:
        state = self.get_state()
        if not state.enabled:
            return MessagingWhitelistAllowedRead(allowed=True)

        candidates = phone_number_candidates(phone)
        allowed = any(whitelisted_phone in candidates for whitelisted_phone in state.phones)
        return MessagingWhitelistAllowedRead(allowed=allowed)

    def update_enabled(self, payload: MessagingWhitelistToggle) -> MessagingWhitelistStateRead:
        setting = self._get_or_create_setting()
        before_state = self._serialize_state(setting)
        setting.messaging_whitelist_enabled = payload.enabled
        create_audit_log(
            self.db,
            action="update",
            entity_type="messaging_whitelist",
            entity_id=str(setting.id),
            before_data={"enabled": before_state.enabled},
            after_data={"enabled": payload.enabled},
        )
        self.db.commit()
        self.db.refresh(setting)
        return self._serialize_state(setting)

    def add_phone(self, payload: MessagingWhitelistPhoneMutation) -> MessagingWhitelistPhoneMutationRead:
        normalized_phone = normalize_phone_number(payload.phone)
        if normalized_phone is None:
            raise ValidationError("Phone is required.")

        setting = self._get_or_create_setting()
        phones = self._parse_phones(setting.messaging_whitelist_phones)
        if normalized_phone not in phones:
            phones.append(normalized_phone)
            phones.sort()
            setting.messaging_whitelist_phones = ",".join(phones)
            create_audit_log(
                self.db,
                action="add_phone",
                entity_type="messaging_whitelist",
                entity_id=str(setting.id),
                after_data={"phone": normalized_phone},
            )
            self.db.commit()
            self.db.refresh(setting)
        return MessagingWhitelistPhoneMutationRead(added=normalized_phone)

    def remove_phone(self, phone: str) -> MessagingWhitelistPhoneMutationRead:
        normalized_phone = normalize_phone_number(phone)
        if normalized_phone is None:
            raise ValidationError("Phone is required.")

        setting = self._get_or_create_setting()
        phones = [item for item in self._parse_phones(setting.messaging_whitelist_phones) if item != normalized_phone]
        setting.messaging_whitelist_phones = ",".join(phones)
        create_audit_log(
            self.db,
            action="remove_phone",
            entity_type="messaging_whitelist",
            entity_id=str(setting.id),
            after_data={"phone": normalized_phone},
        )
        self.db.commit()
        self.db.refresh(setting)
        return MessagingWhitelistPhoneMutationRead(removed=normalized_phone)
