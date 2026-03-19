import json
import secrets
from datetime import datetime, timedelta, timezone
from urllib import error, request

from app.core.config import settings
from app.models.email_dispatch import EmailDispatch
from app.models.user import Role, User, UserRole
from app.models.user_action_token import UserActionToken
from app.repositories.clinic_setting import ClinicSettingRepository
from app.repositories.email_dispatch import EmailDispatchRepository
from app.repositories.email_template import EmailTemplateRepository
from app.repositories.user import UserRepository
from app.repositories.user_action_token import UserActionTokenRepository
from app.schemas.auth_email import AdminInviteRequest
from app.services.audit import create_audit_log
from app.services.email_template import EmailTemplateService
from app.services.errors import NotFoundError, ValidationError
from app.services.security import hash_password, verify_password

WELCOME_TEMPLATE_KEY = "welcome_email"
PASSWORD_RESET_TEMPLATE_KEY = "password_reset_email"
ADMIN_INVITE_TEMPLATE_KEY = "admin_invite_email"


class EmailService:
    def __init__(self, db) -> None:
        self.db = db
        self.dispatch_repository = EmailDispatchRepository(db)
        self.clinic_setting_repository = ClinicSettingRepository(db)
        self.template_repository = EmailTemplateRepository(db)
        self.user_repository = UserRepository(db)
        self.token_repository = UserActionTokenRepository(db)

    @staticmethod
    def _is_non_production_recipient(email: str) -> bool:
        normalized = email.strip().lower()
        return (
            normalized.endswith("@docontrol.local")
            or normalized.endswith("@example.com")
            or normalized.endswith(".test")
            or normalized.endswith("@localhost")
        )

    def _send_with_brevo(self, *, to_email: str, to_name: str | None, subject: str, html_body: str, text_body: str | None) -> str | None:
        if self._is_non_production_recipient(to_email):
            return None
        clinic_setting = self.clinic_setting_repository.get_singleton()
        clinic_enabled = clinic_setting.email_delivery_enabled if clinic_setting is not None else True
        if not settings.email_delivery_enabled or not clinic_enabled or not settings.brevo_api_key:
            return None
        payload = {
            "sender": {"name": settings.email_from_name, "email": settings.email_from_address},
            "to": [{"email": to_email, "name": to_name or to_email}],
            "subject": subject,
            "htmlContent": html_body,
        }
        if text_body:
            payload["textContent"] = text_body
        req = request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "accept": "application/json",
                "api-key": settings.brevo_api_key,
                "content-type": "application/json",
            },
            method="POST",
        )
        with request.urlopen(req, timeout=10) as response:
            body = json.loads(response.read().decode("utf-8") or "{}")
        return body.get("messageId")

    def send_email(
        self,
        *,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str | None = None,
        template_key: str | None = None,
        template_id: int | None = None,
        user_id: int | None = None,
        recipient_name: str | None = None,
    ) -> EmailDispatch:
        dispatch = self.dispatch_repository.create(
            EmailDispatch(
                user_id=user_id,
                template_id=template_id,
                recipient_email=to_email,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                template_key=template_key,
                status="pending",
                provider="brevo",
            )
        )
        try:
            provider_message_id = self._send_with_brevo(
                to_email=to_email,
                to_name=recipient_name,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
            )
            dispatch.status = "sent" if provider_message_id else "skipped"
            dispatch.provider_message_id = provider_message_id
            dispatch.error_message = None
        except error.HTTPError as exc:
            dispatch.status = "failed"
            dispatch.error_message = exc.read().decode("utf-8")
        except Exception as exc:  # noqa: BLE001
            dispatch.status = "failed"
            dispatch.error_message = str(exc)
        self.db.flush()
        create_audit_log(
            self.db,
            action="send_email",
            entity_type="email_dispatch",
            entity_id=str(dispatch.id),
            after_data={"status": dispatch.status, "recipient_email": dispatch.recipient_email, "template_key": dispatch.template_key},
        )
        self.db.commit()
        self.db.refresh(dispatch)
        return dispatch

    def _render_template(self, template_key: str, variables: dict[str, object]) -> tuple[int, str, str, str | None]:
        template = self.template_repository.get_by_key(template_key)
        if template is None or not template.is_active:
            raise NotFoundError(f"Email template '{template_key}' not found.")
        rendered_subject = EmailTemplateService.render_text(template.subject, variables) or template.subject
        rendered_html = EmailTemplateService.render_text(template.html_body, variables) or template.html_body
        rendered_text = EmailTemplateService.render_text(template.text_body, variables)
        return template.id, rendered_subject, rendered_html, rendered_text

    def send_welcome_email(self, user: User, *, temporary_password: str | None = None) -> EmailDispatch:
        template_id, subject, html_body, text_body = self._render_template(
            WELCOME_TEMPLATE_KEY,
            {
                "app_name": settings.email_from_name,
                "recipient_name": f"{user.first_name} {user.last_name}".strip(),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "temporary_password": temporary_password or "",
            },
        )
        return self.send_email(
            to_email=user.email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_key=WELCOME_TEMPLATE_KEY,
            template_id=template_id,
            user_id=user.id,
            recipient_name=f"{user.first_name} {user.last_name}".strip(),
        )

    def _create_action_token(self, user: User, *, action_type: str, expires_in_minutes: int) -> str:
        raw_token = secrets.token_urlsafe(32)
        token = self.token_repository.create(
            UserActionToken(
                user_id=user.id,
                action_type=action_type,
                token_hash=hash_password(raw_token),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes),
            )
        )
        self.db.flush()
        return raw_token

    def send_password_reset_email(self, user: User) -> EmailDispatch:
        raw_token = self._create_action_token(
            user,
            action_type="password_reset",
            expires_in_minutes=settings.password_reset_token_expire_minutes,
        )
        reset_link = f"{settings.app_url.rstrip('/')}/reset-password?token={raw_token}"
        template_id, subject, html_body, text_body = self._render_template(
            PASSWORD_RESET_TEMPLATE_KEY,
            {
                "app_name": settings.email_from_name,
                "recipient_name": f"{user.first_name} {user.last_name}".strip(),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "reset_link": reset_link,
                "expires_in_minutes": settings.password_reset_token_expire_minutes,
            },
        )
        return self.send_email(
            to_email=user.email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_key=PASSWORD_RESET_TEMPLATE_KEY,
            template_id=template_id,
            user_id=user.id,
            recipient_name=f"{user.first_name} {user.last_name}".strip(),
        )

    def send_admin_invite_email(self, payload: AdminInviteRequest) -> EmailDispatch:
        user = self.user_repository.get_by_email(str(payload.email))
        temporary_password: str | None = None
        if user is None:
            admin_role = self.user_repository.get_role_by_name("admin")
            if admin_role is None:
                admin_role = self.user_repository.create_role(Role(name="admin", description="Administrator"))
            temporary_password = secrets.token_urlsafe(10)
            user = self.user_repository.create(
                User(
                    email=str(payload.email),
                    password_hash=hash_password(temporary_password),
                    first_name=payload.first_name,
                    last_name=payload.last_name,
                    gender=payload.gender,
                    is_active=True,
                )
            )
            self.user_repository.add_role(UserRole(user_id=user.id, role_id=admin_role.id))
            self.db.flush()
        else:
            admin_role = self.user_repository.get_role_by_name("admin")
            if admin_role is None:
                admin_role = self.user_repository.create_role(Role(name="admin", description="Administrator"))
            if not any(user_role.role_id == admin_role.id for user_role in user.roles):
                self.user_repository.add_role(UserRole(user_id=user.id, role_id=admin_role.id))
                self.db.flush()
        raw_token = self._create_action_token(
            user,
            action_type="admin_invite",
            expires_in_minutes=settings.admin_invite_token_expire_minutes,
        )
        invite_link = f"{settings.app_url.rstrip('/')}/activate-admin?token={raw_token}"
        template_id, subject, html_body, text_body = self._render_template(
            ADMIN_INVITE_TEMPLATE_KEY,
            {
                "app_name": settings.email_from_name,
                "recipient_name": f"{user.first_name} {user.last_name}".strip(),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "invite_link": invite_link,
                "expires_in_minutes": settings.admin_invite_token_expire_minutes,
                "temporary_password": temporary_password or "",
            },
        )
        return self.send_email(
            to_email=user.email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_key=ADMIN_INVITE_TEMPLATE_KEY,
            template_id=template_id,
            user_id=user.id,
            recipient_name=f"{user.first_name} {user.last_name}".strip(),
        )

    def request_password_reset(self, email: str) -> None:
        user = self.user_repository.get_by_email(email)
        if user is None or not user.is_active:
            return
        self.send_password_reset_email(user)

    def confirm_password_reset(self, *, token: str, new_password: str) -> None:
        matching_token = None
        for candidate in self.token_repository.list_active(action_type="password_reset"):
            if verify_password(token, candidate.token_hash):
                matching_token = candidate
                break
        if matching_token is None:
            raise ValidationError("Invalid or expired password reset token.")
        user = self.user_repository.get(matching_token.user_id)
        if user is None:
            raise NotFoundError("User not found.")
        user.password_hash = hash_password(new_password)
        matching_token.used_at = datetime.now(timezone.utc)
        create_audit_log(
            self.db,
            action="password_reset_confirmed",
            entity_type="user",
            entity_id=str(user.id),
            after_data={"email": user.email},
        )
        self.db.commit()

    def list_dispatches(self) -> list[EmailDispatch]:
        return self.dispatch_repository.list()

    def resend_dispatch(self, dispatch_id: int, *, recipient_email: str | None = None) -> EmailDispatch:
        dispatch = self.dispatch_repository.get(dispatch_id)
        if dispatch is None:
            raise NotFoundError("Email dispatch not found.")
        return self.send_email(
            to_email=recipient_email or dispatch.recipient_email,
            subject=dispatch.subject,
            html_body=dispatch.html_body,
            text_body=dispatch.text_body,
            template_key=dispatch.template_key,
            template_id=dispatch.template_id,
            user_id=dispatch.user_id,
        )

    def send_test_email(self, *, recipient_email: str, template_key: str) -> EmailDispatch:
        template_id, subject, html_body, text_body = self._render_template(
            template_key,
            {
                "app_name": settings.email_from_name,
                "recipient_name": "Usuario de prueba",
                "first_name": "Usuario",
                "last_name": "Prueba",
                "email": recipient_email,
                "temporary_password": "Temp123456",
                "reset_link": f"{settings.app_url.rstrip('/')}/reset-password-demo",
                "invite_link": f"{settings.app_url.rstrip('/')}/activate-admin-demo",
                "expires_in_minutes": "60",
            },
        )
        return self.send_email(
            to_email=recipient_email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            template_key=template_key,
            template_id=template_id,
            recipient_name="Usuario de prueba",
        )
