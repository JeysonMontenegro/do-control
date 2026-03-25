import json
import unittest
from urllib import error, request


BASE_URL = "http://127.0.0.1:8000/api"


def request_json(path: str, *, token: str | None = None) -> tuple[int, dict | list]:
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(
        f"{BASE_URL}{path}",
        headers=headers,
        method="GET",
    )
    try:
        with request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


def login(email: str, password: str) -> str:
    req = request.Request(
        f"{BASE_URL}/auth/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))["access_token"]


class PublicAppointmentCardHttpSmokeTests(unittest.TestCase):
    def test_public_card_returns_only_safe_appointment_fields(self) -> None:
        admin_token = login("admin@docontrol.local", "ChangeMe123!")
        appointments_status, appointments_body = request_json("/appointments", token=admin_token)
        self.assertEqual(appointments_status, 200)
        self.assertIsInstance(appointments_body, list)
        first_appointment = appointments_body[0]
        public_id = first_appointment["public_id"]

        status_code, body = request_json(f"/public/appointments/{public_id}/card")

        self.assertEqual(status_code, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body["public_id"], public_id)
        self.assertIn("doctor_name", body)
        self.assertIn("scheduled_start", body)
        self.assertIn("appointment_type", body)
        self.assertIn("status_label", body)
        self.assertNotIn("patient_name", body)
        self.assertNotIn("patient_id", body)


if __name__ == "__main__":
    unittest.main()
