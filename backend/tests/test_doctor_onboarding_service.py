import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from app.schemas.doctor_onboarding import DoctorOnboardingCompleteRequest
from app.services.doctor_onboarding import DOCTOR_ONBOARDING_ACTION, DoctorOnboardingService
from app.services.errors import ValidationError


class DummySession:
    def commit(self) -> None:
        return None

    def refresh(self, _instance) -> None:
        return None

    def flush(self) -> None:
        return None


class DoctorOnboardingServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = DoctorOnboardingService(DummySession())

    def test_read_invitation_rejects_missing_or_expired_token(self) -> None:
        self.service.token_repository = SimpleNamespace(
            list_active=lambda **kwargs: [] if kwargs["action_type"] == DOCTOR_ONBOARDING_ACTION else []
        )

        with self.assertRaises(ValidationError):
            self.service.read_invitation("expired-token")

    def test_complete_onboarding_activates_user_and_marks_token_used(self) -> None:
        user = SimpleNamespace(
            id=5,
            email="doctor@docontrol.local",
            first_name="Steve",
            last_name="Alay",
            gender=None,
            password_hash="old-hash",
            is_active=False,
        )
        doctor = SimpleNamespace(
            id=7,
            doctor_title=None,
            date_of_birth=None,
            license_number=None,
            specialty=None,
        )
        user.doctor_profile = doctor
        doctor.linked_user = user
        token = SimpleNamespace(
            user_id=5,
            token_hash="",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            used_at=None,
        )

        self.service._resolve_token = lambda raw_token: token  # type: ignore[method-assign]
        self.service.user_repository = SimpleNamespace(get=lambda user_id: user if user_id == 5 else None)
        self.service.doctor_repository = SimpleNamespace(replace_clinics=lambda doctor_obj, clinics: clinics)

        with patch("app.services.doctor_onboarding.create_audit_log"):
            result = self.service.complete_onboarding(
                DoctorOnboardingCompleteRequest(
                    token="valid-token",
                    password="NewPassword123!",
                    first_name="Esteban",
                    last_name="Alay",
                    gender="male",
                    doctor_title="Dr.",
                    specialty="General",
                    clinics=[],
                )
            )

        self.assertEqual(result.status, "completed")
        self.assertEqual(result.doctor_id, 7)
        self.assertTrue(user.is_active)
        self.assertEqual(user.first_name, "Esteban")
        self.assertEqual(user.gender, "male")
        self.assertNotEqual(user.password_hash, "old-hash")
        self.assertEqual(doctor.doctor_title, "Dr.")
        self.assertEqual(doctor.specialty, "General")
        self.assertIsNotNone(token.used_at)


if __name__ == "__main__":
    unittest.main()
