import json
from urllib import error, parse, request

from app.core.config import settings
from app.schemas.integration import (
    MessagingConversationMessageRead,
    MessagingConversationRead,
    MessagingConversationSendRequest,
    MessagingConversationSendResponse,
)
from app.services.errors import ValidationError


class AppointMeInboxService:
    def _base_url(self) -> str:
        base_url = (settings.appointme_webhook_url or "").strip().rstrip("/")
        if not base_url:
            raise ValidationError("La integración de WhatsApp no está configurada.")
        if not settings.appointme_integration_key:
            raise ValidationError("La integración de WhatsApp no tiene llave configurada.")
        return base_url

    def _request_json(self, path: str, *, method: str = "GET", payload: dict | None = None) -> dict | list:
        base_url = self._base_url()
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {
            "Accept": "application/json",
            "x-integration-key": settings.appointme_integration_key or "",
        }
        if payload is not None:
            headers["Content-Type"] = "application/json"
        req = request.Request(f"{base_url}{path}", data=body, headers=headers, method=method)

        try:
            with request.urlopen(req, timeout=settings.appointme_webhook_timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8") or "La integración de WhatsApp devolvió un error."
            raise ValidationError(detail) from exc
        except error.URLError as exc:
            raise ValidationError("No se pudo conectar con la integración de WhatsApp.") from exc

    def list_conversations(self, *, doctor_id: int) -> list[MessagingConversationRead]:
        query = parse.urlencode({"doctor_id": doctor_id})
        payload = self._request_json(f"/api/integrations/conversations?{query}")
        if not isinstance(payload, list):
            raise ValidationError("La integración devolvió una respuesta inválida para conversaciones.")
        return [MessagingConversationRead.model_validate(item) for item in payload]

    def list_messages(self, *, doctor_id: int, patient_phone: str, limit: int = 50) -> list[MessagingConversationMessageRead]:
        query = parse.urlencode({"doctor_id": doctor_id, "limit": limit})
        encoded_phone = parse.quote(patient_phone, safe="")
        payload = self._request_json(f"/api/integrations/conversations/{encoded_phone}/messages?{query}")
        if not isinstance(payload, list):
            raise ValidationError("La integración devolvió una respuesta inválida para mensajes.")
        return [MessagingConversationMessageRead.model_validate(item) for item in payload]

    def send_message(self, payload: MessagingConversationSendRequest) -> MessagingConversationSendResponse:
        result = self._request_json(
            "/api/integrations/messages/send",
            method="POST",
            payload=payload.model_dump(),
        )
        if not isinstance(result, dict):
            raise ValidationError("La integración devolvió una respuesta inválida al enviar el mensaje.")
        return MessagingConversationSendResponse.model_validate(result)
