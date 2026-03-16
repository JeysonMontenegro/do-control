import json
from datetime import datetime, timedelta, timezone
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


class IntegrationRecalendarHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_recalendar_creates_review_item_linked_to_existing_appointment(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_phone = f"558{int(time.time() * 1000) % 10000000:07d}"
        base_time = datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=14)
        scheduled_start_dt = base_time + timedelta(hours=8, minutes=int(unique_suffix) % 120)
        scheduled_end_dt = scheduled_start_dt + timedelta(minutes=30)

        proposal_status, proposal_body = request_json(
            "/integrations/appointments/proposed",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "patient_name": f"Paciente Recalendar {unique_suffix}",
                "phone_number": unique_phone,
                "doctor_id": 1,
                "scheduled_start": scheduled_start_dt.isoformat().replace("+00:00", "Z"),
                "scheduled_end": scheduled_end_dt.isoformat().replace("+00:00", "Z"),
                "appointment_type": "follow_up",
                "reason": "Solicitud inicial por WhatsApp",
                "source": "appoint-me",
                "create_patient_if_missing": True,
            },
        )
        self.assertEqual(proposal_status, 201)

        requested_start = (scheduled_start_dt + timedelta(days=1, hours=1)).isoformat().replace("+00:00", "Z")
        requested_end = (scheduled_end_dt + timedelta(days=1, hours=1)).isoformat().replace("+00:00", "Z")
        recalendar_status, recalendar_body = request_json(
            "/integrations/appointments/reschedule",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "doctor_id": 1,
                "patient_name": f"Paciente Recalendar {unique_suffix}",
                "date": scheduled_start_dt.date().isoformat(),
                "requested_start": requested_start,
                "requested_end": requested_end,
                "note": "Paciente respondió RECALENDAR por WhatsApp.",
            },
        )
        self.assertEqual(recalendar_status, 200)
        self.assertEqual(recalendar_body["status"], "pending_review")
        self.assertEqual(recalendar_body["appointment_id"], proposal_body["appointment_id"])

        review_status, review_body = request_json(
            "/appointment-review-items?review_status=pending_review&limit=20",
            token=self.admin_token,
        )
        self.assertEqual(review_status, 200)
        self.assertIsInstance(review_body, list)
        created_item = next(item for item in review_body if item["id"] == recalendar_body["review_item_id"])
        self.assertEqual(created_item["existing_appointment_id"], proposal_body["appointment_id"])
        self.assertEqual(created_item["review_reason"], "reschedule_request")
        self.assertEqual(created_item["review_message"], "Paciente respondió RECALENDAR por WhatsApp.")


if __name__ == "__main__":
    unittest.main()
