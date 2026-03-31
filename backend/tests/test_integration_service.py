import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from app.services.integration import IntegrationService
from app.schemas.integration import PatientMatchRequest
from app.services.errors import NotFoundError


class DummySession:
    def commit(self) -> None:
        return None


class IntegrationServiceMatchPatientTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())

    @patch("app.services.integration.create_audit_log")
    def test_returns_matched_for_single_high_confidence_name(
        self,
        _audit_log,
    ) -> None:
        self.service.patient_service = SimpleNamespace(
            list_patients=lambda query: [
                SimpleNamespace(
                    id=3,
                    first_name="Ana",
                    last_name="Lopez",
                    medical_record_number="EXP-000003",
                    primary_phone="55530000",
                ),
                SimpleNamespace(
                    id=5,
                    first_name="Pedro",
                    last_name="Ruiz",
                    medical_record_number="EXP-000005",
                    primary_phone="5599887766",
                ),
            ]
        )

        result = self.service.match_patient(PatientMatchRequest(patient_name="Pedro Ruiz", phone_number=""))

        self.assertEqual(result.status, "matched")
        self.assertEqual(len(result.candidate_matches), 1)
        self.assertEqual(result.candidate_matches[0].patient_id, 5)
        self.assertEqual(result.candidate_matches[0].confidence, "high")

    @patch("app.services.integration.create_audit_log")
    def test_returns_candidate_matches_for_partial_name_matches(
        self,
        _audit_log,
    ) -> None:
        self.service.patient_service = SimpleNamespace(
            list_patients=lambda query: [
                SimpleNamespace(
                    id=3,
                    first_name="Ana Maria",
                    last_name="Lopez Hernandez",
                    medical_record_number="EXP-000003",
                    primary_phone="55530000",
                ),
                SimpleNamespace(
                    id=4,
                    first_name="Maria",
                    last_name="Lopez",
                    medical_record_number="EXP-000004",
                    primary_phone="55540000",
                ),
            ]
        )

        result = self.service.match_patient(PatientMatchRequest(patient_name="María", phone_number=""))

        self.assertEqual(result.status, "candidate_matches")
        self.assertEqual([candidate.patient_id for candidate in result.candidate_matches], [3, 4])
        self.assertTrue(all(candidate.confidence == "medium" for candidate in result.candidate_matches))

    @patch("app.services.integration.create_audit_log")
    def test_returns_no_match_when_name_is_not_relevant(
        self,
        _audit_log,
    ) -> None:
        self.service.patient_service = SimpleNamespace(
            list_patients=lambda query: [
                SimpleNamespace(
                    id=1,
                    first_name="Ana",
                    last_name="Lopez",
                    medical_record_number="EXP-000001",
                    primary_phone="55510000",
                ),
                SimpleNamespace(
                    id=2,
                    first_name="Maria",
                    last_name="Perez",
                    medical_record_number="EXP-000002",
                    primary_phone="55520000",
                ),
            ]
        )

        result = self.service.match_patient(PatientMatchRequest(patient_name="Pedro Ruiz", phone_number=""))

        self.assertEqual(result.status, "no_match")
        self.assertEqual(result.candidate_matches, [])


class IntegrationServiceVerifyUserByPhoneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())

    def test_includes_doctor_profile_for_doctor_users(self) -> None:
        self.service.user_repository = SimpleNamespace(
            get_by_phone_number=lambda _phone: SimpleNamespace(
                id=5,
                first_name="Steve",
                last_name="Alay",
                phone_number="+502 3992-5713",
                is_active=True,
                roles=[SimpleNamespace(role=SimpleNamespace(name="doctor"))],
                doctor_profile=SimpleNamespace(
                    id=3,
                    first_name="Steve",
                    last_name="Alay",
                    specialty=None,
                    license_number=None,
                    gender="M",
                    phone_numbers=[
                        SimpleNamespace(phone_number="+502 3992-5713", is_primary=True, is_active=True),
                    ],
                ),
            )
        )

        result = self.service.verify_user_by_phone("50239925713")

        self.assertTrue(result.is_valid)
        self.assertEqual(result.role, "doctor")
        self.assertEqual(result.user_id, 5)
        self.assertEqual(result.phone_number, "50239925713")
        self.assertIsNotNone(result.doctor_profile)
        assert result.doctor_profile is not None
        self.assertEqual(result.doctor_profile.doctor_id, 3)
        self.assertEqual(result.doctor_profile.full_name, "Steve Alay")
        self.assertEqual(result.doctor_profile.gender, "M")
        self.assertEqual(result.doctor_profile.primary_phone, "50239925713")

    def test_omits_doctor_profile_for_non_doctor_users(self) -> None:
        self.service.user_repository = SimpleNamespace(
            get_by_phone_number=lambda _phone: SimpleNamespace(
                id=1,
                first_name="Jeyson",
                last_name="Montenegro",
                phone_number="50258420737",
                is_active=True,
                roles=[SimpleNamespace(role=SimpleNamespace(name="admin"))],
                doctor_profile=None,
            )
        )

        result = self.service.verify_user_by_phone("50258420737")

        self.assertTrue(result.is_valid)
        self.assertEqual(result.role, "admin")
        self.assertIsNone(result.doctor_profile)

    def test_returns_invalid_for_missing_user(self) -> None:
        self.service.user_repository = SimpleNamespace(get_by_phone_number=lambda _phone: None)

        result = self.service.verify_user_by_phone("55550007")

        self.assertFalse(result.is_valid)
        self.assertEqual(result.phone_number, "55550007")
        self.assertEqual(result.permissions, [])


class IntegrationServicePendingAppointmentsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())

    def test_returns_pending_appointments_list_with_doctor_and_clinic_details(self) -> None:
        first_appointment = SimpleNamespace(
            id=11,
            public_id="pub-11",
            doctor_id=3,
            patient_id=9,
            scheduled_start="2026-04-01T15:00:00Z",
            scheduled_end="2026-04-01T15:30:00Z",
            status="scheduled",
            confirmation_status="pending",
            doctor=SimpleNamespace(
                first_name="Steve",
                last_name="Alay",
                specialty="Medicina general",
                clinics=[
                    SimpleNamespace(
                        clinic_name="Clínica Norte",
                        address="Zona 15, Ciudad de Guatemala",
                        is_primary=True,
                    )
                ],
            ),
        )
        second_appointment = SimpleNamespace(
            id=12,
            public_id="pub-12",
            doctor_id=3,
            patient_id=9,
            scheduled_start="2026-04-02T16:00:00Z",
            scheduled_end="2026-04-02T16:45:00Z",
            status="scheduled",
            confirmation_status="confirmed",
            doctor=SimpleNamespace(
                first_name="Steve",
                last_name="Alay",
                specialty="Medicina general",
                clinics=[
                    SimpleNamespace(
                        clinic_name="Clínica Norte",
                        address="Zona 15, Ciudad de Guatemala",
                        is_primary=True,
                    )
                ],
            ),
        )
        self.service.appointment_service = SimpleNamespace(
            get_pending_for_patient=lambda _patient_id: [first_appointment, second_appointment]
        )

        result = self.service.get_pending_appointment(9)

        self.assertEqual(len(result.appointments), 2)
        self.assertEqual(result.appointments[0].appointment_id, 11)
        self.assertEqual(result.appointments[0].doctor_name, "Steve Alay")
        self.assertEqual(result.appointments[0].doctor_specialty, "Medicina general")
        self.assertEqual(result.appointments[0].clinic_name, "Clínica Norte")
        self.assertEqual(result.appointments[0].clinic_address, "Zona 15, Ciudad de Guatemala")
        self.assertEqual(result.appointments[0].confirmation_status, "pending")
        self.assertEqual(result.appointments[1].scheduled_end, datetime(2026, 4, 2, 16, 45, tzinfo=timezone.utc))

    def test_returns_empty_list_when_patient_has_no_pending_appointments(self) -> None:
        self.service.appointment_service = SimpleNamespace(get_pending_for_patient=lambda _patient_id: [])

        result = self.service.get_pending_appointment(9)

        self.assertEqual(result.appointments, [])

    def test_raises_when_patient_does_not_exist(self) -> None:
        self.service.appointment_service = SimpleNamespace(
            get_pending_for_patient=lambda _patient_id: (_ for _ in ()).throw(NotFoundError("Patient not found."))
        )

        with self.assertRaises(NotFoundError):
            self.service.get_pending_appointment(999)


if __name__ == "__main__":
    unittest.main()
