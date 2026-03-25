from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.clinic_setting import ClinicSettingRepository
from app.schemas.integration import (
    EmailWhitelistAddressMutation,
    EmailWhitelistAddressMutationRead,
    EmailWhitelistAllowedRead,
    EmailWhitelistStateRead,
    EmailWhitelistToggle,
)
from app.services.audit import create_audit_log
from app.services.errors import ValidationError


class EmailWhitelistService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ClinicSettingRepository(db)

    @staticmethod
    def _default_enabled() -> bool:
        return settings.environment.strip().lower() not in {"production", "prod"}

    @staticmethod
    def normalize_email(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        return normalized or None

    @classmethod
    def _parse_addresses(cls, raw_value: str | None) -> list[str]:
        if not raw_value:
            return []

        addresses: list[str] = []
        seen: set[str] = set()
        for item in raw_value.split(","):
            normalized = cls.normalize_email(item)
            if normalized and normalized not in seen:
                addresses.append(normalized)
                seen.add(normalized)
        return addresses

    @classmethod
    def _serialize_state(cls, setting) -> EmailWhitelistStateRead:
        enabled = cls._default_enabled() if setting.email_whitelist_enabled is None else setting.email_whitelist_enabled
        return EmailWhitelistStateRead(
            enabled=enabled,
            addresses=cls._parse_addresses(setting.email_whitelist_addresses),
        )

    def _get_or_create_setting(self):
        setting = self.repository.get_singleton()
        if setting is None:
            setting = self.repository.create_default()
            self.db.commit()
            self.db.refresh(setting)
        return setting

    def get_state(self) -> EmailWhitelistStateRead:
        setting = self._get_or_create_setting()
        return self._serialize_state(setting)

    def can_send(self, email: str) -> EmailWhitelistAllowedRead:
        normalized_email = self.normalize_email(email)
        if normalized_email is None:
            raise ValidationError("Email is required.")

        state = self.get_state()
        if not state.enabled:
            return EmailWhitelistAllowedRead(allowed=True)
        return EmailWhitelistAllowedRead(allowed=normalized_email in state.addresses)

    def update_enabled(self, payload: EmailWhitelistToggle) -> EmailWhitelistStateRead:
        setting = self._get_or_create_setting()
        before_state = self._serialize_state(setting)
        setting.email_whitelist_enabled = payload.enabled
        create_audit_log(
            self.db,
            action="update",
            entity_type="email_whitelist",
            entity_id=str(setting.id),
            before_data={"enabled": before_state.enabled},
            after_data={"enabled": payload.enabled},
        )
        self.db.commit()
        self.db.refresh(setting)
        return self._serialize_state(setting)

    def add_address(self, payload: EmailWhitelistAddressMutation) -> EmailWhitelistAddressMutationRead:
        normalized_email = self.normalize_email(payload.email)
        if normalized_email is None:
            raise ValidationError("Email is required.")

        setting = self._get_or_create_setting()
        addresses = self._parse_addresses(setting.email_whitelist_addresses)
        if normalized_email not in addresses:
            addresses.append(normalized_email)
            addresses.sort()
            setting.email_whitelist_addresses = ",".join(addresses)
            create_audit_log(
                self.db,
                action="add_email",
                entity_type="email_whitelist",
                entity_id=str(setting.id),
                after_data={"email": normalized_email},
            )
            self.db.commit()
            self.db.refresh(setting)
        return EmailWhitelistAddressMutationRead(added=normalized_email)

    def remove_address(self, email: str) -> EmailWhitelistAddressMutationRead:
        normalized_email = self.normalize_email(email)
        if normalized_email is None:
            raise ValidationError("Email is required.")

        setting = self._get_or_create_setting()
        addresses = [item for item in self._parse_addresses(setting.email_whitelist_addresses) if item != normalized_email]
        setting.email_whitelist_addresses = ",".join(addresses)
        create_audit_log(
            self.db,
            action="remove_email",
            entity_type="email_whitelist",
            entity_id=str(setting.id),
            after_data={"email": normalized_email},
        )
        self.db.commit()
        self.db.refresh(setting)
        return EmailWhitelistAddressMutationRead(removed=normalized_email)
