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


class IntegrationPatientPhoneHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_update_patient_phone_keeps_history_and_reuses_existing_number(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        old_phone = f"551{int(unique_suffix) % 10000000:07d}"
        new_phone = f"552{int(unique_suffix) % 10000000:07d}"

        patient_status, patient_body = request_json(
            "/patients",
            method="POST",
            token=self.admin_token,
            payload={
                "medical_record_number": f"EXP-PHONE-{unique_suffix}",
                "first_name": "Edward",
                "last_name": f"Gomez{unique_suffix}",
                "primary_phone": old_phone,
                "national_id": None,
                "tax_id": None,
                "email": None,
            },
        )
        self.assertEqual(patient_status, 201)
        patient_id = patient_body["id"]

        first_update_status, first_update_body = request_json(
            f"/integrations/patients/{patient_id}/phone",
            method="PATCH",
            integration_key=INTEGRATION_KEY,
            payload={"phone_number": new_phone},
        )
        self.assertEqual(first_update_status, 200)
        self.assertEqual(first_update_body["status"], "updated")
        self.assertEqual(first_update_body["primary_phone"], new_phone)
        self.assertEqual(first_update_body["previous_phone"], old_phone)

        patient_read_status, patient_read_body = request_json(
            f"/patients/{patient_id}",
            token=self.admin_token,
        )
        self.assertEqual(patient_read_status, 200)
        self.assertEqual(patient_read_body["primary_phone"], new_phone)
        self.assertEqual(len(patient_read_body["phone_numbers"]), 2)
        old_entry = next(phone for phone in patient_read_body["phone_numbers"] if phone["phone_number"] == old_phone)
        new_entry = next(phone for phone in patient_read_body["phone_numbers"] if phone["phone_number"] == new_phone)
        self.assertFalse(old_entry["is_primary"])
        self.assertTrue(old_entry["is_active"])
        self.assertTrue(new_entry["is_primary"])
        self.assertTrue(new_entry["is_active"])

        second_update_status, _second_update_body = request_json(
            f"/integrations/patients/{patient_id}/phone",
            method="PATCH",
            integration_key=INTEGRATION_KEY,
            payload={"phone_number": old_phone},
        )
        self.assertEqual(second_update_status, 200)

        patient_read_status, patient_read_body = request_json(
            f"/patients/{patient_id}",
            token=self.admin_token,
        )
        self.assertEqual(patient_read_status, 200)
        self.assertEqual(patient_read_body["primary_phone"], old_phone)
        self.assertEqual(len(patient_read_body["phone_numbers"]), 2)
        reused_old_entry = next(phone for phone in patient_read_body["phone_numbers"] if phone["phone_number"] == old_phone)
        reused_new_entry = next(phone for phone in patient_read_body["phone_numbers"] if phone["phone_number"] == new_phone)
        self.assertTrue(reused_old_entry["is_primary"])
        self.assertFalse(reused_new_entry["is_primary"])


if __name__ == "__main__":
    unittest.main()
