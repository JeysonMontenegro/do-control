import json
import unittest
from unittest.mock import patch

from app.schemas.integration import MessagingConversationSendRequest
from app.services.appointme_inbox import AppointMeInboxService


class _FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def read(self):
        return json.dumps(self.payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class AppointMeInboxServiceTests(unittest.TestCase):
    @patch("app.services.appointme_inbox.settings.appointme_integration_key", "appoint-me-dev-key")
    @patch("app.services.appointme_inbox.settings.appointme_webhook_url", "http://host.docker.internal:8010")
    @patch("app.services.appointme_inbox.request.urlopen")
    def test_list_conversations_uses_expected_contract(self, urlopen_mock) -> None:
        urlopen_mock.return_value = _FakeResponse(
            [
                {
                    "patient_phone": "50258420737",
                    "patient_name": "Juan Perez",
                    "last_message": "Sí, confirmo",
                    "last_direction": "inbound",
                    "last_at": "2026-03-30T16:30:00Z",
                    "unread_count": 2,
                    "window_open": True,
                }
            ]
        )

        response = AppointMeInboxService().list_conversations(doctor_id=7)

        self.assertEqual(len(response), 1)
        self.assertEqual(response[0].patient_phone, "50258420737")
        request_obj = urlopen_mock.call_args.args[0]
        self.assertEqual(request_obj.full_url, "http://host.docker.internal:8010/api/integrations/conversations?doctor_id=7")
        self.assertEqual(request_obj.headers["X-integration-key"], "appoint-me-dev-key")

    @patch("app.services.appointme_inbox.settings.appointme_integration_key", "appoint-me-dev-key")
    @patch("app.services.appointme_inbox.settings.appointme_webhook_url", "http://host.docker.internal:8010")
    @patch("app.services.appointme_inbox.request.urlopen")
    def test_send_message_posts_json_payload(self, urlopen_mock) -> None:
        urlopen_mock.return_value = _FakeResponse(
            {
                "status": "sent",
                "window_open": True,
                "message_id": "abc123",
            }
        )

        response = AppointMeInboxService().send_message(
            payload=MessagingConversationSendRequest(
                doctor_id=7,
                patient_phone="50258420737",
                text="Buenos días",
            )
        )

        self.assertEqual(response.status, "sent")
        request_obj = urlopen_mock.call_args.args[0]
        self.assertEqual(request_obj.full_url, "http://host.docker.internal:8010/api/integrations/messages/send")
        self.assertEqual(request_obj.method, "POST")
        self.assertEqual(
            json.loads(request_obj.data.decode("utf-8")),
            {
                "doctor_id": 7,
                "patient_phone": "50258420737",
                "text": "Buenos días",
            },
        )


if __name__ == "__main__":
    unittest.main()
