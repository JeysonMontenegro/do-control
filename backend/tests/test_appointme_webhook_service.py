import unittest
from unittest.mock import patch

from app.core.config import settings
from app.services.appointme_webhook import AppointMeWebhookService


class AppointMeWebhookServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_environment = settings.environment
        self.original_app_url = settings.app_url
        self.original_webhook_url = settings.appointme_webhook_url
        self.original_webhook_key = settings.appointme_integration_key
        self.original_webhook_enabled = settings.appointme_webhook_enabled
        self.original_timeout = settings.appointme_webhook_timeout_seconds

    def tearDown(self) -> None:
        settings.environment = self.original_environment
        settings.app_url = self.original_app_url
        settings.appointme_webhook_url = self.original_webhook_url
        settings.appointme_integration_key = self.original_webhook_key
        settings.appointme_webhook_enabled = self.original_webhook_enabled
        settings.appointme_webhook_timeout_seconds = self.original_timeout

    def test_skips_external_target_in_development(self) -> None:
        settings.environment = "development"
        settings.appointme_webhook_enabled = True
        settings.appointme_integration_key = "dev-key"
        settings.appointme_webhook_url = "https://appointme.prod.example"

        with patch("app.services.appointme_webhook.request.urlopen") as mocked_urlopen:
            AppointMeWebhookService.send_appointment_created(
                appointment_id=1,
                appointment_public_id="public-1",
                patient_name="Paciente Demo",
                patient_phone="50255550000",
                doctor_name="Doctor Demo",
                scheduled_start="2026-03-25T14:00:00",
                reason="Control",
                notify_patient=True,
            )

        mocked_urlopen.assert_not_called()

    def test_posts_webhook_to_local_target(self) -> None:
        settings.environment = "development"
        settings.app_url = "http://localhost:13000"
        settings.appointme_webhook_enabled = True
        settings.appointme_integration_key = "dev-key"
        settings.appointme_webhook_url = "http://localhost:8010"
        settings.appointme_webhook_timeout_seconds = 3

        with patch("app.services.appointme_webhook.request.urlopen") as mocked_urlopen:
            AppointMeWebhookService.send_appointment_created(
                appointment_id=7,
                appointment_public_id="public-7",
                patient_name="Paciente Demo",
                patient_phone="50255550000",
                doctor_name="Doctor Demo",
                scheduled_start="2026-03-25T14:00:00",
                reason="Control",
                notify_patient=False,
            )

        mocked_urlopen.assert_called_once()
        request_obj = mocked_urlopen.call_args.args[0]
        self.assertEqual(request_obj.full_url, "http://localhost:8010/api/integrations/webhook/appointment-created")
        self.assertEqual(request_obj.headers["X-integration-key"], "dev-key")
        self.assertIn(b'"appointment_public_id": "public-7"', request_obj.data)
        self.assertIn(b'"appointment_public_url": "http://localhost:13000/c/public-7"', request_obj.data)
        self.assertIn(b'"notify_patient": false', request_obj.data)


if __name__ == "__main__":
    unittest.main()
