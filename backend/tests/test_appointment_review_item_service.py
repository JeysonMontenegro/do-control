from datetime import datetime, timezone
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from app.models.all_models import *  # noqa: F401,F403
from app.schemas.appointment_review_item import AppointmentReviewItemResolveRequest
from app.services.appointment_review_item import AppointmentReviewItemService
from app.services.errors import NotFoundError, ValidationError


def make_review_item(*, doctor_id: int | None = 3):
    return SimpleNamespace(
        id=9,
        doctor_id=doctor_id,
        patient_name="Paciente Demo",
        phone_number="50255550000",
        doctor_name="Doctor Demo",
        doctor_phone_number="50255559999",
        scheduled_start=datetime(2026, 4, 7, 15, 0, tzinfo=timezone.utc),
        scheduled_end=datetime(2026, 4, 7, 15, 30, tzinfo=timezone.utc),
        appointment_type="follow_up",
        reason="Revision",
        source="appoint-me",
        review_status="pending_review",
        review_reason="doctor_resolution",
        review_message="Pendiente",
        existing_appointment_id=None,
    )


class AppointmentReviewItemServiceTests(unittest.TestCase):
    def test_resolve_link_existing_rejects_appointment_outside_scope(self) -> None:
        item = make_review_item(doctor_id=3)
        service = AppointmentReviewItemService.__new__(AppointmentReviewItemService)
        service.repository = SimpleNamespace(get=lambda _item_id: item)
        service.appointment_service = SimpleNamespace(
            repository=SimpleNamespace(get=lambda _appointment_id: SimpleNamespace(id=11, doctor_id=8))
        )
        service.db = SimpleNamespace(commit=lambda: None, refresh=lambda _item: None)

        with patch("app.services.appointment_review_item.scoped_doctor_ids_for_user", return_value={3}):
            with self.assertRaises(NotFoundError) as exc:
                service.resolve_item(
                    9,
                    AppointmentReviewItemResolveRequest(action="link_existing", appointment_id=11),
                    current_user=SimpleNamespace(),
                )

        self.assertEqual(str(exc.exception), "Doctor not found.")

    def test_resolve_link_existing_rejects_mismatched_item_doctor(self) -> None:
        item = make_review_item(doctor_id=3)
        service = AppointmentReviewItemService.__new__(AppointmentReviewItemService)
        service.repository = SimpleNamespace(get=lambda _item_id: item)
        service.appointment_service = SimpleNamespace(
            repository=SimpleNamespace(get=lambda _appointment_id: SimpleNamespace(id=11, doctor_id=4))
        )
        service.db = SimpleNamespace(commit=lambda: None, refresh=lambda _item: None)

        with patch("app.services.appointment_review_item.scoped_doctor_ids_for_user", return_value={3, 4}):
            with self.assertRaises(ValidationError) as exc:
                service.resolve_item(
                    9,
                    AppointmentReviewItemResolveRequest(action="link_existing", appointment_id=11),
                    current_user=SimpleNamespace(),
                )

        self.assertEqual(str(exc.exception), "Appointment doctor does not match the review item doctor.")

    def test_resolve_create_appointment_rejects_doctor_outside_scope(self) -> None:
        item = make_review_item(doctor_id=3)
        service = AppointmentReviewItemService.__new__(AppointmentReviewItemService)
        service.repository = SimpleNamespace(get=lambda _item_id: item)
        service.appointment_service = SimpleNamespace(create_appointment=lambda *_args, **_kwargs: None)
        service.db = SimpleNamespace(commit=lambda: None, refresh=lambda _item: None)

        with patch("app.services.appointment_review_item.scoped_doctor_ids_for_user", return_value={3}):
            with self.assertRaises(NotFoundError) as exc:
                service.resolve_item(
                    9,
                    AppointmentReviewItemResolveRequest(action="create_appointment", patient_id=21, doctor_id=8),
                    current_user=SimpleNamespace(),
                )

        self.assertEqual(str(exc.exception), "Doctor not found.")

    def test_resolve_create_appointment_rejects_mismatched_item_doctor(self) -> None:
        item = make_review_item(doctor_id=3)
        service = AppointmentReviewItemService.__new__(AppointmentReviewItemService)
        service.repository = SimpleNamespace(get=lambda _item_id: item)
        service.appointment_service = SimpleNamespace(create_appointment=lambda *_args, **_kwargs: None)
        service.db = SimpleNamespace(commit=lambda: None, refresh=lambda _item: None)

        with patch("app.services.appointment_review_item.scoped_doctor_ids_for_user", return_value={3, 4}):
            with self.assertRaises(ValidationError) as exc:
                service.resolve_item(
                    9,
                    AppointmentReviewItemResolveRequest(action="create_appointment", patient_id=21, doctor_id=4),
                    current_user=SimpleNamespace(),
                )

        self.assertEqual(str(exc.exception), "doctor_id does not match the review item doctor.")


if __name__ == "__main__":
    unittest.main()
