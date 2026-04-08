from types import SimpleNamespace
import unittest
from unittest.mock import patch

from app.models.all_models import *  # noqa: F401,F403
from app.schemas.communication_template import CommunicationTemplatePreviewRequest
from app.services.communication_template import CommunicationTemplateService
from app.services.errors import ValidationError


class CommunicationTemplateServiceTests(unittest.TestCase):
    def test_preview_rejects_patient_outside_scope(self) -> None:
        service = CommunicationTemplateService.__new__(CommunicationTemplateService)
        service.patient_repository = SimpleNamespace(get=lambda _patient_id: SimpleNamespace(id=7, owner_doctor_id=9))
        service.doctor_repository = SimpleNamespace(get=lambda _doctor_id: SimpleNamespace(id=_doctor_id))
        service.appointment_repository = SimpleNamespace(get=lambda _appointment_id: None)
        service.db = SimpleNamespace(get=lambda _model, _identifier: None)
        service._validate_template_body = lambda _body: None

        with patch("app.services.communication_template.scoped_doctor_ids_for_user", return_value={3}):
            with self.assertRaises(ValidationError) as exc:
                service.preview_template(
                    CommunicationTemplatePreviewRequest(body="Hola {patient_name}", patient_id=7),
                    current_user=SimpleNamespace(),
                )

        self.assertEqual(str(exc.exception), "You can only preview communication templates inside your own doctor scope.")

    def test_preview_rejects_patient_doctor_mismatch(self) -> None:
        service = CommunicationTemplateService.__new__(CommunicationTemplateService)
        service.patient_repository = SimpleNamespace(get=lambda _patient_id: SimpleNamespace(id=7, owner_doctor_id=9))
        service.doctor_repository = SimpleNamespace(get=lambda _doctor_id: SimpleNamespace(id=_doctor_id))
        service.appointment_repository = SimpleNamespace(get=lambda _appointment_id: None)
        service.db = SimpleNamespace(get=lambda _model, _identifier: None)
        service._validate_template_body = lambda _body: None

        with patch("app.services.communication_template.scoped_doctor_ids_for_user", return_value={9, 10}):
            with self.assertRaises(ValidationError) as exc:
                service.preview_template(
                    CommunicationTemplatePreviewRequest(body="Hola {patient_name}", patient_id=7, doctor_id=10),
                    current_user=SimpleNamespace(),
                )

        self.assertEqual(str(exc.exception), "Patient does not belong to the selected doctor.")

    def test_preview_rejects_appointment_patient_mismatch(self) -> None:
        service = CommunicationTemplateService.__new__(CommunicationTemplateService)
        service.patient_repository = SimpleNamespace(get=lambda _patient_id: SimpleNamespace(id=_patient_id, owner_doctor_id=3))
        service.doctor_repository = SimpleNamespace(get=lambda _doctor_id: SimpleNamespace(id=_doctor_id))
        service.appointment_repository = SimpleNamespace(get=lambda _appointment_id: SimpleNamespace(id=12, patient_id=7, doctor_id=3))
        service.db = SimpleNamespace(get=lambda _model, _identifier: None)
        service._validate_template_body = lambda _body: None

        with patch("app.services.communication_template.scoped_doctor_ids_for_user", return_value={3}):
            with self.assertRaises(ValidationError) as exc:
                service.preview_template(
                    CommunicationTemplatePreviewRequest(body="Hola {patient_name}", patient_id=8, appointment_id=12),
                    current_user=SimpleNamespace(),
                )

        self.assertEqual(str(exc.exception), "Appointment does not belong to the selected patient.")


if __name__ == "__main__":
    unittest.main()
