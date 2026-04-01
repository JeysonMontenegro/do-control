import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

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
    DoctorOnboardingAdminCompleteRequest,
    DoctorOnboardingAdminRead,
    DoctorOnboardingCompleteRead,
    DoctorOnboardingCompleteRequest,
    DoctorOnboardingInviteCreate,
    DoctorOnboardingInviteRead,
    DoctorOnboardingStepRead,
    DoctorOnboardingTokenRead,
)
from app.services.audit import create_audit_log
from app.services.email_service import EmailService
from app.services.errors import NotFoundError, ValidationError
from app.services.security import hash_password, verify_password
from app.services.service_utils import sync_doctor_primary_phone
from app.services.storage import StorageService


DOCTOR_ONBOARDING_ACTION = "doctor_onboarding"


class DoctorOnboardingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.doctor_repository = DoctorRepository(db)
        self.user_repository = UserRepository(db)
        self.token_repository = UserActionTokenRepository(db)
        self.storage = StorageService()

    @staticmethod
    def _split_full_name(full_name: str) -> tuple[str, str]:
        parts = [part for part in full_name.strip().split() if part]
        if len(parts) < 2:
            raise ValidationError("Ingresa nombre y apellido del doctor.")
        return parts[0], " ".join(parts[1:])

    @staticmethod
    def _onboarding_url(raw_token: str) -> str:
        return f"{settings.app_url.rstrip('/')}/doctor/onboarding/{raw_token}"

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    def _create_token(self, user_id: int) -> tuple[str, datetime]:
        raw_token = secrets.token_urlsafe(32)
        expires_at = self._now() + timedelta(minutes=settings.doctor_onboarding_token_expire_minutes)
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

    def _list_tokens_for_user(self, user_id: int) -> list[UserActionToken]:
        return self.token_repository.list_for_user(user_id, action_type=DOCTOR_ONBOARDING_ACTION)

    def _latest_token_for_user(self, user_id: int) -> UserActionToken | None:
        tokens = self._list_tokens_for_user(user_id)
        return tokens[0] if tokens else None

    def _revoke_active_tokens(self, user_id: int) -> None:
        revoked_at = self._now()
        for token in self._list_tokens_for_user(user_id):
            if token.used_at is None and token.revoked_at is None and token.expires_at > revoked_at:
                token.revoked_at = revoked_at

    def _load_doctor_from_token(self, token: UserActionToken) -> Doctor:
        user = self.user_repository.get(token.user_id)
        if user is None or user.doctor_profile is None:
            raise NotFoundError("Doctor not found.")
        return user.doctor_profile

    def _profile_photo_url(self, storage_key: str | None) -> str | None:
        if not storage_key:
            return None
        return self.storage.generate_presigned_download_url(key=storage_key, expires_in_seconds=3600)

    @staticmethod
    def _token_status(token: UserActionToken | None) -> str:
        if token is None:
            return "missing"
        if token.used_at is not None:
            return "used"
        if token.revoked_at is not None:
            return "revoked"
        if token.expires_at <= datetime.now(timezone.utc):
            return "expired"
        return "active"

    @staticmethod
    def _profile_details_completed(doctor: Doctor) -> bool:
        return bool(
            (doctor.doctor_title or "").strip()
            or (doctor.specialty or "").strip()
            or (doctor.license_number or "").strip()
            or doctor.date_of_birth is not None
            or doctor.clinics
        )

    def _serialize_admin_onboarding(self, doctor: Doctor, token: UserActionToken | None) -> DoctorOnboardingAdminRead:
        user = doctor.linked_user
        if user is None:
            raise NotFoundError("Doctor not found.")

        token_status = self._token_status(token)
        is_completed = bool(user.is_active)
        has_photo = bool(user.profile_photo_storage_key)
        has_profile_details = self._profile_details_completed(doctor)
        onboarding_status = (
            "completed"
            if is_completed
            else "in_progress"
            if has_photo or has_profile_details or token_status == "active"
            else "pending"
        )

        steps = [
            DoctorOnboardingStepRead(
                key="invitation",
                title="Invitación enviada",
                status="completed" if token is not None else "missing",
            ),
            DoctorOnboardingStepRead(
                key="photo",
                title="Foto de perfil",
                status="completed" if has_photo else "pending",
            ),
            DoctorOnboardingStepRead(
                key="profile",
                title="Perfil profesional",
                status="completed" if has_profile_details else "pending",
            ),
            DoctorOnboardingStepRead(
                key="access",
                title="Acceso activado",
                status="completed" if user.is_active else "pending",
            ),
        ]

        return DoctorOnboardingAdminRead(
            doctor_id=doctor.id,
            user_id=user.id,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            phone_number=user.primary_phone_number,
            profile_photo_url=self._profile_photo_url(user.profile_photo_storage_key),
            onboarding_status=onboarding_status,
            token_status=token_status,
            invitation_sent_at=token.created_at if token is not None else None,
            expires_at=token.expires_at if token is not None else None,
            token_used_at=token.used_at if token is not None else None,
            token_revoked_at=token.revoked_at if token is not None else None,
            can_reissue=user.is_active is False,
            can_revoke=token_status == "active",
            can_complete_for_doctor=not user.is_active,
            steps=steps,
        )

    def _send_invitation_email(self, *, raw_token: str, first_name: str, last_name: str, normalized_email: str, user_id: int) -> None:
        EmailService(self.db).send_email(
            to_email=normalized_email,
            subject="Completa tu registro en do-control",
            html_body=(
                "<div style='font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;color:#1f3142;"
                "background:#f3f8fb'>"
                "<div style='background:#ffffff;border:1px solid rgba(31,49,66,0.08);border-radius:24px;padding:32px;"
                "box-shadow:0 18px 42px rgba(18,43,68,0.08)'>"
                "<div style='display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 14px;border-radius:999px;"
                "background:rgba(15,108,120,0.1);color:#0f6c78;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase'>"
                "Invitación médica</div>"
                f"<h1 style='font-size:30px;line-height:1;margin:18px 0 12px'>Hola {first_name}, completa tu registro</h1>"
                "<p style='font-size:16px;line-height:1.6;margin:0 0 14px'>Tu clínica ya creó tu acceso inicial en do-control. "
                "Solo falta que confirmes tus datos profesionales, tus clínicas y la contraseña con la que ingresarás.</p>"
                "<div style='display:grid;gap:10px;margin:22px 0;padding:18px;border-radius:18px;background:#f6fbff;border:1px solid rgba(31,49,66,0.08)'>"
                "<strong style='font-size:15px'>Qué completarás en este registro</strong>"
                "<span style='font-size:14px;color:#60788f'>Perfil profesional, clínicas, ubicación en mapa, datos de contacto y tu contraseña de acceso.</span>"
                f"<span style='font-size:14px;color:#60788f'>Este enlace vence en {settings.doctor_onboarding_token_expire_minutes} minutos y solo puede usarse una vez.</span>"
                "</div>"
                f"<p style='margin:0 0 20px'><a href='{self._onboarding_url(raw_token)}' "
                "style='display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:14px;"
                "background:linear-gradient(180deg,#11717d 0%,#0d5d67 100%);color:#ffffff;text-decoration:none;font-weight:700'>"
                "Completar registro ahora</a></p>"
                "<p style='font-size:13px;line-height:1.6;color:#60788f;margin:0 0 8px'>Si el botón no abre, copia y pega este enlace en tu navegador:</p>"
                f"<p style='font-size:12px;line-height:1.6;word-break:break-all;color:#60788f;margin:0'>{self._onboarding_url(raw_token)}</p>"
                "</div>"
                "</div>"
            ),
            text_body=(
                f"Hola {first_name},\n\n"
                "Tu clínica te invitó a completar tu registro médico en do-control.\n\n"
                f"Completa tu registro aquí: {self._onboarding_url(raw_token)}\n\n"
                f"Este enlace vence en {settings.doctor_onboarding_token_expire_minutes} minutos y solo puede usarse una vez."
            ),
            recipient_name=f"{first_name} {last_name}".strip(),
            user_id=user_id,
            process_key="welcome_doctor",
        )

    def _serialize_token_payload(self, token: UserActionToken, doctor: Doctor) -> DoctorOnboardingTokenRead:
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
            profile_photo_url=self._profile_photo_url(user.profile_photo_storage_key),
            expires_at=token.expires_at,
        )

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
        self._send_invitation_email(
            raw_token=raw_token,
            first_name=first_name,
            last_name=last_name,
            normalized_email=normalized_email,
            user_id=user.id,
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
        return self._serialize_token_payload(token, doctor)

    def list_admin_onboardings(self) -> list[DoctorOnboardingAdminRead]:
        onboardings: list[DoctorOnboardingAdminRead] = []
        for doctor in self.doctor_repository.list():
            if doctor.linked_user is None:
                continue
            token = self._latest_token_for_user(doctor.linked_user.id)
            onboardings.append(self._serialize_admin_onboarding(doctor, token))
        onboardings.sort(
            key=lambda item: (
                item.onboarding_status != "pending",
                item.onboarding_status == "completed",
                item.first_name.lower(),
                item.last_name.lower(),
            )
        )
        return onboardings

    def reissue_invitation(self, doctor_id: int) -> DoctorOnboardingInviteRead:
        doctor = self.doctor_repository.get(doctor_id)
        if doctor is None or doctor.linked_user is None:
            raise NotFoundError("Doctor not found.")
        user = doctor.linked_user
        self._revoke_active_tokens(user.id)
        raw_token, expires_at = self._create_token(user.id)
        create_audit_log(
            self.db,
            action="reissue_doctor_invitation",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"email": user.email, "expires_at": expires_at.isoformat()},
        )
        self.db.commit()
        self.db.refresh(doctor)
        self._send_invitation_email(
            raw_token=raw_token,
            first_name=user.first_name,
            last_name=user.last_name,
            normalized_email=user.email,
            user_id=user.id,
        )
        return DoctorOnboardingInviteRead(
            status="reissued",
            doctor_id=doctor.id,
            user_id=user.id,
            email=user.email,
            phone_number=user.primary_phone_number or "",
            expires_at=expires_at,
            onboarding_url=self._onboarding_url(raw_token),
        )

    def revoke_invitation(self, doctor_id: int) -> DoctorOnboardingAdminRead:
        doctor = self.doctor_repository.get(doctor_id)
        if doctor is None or doctor.linked_user is None:
            raise NotFoundError("Doctor not found.")
        self._revoke_active_tokens(doctor.linked_user.id)
        create_audit_log(
            self.db,
            action="revoke_doctor_invitation",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"email": doctor.linked_user.email},
        )
        self.db.commit()
        self.db.refresh(doctor)
        return self._serialize_admin_onboarding(doctor, self._latest_token_for_user(doctor.linked_user.id))

    def upload_profile_photo(
        self,
        *,
        raw_token: str,
        file_name: str,
        content_type: str | None,
        content: bytes,
    ) -> DoctorOnboardingTokenRead:
        token = self._resolve_token(raw_token)
        doctor = self._load_doctor_from_token(token)
        user = doctor.linked_user
        if user is None:
            raise NotFoundError("Doctor not found.")
        if not content:
            raise ValidationError("Profile photo content is required.")
        if not content_type or not content_type.startswith("image/"):
            raise ValidationError("Profile photo must be an image.")
        if len(content) > 5 * 1024 * 1024:
            raise ValidationError("Profile photo must be 5 MB or smaller.")

        suffix = Path(file_name).suffix or ".bin"
        key = f"users/{user.id}/profile/{uuid4()}{suffix}"
        self.storage.ensure_bucket()
        self.storage.upload_bytes(key=key, content=content, content_type=content_type)
        user.profile_photo_storage_key = key
        self.db.commit()
        self.db.refresh(user)
        return self._serialize_token_payload(token, doctor)

    def admin_complete_onboarding(
        self,
        doctor_id: int,
        payload: DoctorOnboardingAdminCompleteRequest,
    ) -> DoctorOnboardingAdminRead:
        doctor = self.doctor_repository.get(doctor_id)
        if doctor is None or doctor.linked_user is None:
            raise NotFoundError("Doctor not found.")
        user = doctor.linked_user

        if payload.first_name is not None:
            user.first_name = payload.first_name.strip()
        if payload.last_name is not None:
            user.last_name = payload.last_name.strip()
        if payload.gender is not None:
            user.gender = payload.gender

        if payload.phone_number is not None:
            normalized_phone = payload.phone_number.strip()
            if normalized_phone:
                self.user_repository.sync_primary_phone_number(
                    user.id,
                    normalized_phone,
                    phone_type="mobile",
                    is_verified=False,
                    can_talk_to_bot=True,
                )
                sync_doctor_primary_phone(
                    doctor_repository=self.doctor_repository,
                    user=user,
                    phone_number=normalized_phone,
                    channel_type="whatsapp",
                )

        doctor.doctor_title = payload.doctor_title.strip() if payload.doctor_title else None
        doctor.date_of_birth = payload.date_of_birth
        doctor.license_number = payload.license_number.strip() if payload.license_number else None
        doctor.specialty = payload.specialty.strip() if payload.specialty else None
        if payload.clinics is not None:
            self.doctor_repository.replace_clinics(doctor, [DoctorClinic(**clinic.model_dump()) for clinic in payload.clinics])

        if payload.activate_user:
            if payload.user_password:
                user.password_hash = hash_password(payload.user_password)
            elif not user.is_active:
                raise ValidationError("Debes definir una contraseña temporal para completar el onboarding por admin.")
            user.is_active = True

        now = self._now()
        for token in self._list_tokens_for_user(user.id):
            if token.used_at is None and token.revoked_at is None and token.expires_at > now:
                token.used_at = now

        create_audit_log(
            self.db,
            action="complete_doctor_onboarding_admin",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"email": user.email, "activated": user.is_active},
        )
        self.db.commit()
        self.db.refresh(doctor)
        return self._serialize_admin_onboarding(doctor, self._latest_token_for_user(user.id))

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

        token.used_at = self._now()
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
