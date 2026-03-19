import json
import time
import unittest
from urllib import error, request

from app.db.session import SessionLocal
from app.models.all_models import *  # noqa: F401,F403
from app.repositories.user import UserRepository
from app.services.security import create_access_token


BASE_URL = "http://127.0.0.1:8000/api"
INTEGRATION_KEY = "appoint-me-dev-key"


def request_json(
    path: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
    token: str | None = None,
    integration_key: str | None = None,
) -> tuple[int, dict | list]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if integration_key:
        headers["x-integration-key"] = integration_key
    req = request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


def login(email: str, password: str) -> str:
    del password
    db = SessionLocal()
    try:
        user = UserRepository(db).get_by_email(email)
        if user is None:
            raise AssertionError(f"Login failed for {email}: user not found")
        roles = [user_role.role.name for user_role in user.roles]
        return create_access_token(subject=user.email, user_id=user.id, roles=roles)
    finally:
        db.close()


class AppointmentReviewItemHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_manual_review_item_is_created_for_unresolved_doctor(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        proposal_status, proposal_body = request_json(
            "/integrations/appointments/proposed",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "patient_name": f"PacienteRevision {unique_suffix}",
                "phone_number": f"558{unique_suffix[:7]}",
                "doctor_phone_number": f"999{unique_suffix[:7]}",
                "doctor_name": "Doctor Inexistente",
                "scheduled_start": "2026-03-21T15:00:00Z",
                "scheduled_end": "2026-03-21T15:30:00Z",
                "appointment_type": "follow_up",
                "reason": "WhatsApp unresolved doctor flow",
                "source": "appoint-me",
                "create_patient_if_missing": False,
            },
        )
        self.assertEqual(proposal_status, 200)
        self.assertIsInstance(proposal_body, dict)
        self.assertEqual(proposal_body["status"], "needs_manual_review")

        review_status, review_items = request_json(
            "/appointment-review-items?review_status=pending_review&limit=20",
            token=self.admin_token,
        )
        self.assertEqual(review_status, 200)
        self.assertIsInstance(review_items, list)
        matching_item = next(item for item in review_items if item["patient_name"] == f"PacienteRevision {unique_suffix}")
        self.assertEqual(matching_item["review_reason"], "doctor_resolution")
        self.assertEqual(matching_item["source"], "appoint-me")
        self.assertEqual(matching_item["review_status"], "pending_review")

    def test_review_item_can_be_resolved_by_creating_appointment(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        patient_name = f"PacienteResolucion {unique_suffix}"
        phone_number = f"557{unique_suffix[:7]}"
        doctor_email = f"resolve.doctor.{unique_suffix}@example.com"

        doctor_status, doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "DoctorResolucion",
                "last_name": unique_suffix,
                "gender": "male",
                "primary_phone": f"50259{unique_suffix[:6]}",
                "specialty": "Medicina general",
                "user_email": doctor_email,
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(doctor_status, 201, doctor_body)

        patient_status, patient_body = request_json(
            "/patients",
            method="POST",
            token=self.admin_token,
            payload={
                "medical_record_number": f"EXP-RV-{unique_suffix}",
                "first_name": "PacienteResolucion",
                "last_name": unique_suffix,
                "primary_phone": phone_number,
                "national_id": None,
                "tax_id": None,
                "email": None,
                "doctor_id": doctor_body["id"],
            },
        )
        self.assertEqual(patient_status, 201, patient_body)

        proposal_status, proposal_body = request_json(
            "/integrations/appointments/proposed",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "patient_name": patient_name,
                "phone_number": phone_number,
                "doctor_phone_number": f"999{unique_suffix[:7]}",
                "doctor_name": "Doctor Inexistente",
                "scheduled_start": "2026-03-22T15:00:00Z",
                "scheduled_end": "2026-03-22T15:30:00Z",
                "appointment_type": "follow_up",
                "reason": "Manual resolution flow",
                "source": "appoint-me",
                "create_patient_if_missing": False,
            },
        )
        self.assertEqual(proposal_status, 200)
        self.assertEqual(proposal_body["status"], "needs_manual_review")

        review_status, review_items = request_json(
            "/appointment-review-items?review_status=pending_review&limit=20",
            token=self.admin_token,
        )
        self.assertEqual(review_status, 200)
        matching_item = next(item for item in review_items if item["patient_name"] == patient_name)

        resolve_status, resolved_item = request_json(
            f"/appointment-review-items/{matching_item['id']}/resolve",
            method="POST",
            token=self.admin_token,
            payload={
                "action": "create_appointment",
                "patient_id": patient_body["id"],
                "doctor_id": doctor_body["id"],
                "changed_by": "admin-smoke",
            },
        )
        self.assertEqual(resolve_status, 200)
        self.assertEqual(resolved_item["review_status"], "resolved")
        self.assertIsNotNone(resolved_item["existing_appointment_id"])

    def test_doctor_only_sees_review_items_for_own_scope(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        doctor_email = f"scope.doctor.{unique_suffix}@example.com"
        doctor_password = "Doctor123!"
        doctor_phone = f"50258{unique_suffix[:6]}"

        create_status, doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Scope",
                "last_name": f"Doctor{unique_suffix}",
                "gender": "male",
                "primary_phone": doctor_phone,
                "specialty": "Medicina general",
                "user_email": doctor_email,
                "user_password": doctor_password,
            },
        )
        self.assertEqual(create_status, 201, doctor_body)
        created_doctor_id = doctor_body["id"]

        unrelated_status, unrelated_body = request_json(
            "/integrations/appointments/proposed",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "patient_name": f"PacienteAjeno {unique_suffix}",
                "phone_number": f"559{unique_suffix[:7]}",
                "doctor_phone_number": "999000111",
                "doctor_name": "Doctor Ajeno",
                "scheduled_start": "2026-03-24T15:00:00Z",
                "scheduled_end": "2026-03-24T15:30:00Z",
                "appointment_type": "follow_up",
                "reason": "Unresolved outside scope",
                "source": "appoint-me",
                "create_patient_if_missing": False,
            },
        )
        self.assertEqual(unrelated_status, 200)
        self.assertEqual(unrelated_body["status"], "needs_manual_review")

        patient_status, patient_body = request_json(
            "/patients",
            method="POST",
            token=self.admin_token,
            payload={
                "medical_record_number": f"EXP-SCOPE-{unique_suffix}",
                "first_name": "PacienteScope",
                "last_name": unique_suffix,
                "primary_phone": f"556{unique_suffix[:7]}",
                "doctor_id": created_doctor_id,
            },
        )
        self.assertEqual(patient_status, 201, patient_body)

        appointment_status, appointment_body = request_json(
            "/appointments",
            method="POST",
            token=self.admin_token,
            payload={
                "scheduled_start": "2026-03-25T15:00:00Z",
                "scheduled_end": "2026-03-25T15:30:00Z",
                "patient_id": patient_body["id"],
                "doctor_id": created_doctor_id,
                "appointment_type": "follow_up",
                "reason": "Existing appointment to force conflict",
                "source": "receptionist",
                "created_by": "admin-smoke",
            },
        )
        self.assertEqual(appointment_status, 201, appointment_body)

        scoped_status, scoped_body = request_json(
            "/integrations/appointments/proposed",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "patient_name": f"PacienteScope {unique_suffix}",
                "phone_number": f"556{unique_suffix[:7]}",
                "doctor_id": created_doctor_id,
                "scheduled_start": "2026-03-25T15:00:00Z",
                "scheduled_end": "2026-03-25T15:30:00Z",
                "appointment_type": "follow_up",
                "reason": "Scoped manual review",
                "source": "appoint-me",
                "create_patient_if_missing": False,
            },
        )
        self.assertEqual(scoped_status, 409)
        self.assertEqual(scoped_body["status"], "conflict")

        doctor_token = login(doctor_email, doctor_password)
        review_status, review_items = request_json(
            "/appointment-review-items?review_status=pending_review&limit=50",
            token=doctor_token,
        )
        self.assertEqual(review_status, 200)
        self.assertIsInstance(review_items, list)
        self.assertTrue(all(item["doctor_id"] == created_doctor_id for item in review_items))
        self.assertTrue(any(item["patient_name"] == f"PacienteScope {unique_suffix}" for item in review_items))
        self.assertFalse(any(item["patient_name"] == f"PacienteAjeno {unique_suffix}" for item in review_items))


if __name__ == "__main__":
    unittest.main()
