import json
import time
import unittest
from urllib import error, request


BASE_URL = "http://127.0.0.1:8000/api"
INTEGRATION_KEY = "appoint-me-dev-key"
ADMIN_PHONE = "50258420737"


def request_json(
    path: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
    integration_key: str | None = None,
    token: str | None = None,
) -> tuple[int, dict | list]:
    headers = {"Content-Type": "application/json"}
    if integration_key:
        headers["x-integration-key"] = integration_key
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


class IntegrationUserVerifyHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        status_code, body = request_json(
            "/auth/login",
            method="POST",
            payload={"email": "admin@docontrol.local", "password": "ChangeMe123!"},
        )
        if status_code != 200 or not isinstance(body, dict):
            raise AssertionError(f"Admin login failed: {status_code} {body}")
        cls.admin_token = body["access_token"]

    def test_verify_admin_by_phone(self) -> None:
        status_code, body = request_json(
            f"/integrations/users/verify?phone={ADMIN_PHONE}",
            integration_key=INTEGRATION_KEY,
        )
        self.assertEqual(status_code, 200)
        self.assertEqual(body["is_valid"], True)
        self.assertEqual(body["role"], "admin")
        self.assertIn("admin", body["roles"])
        self.assertEqual(body["phone_number"], ADMIN_PHONE)
        self.assertIn("manage_doctors", body["permissions"])
        self.assertIn("manage_patients", body["permissions"])

    def test_unknown_phone_returns_invalid(self) -> None:
        status_code, body = request_json(
            "/integrations/users/verify?phone=00000000",
            integration_key=INTEGRATION_KEY,
        )
        self.assertEqual(status_code, 200)
        self.assertEqual(body["is_valid"], False)
        self.assertIsNone(body["role"])
        self.assertEqual(body["roles"], [])
        self.assertEqual(body["permissions"], [])

    def test_verify_doctor_by_phone_accepts_plus_502_variants(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        create_status, create_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Doctor",
                "last_name": unique_suffix,
                "primary_phone": "+50258420738",
                "user_email": f"doctor.{unique_suffix}@docontrol.local",
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(create_status, 201)

        for phone_variant in ("+50258420738", "50258420738", "58420738"):
            status_code, body = request_json(
                f"/integrations/users/verify?phone={phone_variant}",
                integration_key=INTEGRATION_KEY,
            )
            self.assertEqual(status_code, 200)
            self.assertEqual(body["is_valid"], True)
            self.assertEqual(body["role"], "doctor")
            self.assertEqual(body["user_id"], create_body["linked_user_id"])
            self.assertIn("doctor_profile", body)
            self.assertIsNotNone(body["doctor_profile"])
            self.assertEqual(body["doctor_profile"]["doctor_id"], create_body["id"])
            self.assertEqual(
                body["doctor_profile"]["full_name"],
                f"Doctor {unique_suffix}",
            )
            self.assertEqual(body["doctor_profile"]["primary_phone"], "50258420738")

    def test_doctor_creation_requires_user_credentials(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        phone_number = f"503{int(unique_suffix) % 10000000:07d}"
        create_status, create_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Solo",
                "last_name": unique_suffix,
                "primary_phone": phone_number,
            },
        )
        self.assertEqual(create_status, 422)
        self.assertIn("user_email", json.dumps(create_body))
        self.assertIn("user_password", json.dumps(create_body))


if __name__ == "__main__":
    unittest.main()
