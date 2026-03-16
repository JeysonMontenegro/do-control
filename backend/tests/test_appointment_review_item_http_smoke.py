import json
import time
import unittest
from urllib import error, request


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
    status_code, body = request_json(
        "/auth/login",
        method="POST",
        payload={"email": email, "password": password},
    )
    if status_code != 200 or not isinstance(body, dict):
        raise AssertionError(f"Login failed for {email}: {status_code} {body}")
    return body["access_token"]


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


if __name__ == "__main__":
    unittest.main()
