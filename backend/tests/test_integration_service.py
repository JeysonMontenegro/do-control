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


if __name__ == "__main__":
    unittest.main()
