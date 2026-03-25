import json
import logging
from ipaddress import ip_address
from urllib import error, parse, request

from app.core.config import settings


LOGGER = logging.getLogger(__name__)


class AppointMeWebhookService:
    SAFE_NON_PRODUCTION_HOSTS = {
        "localhost",
        "127.0.0.1",
        "host.docker.internal",
        "appoint-me",
        "appointme",
    }

    @classmethod
    def is_enabled(cls) -> bool:
        return bool(
            settings.appointme_webhook_enabled
            and settings.appointme_webhook_url
            and settings.appointme_integration_key
        )

    @classmethod
    def _is_safe_target(cls) -> bool:
        if not settings.appointme_webhook_url:
            return False

        environment = settings.environment.strip().lower()
        if environment in {"production", "prod"}:
            return True

        parsed = parse.urlparse(settings.appointme_webhook_url)
        hostname = (parsed.hostname or "").strip().lower()
        if hostname in cls.SAFE_NON_PRODUCTION_HOSTS or hostname.endswith(".local"):
            return True

        try:
            ip = ip_address(hostname)
        except ValueError:
            return False

        return ip.is_loopback or ip.is_private

    @classmethod
    def send_appointment_created(
        cls,
        *,
        appointment_id: int,
        appointment_public_id: str,
        patient_name: str,
        patient_phone: str,
        doctor_name: str,
        scheduled_start: str,
        reason: str | None,
        notify_patient: bool,
    ) -> None:
        if not cls.is_enabled():
            return

        if not cls._is_safe_target():
            LOGGER.warning("Skipping appoint-me webhook because target is not allowed for environment '%s'.", settings.environment)
            return

        payload = {
            "appointment_id": appointment_id,
            "appointment_public_id": appointment_public_id,
            "appointment_public_url": f"{settings.app_url.rstrip('/')}/c/{appointment_public_id}",
            "patient_name": patient_name,
            "patient_phone": patient_phone,
            "doctor_name": doctor_name,
            "scheduled_start": scheduled_start,
            "reason": reason,
            "notify_patient": notify_patient,
        }
        req = request.Request(
            f"{settings.appointme_webhook_url.rstrip('/')}/api/integrations/webhook/appointment-created",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-integration-key": settings.appointme_integration_key or "",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=settings.appointme_webhook_timeout_seconds):
                return
        except error.HTTPError as exc:
            LOGGER.warning("Appoint-me appointment-created webhook failed with HTTP %s.", exc.code)
        except Exception as exc:  # noqa: BLE001
            LOGGER.warning("Appoint-me appointment-created webhook failed: %s", exc)
