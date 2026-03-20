import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.services.integration import IntegrationService
from app.schemas.integration import PatientMatchRequest


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
                phone_number="50239925713",
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
                        SimpleNamespace(phone_number="50239925713", is_primary=True, is_active=True),
                    ],
                ),
            )
        )

        result = self.service.verify_user_by_phone("50239925713")

        self.assertTrue(result.is_valid)
        self.assertEqual(result.role, "doctor")
        self.assertEqual(result.user_id, 5)
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


if __name__ == "__main__":
    unittest.main()
