import json
import time
import unittest
from datetime import datetime, timedelta, timezone
from urllib import error, request


BASE_URL = "http://127.0.0.1:8000/api"


def request_json(
    path: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
    token: str | None = None,
) -> tuple[int, dict | list]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
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


class AppointmentNotesHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_create_and_update_internal_notes(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_phone = f"558{int(time.time() * 1000) % 10000000:07d}"

        patient_status, patient_body = request_json(
            "/patients",
            method="POST",
            token=self.admin_token,
            payload={
                "medical_record_number": f"EXP-NOTE-{unique_suffix}",
                "first_name": "Paciente",
                "last_name": f"Nota{unique_suffix}",
                "primary_phone": unique_phone,
                "national_id": None,
                "tax_id": None,
                "email": None,
                "doctor_id": 1,
            },
        )
        self.assertEqual(patient_status, 201)

        start_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=6)).isoformat()
        end_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=6, minutes=30)).isoformat()

        appointment_status, appointment_body = request_json(
            "/appointments",
            method="POST",
            token=self.admin_token,
            payload={
                "patient_id": patient_body["id"],
                "doctor_id": 1,
                "scheduled_start": start_at,
                "scheduled_end": end_at,
                "appointment_type": "follow_up",
                "reason": "Prueba de nota interna",
                "internal_notes": "Paciente prefiere consulta puntual y traer examenes.",
                "source": "receptionist",
                "created_by": "admin-smoke",
            },
        )
        self.assertEqual(appointment_status, 201)
        self.assertEqual(appointment_body["internal_notes"], "Paciente prefiere consulta puntual y traer examenes.")

        update_status, update_body = request_json(
            f"/appointments/{appointment_body['id']}",
            method="PATCH",
            token=self.admin_token,
            payload={
                "internal_notes": "Paciente llegara 15 minutos antes con resultados impresos.",
                "changed_by": "admin-smoke",
            },
        )
        self.assertEqual(update_status, 200)
        self.assertEqual(update_body["internal_notes"], "Paciente llegara 15 minutos antes con resultados impresos.")


if __name__ == "__main__":
    unittest.main()
