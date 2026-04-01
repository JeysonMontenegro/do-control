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


class IntegrationHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")
        doctors_status, doctors_body = request_json("/doctors", token=cls.admin_token)
        if doctors_status != 200 or not isinstance(doctors_body, list):
            raise AssertionError(f"Unable to list doctors: {doctors_status} {doctors_body}")
        active_doctors = [doctor for doctor in doctors_body if doctor.get("is_active")]
        if not active_doctors:
            raise AssertionError("No active doctors available for integration smoke tests.")
        cls.doctor_id = active_doctors[0]["id"]

    def test_match_patient_rejects_invalid_integration_key(self) -> None:
        status_code, body = request_json(
            "/integrations/patients/match",
            method="POST",
            payload={"patient_name": "Pedro Ruiz", "phone_number": ""},
            integration_key="wrong-key",
        )

        self.assertEqual(status_code, 401)
        self.assertEqual(body, {"detail": "Invalid integration key."})

    def test_create_match_and_deactivate_patient_roundtrip(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_name = f"PedroUnico {unique_suffix}"
        unique_phone = f"555{int(time.time() * 1000) % 10000000:07d}"

        create_status, created_patient = request_json(
            "/integrations/patients",
            method="POST",
            payload={
                "full_name": unique_name,
                "display_name": f"{unique_name} (padre)",
                "primary_phone": unique_phone,
                "doctor_id": self.doctor_id,
            },
            integration_key=INTEGRATION_KEY,
        )
        self.assertEqual(create_status, 201)
        self.assertEqual(created_patient["patient_name"], unique_name)
        self.assertEqual(created_patient["display_name"], f"{unique_name} (padre)")
        self.assertEqual(created_patient["primary_phone"], unique_phone)

        match_status, matched_patient = request_json(
            "/integrations/patients/match",
            method="POST",
            payload={"patient_name": unique_name, "phone_number": ""},
            integration_key=INTEGRATION_KEY,
        )
        self.assertEqual(match_status, 200)
        self.assertEqual(matched_patient["status"], "matched")
        self.assertTrue(matched_patient["candidate_matches"])
        self.assertEqual(matched_patient["candidate_matches"][0]["patient_id"], created_patient["id"])
        self.assertEqual(matched_patient["candidate_matches"][0]["confidence"], "high")
        self.assertEqual(matched_patient["candidate_matches"][0]["display_name"], f"{unique_name} (padre)")
        self.assertIn("created_at", matched_patient["candidate_matches"][0])
        self.assertIn("updated_at", matched_patient["candidate_matches"][0])

        deactivate_status, deactivate_body = request_json(
            f"/integrations/patients/{created_patient['id']}/deactivate",
            method="PATCH",
            integration_key=INTEGRATION_KEY,
        )
        self.assertEqual(deactivate_status, 200)
        self.assertEqual(deactivate_body, {"status": "deactivated", "patient_id": created_patient["id"]})

        post_deactivate_status, post_deactivate_body = request_json(
            "/integrations/patients/match",
            method="POST",
            payload={"patient_name": unique_name, "phone_number": ""},
            integration_key=INTEGRATION_KEY,
        )
        self.assertEqual(post_deactivate_status, 200)
        self.assertEqual(post_deactivate_body["status"], "no_match")
        self.assertEqual(post_deactivate_body["candidate_matches"], [])


if __name__ == "__main__":
    unittest.main()
