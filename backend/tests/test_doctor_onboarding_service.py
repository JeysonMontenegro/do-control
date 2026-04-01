import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from app.schemas.doctor_onboarding import DoctorOnboardingAdminCompleteRequest, DoctorOnboardingCompleteRequest
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

    def test_upload_profile_photo_updates_user_storage_key(self) -> None:
        user = SimpleNamespace(
            id=5,
            email="doctor@docontrol.local",
            first_name="Steve",
            last_name="Alay",
            primary_phone_number="50250001111",
            profile_photo_storage_key=None,
        )
        doctor = SimpleNamespace(id=7, linked_user=user)
        user.doctor_profile = doctor
        token = SimpleNamespace(
            user_id=5,
            token_hash="",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            used_at=None,
        )

        self.service._resolve_token = lambda raw_token: token  # type: ignore[method-assign]
        self.service.user_repository = SimpleNamespace(get=lambda user_id: user if user_id == 5 else None)
        uploaded = {}
        self.service.storage = SimpleNamespace(
            ensure_bucket=lambda: uploaded.setdefault("bucket", True),
            upload_bytes=lambda **kwargs: uploaded.setdefault("upload", kwargs),
            generate_presigned_download_url=lambda **kwargs: "https://example.com/photo.png",
        )

        result = self.service.upload_profile_photo(
            raw_token="valid-token",
            file_name="photo.png",
            content_type="image/png",
            content=b"png-bytes",
        )

        self.assertIsNotNone(user.profile_photo_storage_key)
        self.assertTrue(user.profile_photo_storage_key.endswith(".png"))
        self.assertEqual(result.profile_photo_url, "https://example.com/photo.png")
        self.assertIn("upload", uploaded)

    @patch("app.services.doctor_onboarding.create_audit_log")
    def test_revoke_invitation_marks_active_token_as_revoked(self, _audit_log) -> None:
        token = SimpleNamespace(
            user_id=5,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            used_at=None,
            revoked_at=None,
        )
        user = SimpleNamespace(
            id=5,
            email="doctor@docontrol.local",
            first_name="Steve",
            last_name="Alay",
            primary_phone_number="50250001111",
            profile_photo_storage_key=None,
            is_active=False,
        )
        doctor = SimpleNamespace(
            id=7,
            linked_user=user,
            doctor_title=None,
            specialty=None,
            license_number=None,
            date_of_birth=None,
            clinics=[],
            phone_numbers=[],
        )
        user.doctor_profile = doctor
        self.service.doctor_repository = SimpleNamespace(get=lambda doctor_id: doctor if doctor_id == 7 else None)
        self.service.token_repository = SimpleNamespace(list_for_user=lambda user_id, action_type: [token])
        self.service.storage = SimpleNamespace(generate_presigned_download_url=lambda **kwargs: None)

        result = self.service.revoke_invitation(7)

        self.assertEqual(result.token_status, "revoked")
        self.assertIsNotNone(token.revoked_at)

    @patch("app.services.doctor_onboarding.sync_doctor_primary_phone")
    @patch("app.services.doctor_onboarding.create_audit_log")
    def test_admin_complete_onboarding_activates_user_and_marks_token_used(self, _audit_log, _sync_phone) -> None:
        token = SimpleNamespace(
            user_id=5,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            used_at=None,
            revoked_at=None,
        )
        user = SimpleNamespace(
            id=5,
            email="doctor@docontrol.local",
            first_name="Steve",
            last_name="Alay",
            primary_phone_number="50250001111",
            profile_photo_storage_key=None,
            password_hash="old-hash",
            is_active=False,
            gender=None,
        )
        doctor = SimpleNamespace(
            id=7,
            linked_user=user,
            doctor_title=None,
            specialty=None,
            license_number=None,
            date_of_birth=None,
            clinics=[],
            phone_numbers=[],
        )
        user.doctor_profile = doctor
        self.service.doctor_repository = SimpleNamespace(
            get=lambda doctor_id: doctor if doctor_id == 7 else None,
            replace_clinics=lambda doctor_obj, clinics: clinics,
            add_phone_number=lambda phone: phone,
        )
        self.service.token_repository = SimpleNamespace(list_for_user=lambda user_id, action_type: [token])
        synced = {}
        self.service.user_repository = SimpleNamespace(
            sync_primary_phone_number=lambda *args, **kwargs: synced.setdefault("phone", (args, kwargs))
        )
        self.service.storage = SimpleNamespace(generate_presigned_download_url=lambda **kwargs: None)

        result = self.service.admin_complete_onboarding(
            7,
            DoctorOnboardingAdminCompleteRequest(
                first_name="Esteban",
                last_name="Alay",
                gender="male",
                doctor_title="Dr.",
                specialty="General",
                phone_number="50250001111",
                user_password="TempPass123!",
                activate_user=True,
                clinics=[],
            ),
        )

        self.assertEqual(result.onboarding_status, "completed")
        self.assertTrue(user.is_active)
        self.assertEqual(user.first_name, "Esteban")
        self.assertEqual(doctor.specialty, "General")
        self.assertIsNotNone(token.used_at)

    def test_list_admin_onboardings_includes_step_summary(self) -> None:
        token = SimpleNamespace(
            user_id=5,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            used_at=None,
            revoked_at=None,
        )
        user = SimpleNamespace(
            id=5,
            email="doctor@docontrol.local",
            first_name="Steve",
            last_name="Alay",
            primary_phone_number="50250001111",
            profile_photo_storage_key="users/5/profile/photo.png",
            is_active=False,
        )
        doctor = SimpleNamespace(
            id=7,
            linked_user=user,
            doctor_title="Dr.",
            specialty="General",
            license_number=None,
            date_of_birth=None,
            clinics=[],
            phone_numbers=[],
        )
        user.doctor_profile = doctor
        self.service.doctor_repository = SimpleNamespace(list=lambda: [doctor])
        self.service.token_repository = SimpleNamespace(list_for_user=lambda user_id, action_type: [token])
        self.service.storage = SimpleNamespace(generate_presigned_download_url=lambda **kwargs: "https://example.com/photo.png")

        results = self.service.list_admin_onboardings()

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].token_status, "active")
        self.assertEqual(results[0].steps[0].key, "invitation")
        self.assertEqual(results[0].steps[1].status, "completed")


if __name__ == "__main__":
    unittest.main()
