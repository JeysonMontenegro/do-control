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


class AppointmentHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")
        cls.doctor_token = login("doctor@docontrol.local", "Doctor123!")

    def test_proposed_appointment_keeps_source_and_history(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_phone = f"557{int(time.time() * 1000) % 10000000:07d}"
        base_time = datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=7)
        minute_offset = int(unique_suffix) % 600
        scheduled_start_dt = base_time + timedelta(minutes=minute_offset)
        scheduled_end_dt = scheduled_start_dt + timedelta(minutes=30)
        scheduled_start = scheduled_start_dt.isoformat().replace("+00:00", "Z")
        scheduled_end = scheduled_end_dt.isoformat().replace("+00:00", "Z")

        proposal_status, proposal_body = request_json(
            "/integrations/appointments/proposed",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "patient_name": f"PacienteWs {unique_suffix}",
                "phone_number": unique_phone,
                "doctor_id": 1,
                "scheduled_start": scheduled_start,
                "scheduled_end": scheduled_end,
                "appointment_type": "follow_up",
                "reason": "WhatsApp scheduling flow",
                "source": "appoint-me",
                "create_patient_if_missing": True,
            },
        )
        self.assertEqual(proposal_status, 201)
        self.assertIsInstance(proposal_body, dict)
        appointment_id = proposal_body["appointment_id"]

        appointments_status, appointments_body = request_json(
            "/appointments",
            token=self.admin_token,
        )
        self.assertEqual(appointments_status, 200)
        self.assertIsInstance(appointments_body, list)
        created_appointment = next(appointment for appointment in appointments_body if appointment["id"] == appointment_id)
        self.assertEqual(created_appointment["source"], "appoint-me")
        self.assertEqual(created_appointment["created_by"], "appoint-me")
        self.assertTrue(created_appointment["patient_name"].startswith("PacienteWs"))
        self.assertEqual(created_appointment["doctor_name"], "Demo Doctor")

        history_status, history_body = request_json(
            f"/appointments/{appointment_id}/history",
            token=self.admin_token,
        )
        self.assertEqual(history_status, 200)
        self.assertIsInstance(history_body, list)
        self.assertTrue(history_body)
        self.assertEqual(history_body[0]["new_status"], "scheduled")

    def test_doctor_can_confirm_appointment_manually(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_phone = f"559{int(time.time() * 1000) % 10000000:07d}"

        patient_status, patient_body = request_json(
            "/patients",
            method="POST",
            token=self.doctor_token,
            payload={
                "medical_record_number": f"EXP-AP-{unique_suffix}",
                "first_name": "Paciente",
                "last_name": f"Agenda{unique_suffix}",
                "primary_phone": unique_phone,
                "national_id": None,
                "tax_id": None,
                "email": None,
            },
        )
        self.assertEqual(patient_status, 201)

        start_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=8)).isoformat()
        end_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=8, minutes=30)).isoformat()

        appointment_status, appointment_body = request_json(
            "/appointments",
            method="POST",
            token=self.doctor_token,
            payload={
                "patient_id": patient_body["id"],
                "doctor_id": 1,
                "scheduled_start": start_at,
                "scheduled_end": end_at,
                "appointment_type": "follow_up",
                "reason": "Confirmacion manual doctor",
                "source": "receptionist",
                "created_by": "doctor-smoke",
            },
        )
        self.assertEqual(appointment_status, 201)

        confirm_status, confirm_body = request_json(
            f"/appointments/{appointment_body['id']}/status",
            method="PATCH",
            token=self.doctor_token,
            payload={
                "status": "confirmed",
                "change_reason": "confirmado manualmente",
                "changed_by": "doctor-smoke",
            },
        )
        self.assertEqual(confirm_status, 200)
        self.assertEqual(confirm_body["status"], "confirmed")
        self.assertEqual(confirm_body["confirmation_status"], "confirmed")


if __name__ == "__main__":
    unittest.main()
