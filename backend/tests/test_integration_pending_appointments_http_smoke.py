import json
from datetime import datetime, timedelta, timezone
import time
import unittest
from urllib import error, parse, request


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


class IntegrationPendingAppointmentsHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_pending_appointments_returns_all_future_scheduled_appointments(self) -> None:
        unique_suffix = str(time.time_ns())
        unique_phone = f"553{int(unique_suffix[-7:]):07d}"
        doctors_status, doctors_body = request_json("/doctors", token=self.admin_token)
        self.assertEqual(doctors_status, 200)
        self.assertIsInstance(doctors_body, list)
        active_doctors = [doctor for doctor in doctors_body if doctor.get("is_active")]
        self.assertTrue(active_doctors)
        doctor_id = active_doctors[0]["id"]

        patient_status, patient_body = request_json(
            "/integrations/patients",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "full_name": f"Paciente Pendiente {unique_suffix[-8:]}",
                "primary_phone": unique_phone,
                "doctor_id": doctor_id,
            },
        )
        self.assertEqual(patient_status, 201)
        patient_id = patient_body["id"]

        unique_number = int(unique_suffix[-6:])
        start_hour = 7 + (unique_number % 9)
        start_minute = (unique_number % 4) * 15
        base_start = (
            datetime.now(timezone.utc).replace(second=0, microsecond=0, hour=start_hour, minute=start_minute)
            + timedelta(days=30 + (unique_number % 11))
        )
        first_start = base_start
        first_end = first_start + timedelta(minutes=30)
        second_start = base_start + timedelta(days=1, hours=2)
        second_end = second_start + timedelta(minutes=45)

        for scheduled_start, scheduled_end, reason in (
            (first_start, first_end, "Primera cita pendiente"),
            (second_start, second_end, "Segunda cita pendiente"),
        ):
            appointment_status, _appointment_body = request_json(
                "/appointments",
                method="POST",
                token=self.admin_token,
                payload={
                    "patient_id": patient_id,
                    "doctor_id": doctor_id,
                    "scheduled_start": scheduled_start.isoformat(),
                    "scheduled_end": scheduled_end.isoformat(),
                    "appointment_type": "follow_up",
                    "reason": reason,
                    "source": "receptionist",
                    "created_by": "pending-smoke",
                },
            )
            self.assertEqual(appointment_status, 201)

        pending_status, pending_body = request_json(
            f"/integrations/appointments/pending?{parse.urlencode({'patient_id': patient_id})}",
            integration_key=INTEGRATION_KEY,
        )
        self.assertEqual(pending_status, 200)
        self.assertIsInstance(pending_body, dict)
        self.assertIn("appointments", pending_body)
        self.assertEqual(len(pending_body["appointments"]), 2)

        first_pending = pending_body["appointments"][0]
        second_pending = pending_body["appointments"][1]
        self.assertLess(first_pending["scheduled_start"], second_pending["scheduled_start"])
        self.assertEqual(first_pending["patient_id"], patient_id)
        self.assertEqual(first_pending["doctor_id"], doctor_id)
        self.assertEqual(first_pending["status"], "scheduled")
        self.assertEqual(first_pending["confirmation_status"], "pending")
        self.assertIn("doctor_name", first_pending)
        self.assertIn("doctor_specialty", first_pending)
        self.assertIn("clinic_name", first_pending)
        self.assertIn("clinic_address", first_pending)
        self.assertIn("scheduled_end", first_pending)


if __name__ == "__main__":
    unittest.main()
