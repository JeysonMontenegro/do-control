from datetime import datetime, timezone
from types import SimpleNamespace
import unittest

from app.models.all_models import *  # noqa: F401,F403
from app.models.communication_dispatch import CommunicationDispatch
from app.models.communication_template import CommunicationTemplate
from app.schemas.communication_dispatch import CommunicationDispatchCreate
from app.services.errors import NotFoundError, ValidationError
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

    def test_resolve_owner_doctor_falls_back_to_patient_owner(self) -> None:
        service = CommunicationDispatchService.__new__(CommunicationDispatchService)
        service.appointment_repository = SimpleNamespace(get=lambda _appointment_id: None)
        service.reminder_rule_repository = SimpleNamespace(get=lambda _rule_id: None)
        service.patient_repository = SimpleNamespace(get=lambda _patient_id: SimpleNamespace(owner_doctor_id=9))
        service.doctor_repository = SimpleNamespace(get=lambda _doctor_id: None)
        service.template_repository = SimpleNamespace(get=lambda _template_id: None)
        service.db = SimpleNamespace(get=lambda _model, _identifier: None)

        owner_doctor_id = service._resolve_owner_doctor_id(
            CommunicationDispatchCreate(
                patient_id=4,
                recipient_phone="50255550000",
            )
        )

        self.assertEqual(owner_doctor_id, 9)

    def test_resolve_owner_doctor_rejects_orphan_dispatch(self) -> None:
        service = CommunicationDispatchService.__new__(CommunicationDispatchService)
        service.appointment_repository = SimpleNamespace(get=lambda _appointment_id: None)
        service.reminder_rule_repository = SimpleNamespace(get=lambda _rule_id: None)
        service.patient_repository = SimpleNamespace(get=lambda _patient_id: SimpleNamespace(owner_doctor_id=None))
        service.doctor_repository = SimpleNamespace(get=lambda _doctor_id: None)
        service.template_repository = SimpleNamespace(get=lambda _template_id: None)
        service.db = SimpleNamespace(get=lambda _model, _identifier: None)

        with self.assertRaises(ValidationError) as exc:
            service._resolve_owner_doctor_id(
                CommunicationDispatchCreate(
                    patient_id=4,
                    recipient_phone="50255550000",
                )
            )

        self.assertEqual(str(exc.exception), "Communication dispatch must be linked to an owning doctor.")

    def test_list_dispatches_passes_owner_scope_to_repository(self) -> None:
        service = CommunicationDispatchService.__new__(CommunicationDispatchService)
        captured = {}
        service.repository = SimpleNamespace(
            list=lambda **kwargs: captured.setdefault("kwargs", kwargs) or []
        )
        service._serialize_dispatch = lambda dispatch: dispatch

        service.list_dispatches(
            patient_id=8,
            appointment_id=12,
            accessible_doctor_ids={3},
        )

        self.assertEqual(captured["kwargs"]["patient_id"], 8)
        self.assertEqual(captured["kwargs"]["appointment_id"], 12)
        self.assertEqual(captured["kwargs"]["owner_doctor_ids"], {3})

    def test_get_summary_passes_owner_scope_to_repository(self) -> None:
        service = CommunicationDispatchService.__new__(CommunicationDispatchService)
        captured = {}
        def summary(**kwargs):
            captured["kwargs"] = kwargs
            return {
                "total": 0,
                "pending": 0,
                "sent": 0,
                "delivered": 0,
                "failed": 0,
                "due_now": 0,
            }
        service.repository = SimpleNamespace(summary=summary)

        service.get_summary(accessible_doctor_ids={5})

        self.assertEqual(captured["kwargs"]["owner_doctor_ids"], {5})

    def test_list_attempts_rejects_dispatch_outside_owner_scope(self) -> None:
        service = CommunicationDispatchService.__new__(CommunicationDispatchService)
        service.repository = SimpleNamespace(get=lambda _dispatch_id: SimpleNamespace(owner_doctor_id=8))
        service.attempt_repository = SimpleNamespace(list_for_dispatch=lambda _dispatch_id, limit=50: [])

        with self.assertRaises(NotFoundError) as exc:
            service.list_attempts(12, accessible_doctor_ids={5})

        self.assertEqual(str(exc.exception), "Communication dispatch not found.")


if __name__ == "__main__":
    unittest.main()
