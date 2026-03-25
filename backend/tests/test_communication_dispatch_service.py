from datetime import datetime, timezone
from types import SimpleNamespace
import unittest

from app.models.communication_dispatch import CommunicationDispatch
from app.models.communication_template import CommunicationTemplate
from app.services.communication_dispatch import CommunicationDispatchService


class CommunicationDispatchServiceRenderTests(unittest.TestCase):
    def test_render_template_message_uses_guatemala_local_time_for_appointment(self) -> None:
        service = CommunicationDispatchService.__new__(CommunicationDispatchService)
        service.patient_repository = SimpleNamespace(
            get=lambda _patient_id: SimpleNamespace(first_name="Steve", last_name="Alay")
        )
        service.doctor_repository = SimpleNamespace(
            get=lambda _doctor_id: SimpleNamespace(first_name="Steve", last_name="Alay")
        )
        service.appointment_repository = SimpleNamespace(
            get=lambda _appointment_id: SimpleNamespace(
                scheduled_start=datetime(2026, 4, 3, 15, 17, tzinfo=timezone.utc)
            )
        )
        service._exam_name = lambda _exam_order_id: ""
        service._expected_date_text = lambda _exam_order_id: ""

        template = CommunicationTemplate(
            channel="whatsapp",
            template_key="appointment_confirmation_doctor",
            title="Reminder",
            body="Tu cita es el {appointment_date} a las {appointment_time} con {doctor_name}.",
            is_active=True,
        )
        dispatch = CommunicationDispatch(
            patient_id=1,
            doctor_id=1,
            owner_doctor_id=1,
            appointment_id=1,
            channel="whatsapp",
            recipient_phone="50255550000",
            status="pending",
            retry_count=0,
        )

        rendered = service.render_template_message(template, dispatch)

        self.assertIn("2026-04-03", rendered)
        self.assertIn("09:17", rendered)
        self.assertNotIn("15:17", rendered)


if __name__ == "__main__":
    unittest.main()
