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


class IntegrationRequesterScopeHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_requester_phone_resolves_single_assigned_doctor(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        doctor_status, doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Scope",
                "last_name": f"Doctor{unique_suffix}",
                "gender": "male",
                "specialty": "General",
                "license_number": f"SCOPE-{unique_suffix}",
                "primary_phone": f"501{int(unique_suffix) % 10000000:07d}",
                "user_email": f"scope.doctor.{unique_suffix}@example.com",
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(doctor_status, 201)

        receptionist_phone = f"502{int(unique_suffix) % 10000000:07d}"
        receptionist_status, receptionist_body = request_json(
            "/receptionists",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Reception",
                "last_name": f"One{unique_suffix}",
                "gender": "female",
                "phone_number": receptionist_phone,
                "email": f"scope-reception-{unique_suffix}@docontrol.local",
                "password": "ReceptionScope123!",
                "doctor_ids": [doctor_body["id"]],
            },
        )
        self.assertEqual(receptionist_status, 201)

        start_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=9)).isoformat().replace("+00:00", "Z")
        end_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=9, minutes=30)).isoformat().replace("+00:00", "Z")
        proposal_status, proposal_body = request_json(
            "/integrations/appointments/proposed",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "patient_name": f"Paciente Scope {unique_suffix}",
                "phone_number": f"503{int(unique_suffix) % 10000000:07d}",
                "requester_phone_number": receptionist_phone,
                "scheduled_start": start_at,
                "scheduled_end": end_at,
                "appointment_type": "follow_up",
                "reason": "Whatsapp receptionist scoped flow",
                "source": "appoint-me",
                "create_patient_if_missing": True,
            },
        )
        self.assertEqual(proposal_status, 201)
        self.assertEqual(proposal_body["doctor_id"], doctor_body["id"])

    def test_requester_with_multiple_doctors_requires_explicit_doctor(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        doctor_ids = []
        for prefix in ("504", "505"):
            doctor_status, doctor_body = request_json(
                "/doctors",
                method="POST",
                token=self.admin_token,
                payload={
                    "first_name": "ScopeMulti",
                    "last_name": f"{prefix}{unique_suffix}",
                    "gender": "male",
                    "specialty": "General",
                    "license_number": f"MULTI-{prefix}-{unique_suffix}",
                    "primary_phone": f"{prefix}{int(unique_suffix) % 10000000:07d}",
                    "user_email": f"scope.multi.{prefix}.{unique_suffix}@example.com",
                    "user_password": "Doctor123!",
                },
            )
            self.assertEqual(doctor_status, 201)
            doctor_ids.append(doctor_body["id"])

        receptionist_phone = f"506{int(unique_suffix) % 10000000:07d}"
        receptionist_status, _receptionist_body = request_json(
            "/receptionists",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Reception",
                "last_name": f"Many{unique_suffix}",
                "gender": "female",
                "phone_number": receptionist_phone,
                "email": f"multi-reception-{unique_suffix}@docontrol.local",
                "password": "ReceptionScope123!",
                "doctor_ids": doctor_ids,
            },
        )
        self.assertEqual(receptionist_status, 201)

        start_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=12)).isoformat().replace("+00:00", "Z")
        end_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=12, minutes=30)).isoformat().replace("+00:00", "Z")
        proposal_status, proposal_body = request_json(
            "/integrations/appointments/proposed",
            method="POST",
            integration_key=INTEGRATION_KEY,
            payload={
                "patient_name": f"Paciente Scope Multi {unique_suffix}",
                "phone_number": f"507{int(unique_suffix) % 10000000:07d}",
                "requester_phone_number": receptionist_phone,
                "scheduled_start": start_at,
                "scheduled_end": end_at,
                "appointment_type": "follow_up",
                "reason": "Whatsapp receptionist multi-doctor flow",
                "source": "appoint-me",
                "create_patient_if_missing": True,
            },
        )
        self.assertEqual(proposal_status, 200)
        self.assertEqual(proposal_body["status"], "needs_manual_review")
        self.assertIn("contacte a su administrador", proposal_body["message"].lower())
        self.assertEqual(proposal_body.get("available_doctors"), [])


if __name__ == "__main__":
    unittest.main()
