import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.doctor import Doctor
from app.models.doctor_clinic import DoctorClinic
from app.models.user import Role, User, UserRole
from app.models.user_action_token import UserActionToken
from app.repositories.doctor import DoctorRepository
from app.repositories.user import UserRepository
from app.repositories.user_action_token import UserActionTokenRepository
from app.schemas.doctor_onboarding import (
    DoctorOnboardingCompleteRead,
    DoctorOnboardingCompleteRequest,
    DoctorOnboardingInviteCreate,
    DoctorOnboardingInviteRead,
    DoctorOnboardingTokenRead,
)
from app.services.audit import create_audit_log
from app.services.email_service import EmailService
from app.services.errors import NotFoundError, ValidationError
from app.services.security import hash_password, verify_password
from app.services.service_utils import sync_doctor_primary_phone


DOCTOR_ONBOARDING_ACTION = "doctor_onboarding"


class DoctorOnboardingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.doctor_repository = DoctorRepository(db)
        self.user_repository = UserRepository(db)
        self.token_repository = UserActionTokenRepository(db)

    @staticmethod
    def _split_full_name(full_name: str) -> tuple[str, str]:
        parts = [part for part in full_name.strip().split() if part]
        if len(parts) < 2:
            raise ValidationError("Ingresa nombre y apellido del doctor.")
        return parts[0], " ".join(parts[1:])

    @staticmethod
    def _onboarding_url(raw_token: str) -> str:
        return f"{settings.app_url.rstrip('/')}/doctor/onboarding/{raw_token}"

    def _create_token(self, user_id: int) -> tuple[str, datetime]:
        raw_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.doctor_onboarding_token_expire_minutes)
        self.token_repository.create(
            UserActionToken(
                user_id=user_id,
                action_type=DOCTOR_ONBOARDING_ACTION,
                token_hash=hash_password(raw_token),
                expires_at=expires_at,
            )
        )
        self.db.flush()
        return raw_token, expires_at

    def _resolve_token(self, raw_token: str) -> UserActionToken:
        for candidate in self.token_repository.list_active(action_type=DOCTOR_ONBOARDING_ACTION):
            if verify_password(raw_token, candidate.token_hash):
                return candidate
        raise ValidationError("El enlace de registro no es válido, ya venció o ya fue utilizado.")

    def _load_doctor_from_token(self, token: UserActionToken) -> Doctor:
        user = self.user_repository.get(token.user_id)
        if user is None or user.doctor_profile is None:
            raise NotFoundError("Doctor not found.")
        return user.doctor_profile

    def create_invitation(self, payload: DoctorOnboardingInviteCreate) -> DoctorOnboardingInviteRead:
        first_name, last_name = self._split_full_name(payload.full_name)
        normalized_email = str(payload.email).strip().lower()
        normalized_phone = payload.phone_number.strip()

        if self.user_repository.get_by_email(normalized_email) is not None:
            raise ValidationError("Ya existe un usuario con ese correo.")
        existing_phone_user = self.user_repository.get_by_phone_number(normalized_phone)
        if existing_phone_user is not None:
            raise ValidationError("Ya existe un usuario con ese teléfono.")
        if self.doctor_repository.phone_number_in_use(normalized_phone):
            raise ValidationError("Ya existe un doctor con ese teléfono.")

        doctor_role = self.user_repository.get_role_by_name("doctor")
        if doctor_role is None:
            doctor_role = self.user_repository.create_role(Role(name="doctor", description="Doctor"))

        placeholder_password = secrets.token_urlsafe(24)
        user = self.user_repository.create(
            User(
                email=normalized_email,
                password_hash=hash_password(placeholder_password),
                first_name=first_name,
                last_name=last_name,
                is_active=False,
            )
        )
        self.user_repository.sync_primary_phone_number(
            user.id,
            normalized_phone,
            phone_type="mobile",
            is_verified=False,
            can_talk_to_bot=True,
        )
        self.user_repository.add_role(UserRole(user_id=user.id, role_id=doctor_role.id))

        doctor = self.doctor_repository.create(Doctor(linked_user_id=user.id))
        sync_doctor_primary_phone(
            doctor_repository=self.doctor_repository,
            user=user,
            phone_number=normalized_phone,
            channel_type="whatsapp",
        )
        raw_token, expires_at = self._create_token(user.id)

        create_audit_log(
            self.db,
            action="create_doctor_invitation",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"email": normalized_email, "expires_at": expires_at.isoformat()},
        )
        self.db.commit()
        self.db.refresh(doctor)

        EmailService(self.db).send_email(
            to_email=normalized_email,
            subject="Completa tu registro en do-control",
            html_body=(
                "<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#14213d'>"
                f"<h1 style='font-size:24px;margin-bottom:16px'>Hola {first_name},</h1>"
                "<p style='font-size:16px;line-height:1.5'>Tu clínica te invitó a completar tu registro médico en do-control.</p>"
                f"<p style='font-size:16px;line-height:1.5'><a href='{self._onboarding_url(raw_token)}' "
                "style='display:inline-block;background:#14213d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px'>"
                "Completar registro</a></p>"
                f"<p style='font-size:14px;line-height:1.5'>Este enlace vence en {settings.doctor_onboarding_token_expire_minutes} minutos y solo puede usarse una vez.</p>"
                f"<p style='font-size:12px;line-height:1.5;word-break:break-all'>{self._onboarding_url(raw_token)}</p>"
                "</div>"
            ),
            text_body=(
                f"Hola {first_name},\n\n"
                "Tu clínica te invitó a completar tu registro médico en do-control.\n\n"
                f"Completa tu registro aquí: {self._onboarding_url(raw_token)}\n\n"
                f"Este enlace vence en {settings.doctor_onboarding_token_expire_minutes} minutos y solo puede usarse una vez."
            ),
            recipient_name=f"{first_name} {last_name}".strip(),
            user_id=user.id,
            process_key="welcome_doctor",
        )

        return DoctorOnboardingInviteRead(
            status="sent",
            doctor_id=doctor.id,
            user_id=user.id,
            email=normalized_email,
            phone_number=normalized_phone,
            expires_at=expires_at,
            onboarding_url=self._onboarding_url(raw_token),
        )

    def read_invitation(self, raw_token: str) -> DoctorOnboardingTokenRead:
        token = self._resolve_token(raw_token)
        doctor = self._load_doctor_from_token(token)
        user = doctor.linked_user
        if user is None:
            raise NotFoundError("Doctor not found.")
        return DoctorOnboardingTokenRead(
            doctor_id=doctor.id,
            user_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            phone_number=user.primary_phone_number,
            expires_at=token.expires_at,
        )

    def complete_onboarding(self, payload: DoctorOnboardingCompleteRequest) -> DoctorOnboardingCompleteRead:
        token = self._resolve_token(payload.token)
        doctor = self._load_doctor_from_token(token)
        user = doctor.linked_user
        if user is None:
            raise NotFoundError("Doctor not found.")

        if payload.first_name is not None:
            user.first_name = payload.first_name.strip()
        if payload.last_name is not None:
            user.last_name = payload.last_name.strip()
        user.gender = payload.gender
        user.password_hash = hash_password(payload.password)
        user.is_active = True

        doctor.doctor_title = payload.doctor_title.strip() if payload.doctor_title else None
        doctor.date_of_birth = payload.date_of_birth
        doctor.license_number = payload.license_number.strip() if payload.license_number else None
        doctor.specialty = payload.specialty.strip() if payload.specialty else None
        self.doctor_repository.replace_clinics(doctor, [DoctorClinic(**clinic.model_dump()) for clinic in payload.clinics])

        token.used_at = datetime.now(timezone.utc)
        create_audit_log(
            self.db,
            action="complete_doctor_onboarding",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"email": user.email},
        )
        self.db.commit()
        self.db.refresh(doctor)

        return DoctorOnboardingCompleteRead(
            status="completed",
            doctor_id=doctor.id,
            user_id=user.id,
            email=user.email,
        )
