import unittest
from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.patient import PatientService


class DummySession:
    pass


class PatientServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = PatientService(DummySession())

    @staticmethod
    def _patient_stub(patient_id: int) -> SimpleNamespace:
        now = datetime(2026, 4, 3, 16, 0, tzinfo=timezone.utc)
        return SimpleNamespace(
            id=patient_id,
            display_name=None,
            first_name="Paciente",
            middle_name=None,
            last_name="Prueba",
            second_last_name=None,
            married_name=None,
            sex=None,
            date_of_birth=None,
            national_id=None,
            tax_id=None,
            primary_phone="5550000000",
            secondary_phone=None,
            email=None,
            address=None,
            emergency_contact_name=None,
            emergency_contact_phone=None,
            allergies=None,
            chronic_conditions=None,
            blood_type=None,
            notes=None,
            is_active=True,
            created_at=now,
            updated_at=now,
            phone_numbers=[],
            assigned_doctors=[],
        )

    def test_get_patient_summary_filters_related_records_by_selected_doctor(self) -> None:
        patient = self._patient_stub(17)
        captured: dict[str, object] = {}

        def list_appointments(patient_id: int, *, doctor_ids=None):
            captured["appointments"] = {"patient_id": patient_id, "doctor_ids": doctor_ids}
            return []

        def list_encounters(patient_id: int, *, doctor_ids=None):
            captured["encounters"] = {"patient_id": patient_id, "doctor_ids": doctor_ids}
            return []

        def list_attachments(patient_id: int, *, doctor_ids=None):
            captured["attachments"] = {"patient_id": patient_id, "doctor_ids": doctor_ids}
            return []

        self.service.get_patient = lambda patient_id, **_kwargs: patient  # type: ignore[method-assign]
        self.service.repository = SimpleNamespace(
            list_appointments=list_appointments,
            list_encounters=list_encounters,
            list_attachments=list_attachments,
        )

        summary = self.service.get_patient_summary(
            17,
            accessible_doctor_ids={3, 8},
            doctor_id=8,
        )

        self.assertEqual(summary.patient.id, patient.id)
        self.assertEqual(captured["appointments"], {"patient_id": 17, "doctor_ids": {8}})
        self.assertEqual(captured["encounters"], {"patient_id": 17, "doctor_ids": {8}})
        self.assertEqual(captured["attachments"], {"patient_id": 17, "doctor_ids": {8}})

    def test_get_patient_summary_keeps_admin_view_unfiltered(self) -> None:
        patient = self._patient_stub(19)
        captured: dict[str, object] = {}

        def list_appointments(patient_id: int, *, doctor_ids=None):
            captured["appointments"] = {"patient_id": patient_id, "doctor_ids": doctor_ids}
            return []

        def list_encounters(patient_id: int, *, doctor_ids=None):
            captured["encounters"] = {"patient_id": patient_id, "doctor_ids": doctor_ids}
            return []

        def list_attachments(patient_id: int, *, doctor_ids=None):
            captured["attachments"] = {"patient_id": patient_id, "doctor_ids": doctor_ids}
            return []

        self.service.get_patient = lambda patient_id, **_kwargs: patient  # type: ignore[method-assign]
        self.service.repository = SimpleNamespace(
            list_appointments=list_appointments,
            list_encounters=list_encounters,
            list_attachments=list_attachments,
        )

        summary = self.service.get_patient_summary(19, accessible_doctor_ids=None, doctor_id=None)

        self.assertEqual(summary.patient.id, patient.id)
        self.assertEqual(captured["appointments"], {"patient_id": 19, "doctor_ids": None})
        self.assertEqual(captured["encounters"], {"patient_id": 19, "doctor_ids": None})
        self.assertEqual(captured["attachments"], {"patient_id": 19, "doctor_ids": None})
