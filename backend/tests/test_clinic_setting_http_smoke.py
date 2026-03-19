import json
import time
import unittest
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


class ClinicSettingHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_admin_can_toggle_multi_doctor_visibility(self) -> None:
        get_status, get_body = request_json("/clinic-settings", token=self.admin_token)
        self.assertEqual(get_status, 200)
        self.assertIsInstance(get_body, dict)
        self.assertIn("allow_multi_doctor_visibility", get_body)
        self.assertIn("email_delivery_enabled", get_body)
        self.assertIn("email_delivery_active", get_body)
        self.assertIn("welcome_doctor_email_enabled", get_body)

        flipped_value = not get_body["allow_multi_doctor_visibility"]
        patch_status, patch_body = request_json(
            "/clinic-settings",
            method="PATCH",
            token=self.admin_token,
            payload={"allow_multi_doctor_visibility": flipped_value},
        )
        self.assertEqual(patch_status, 200)
        self.assertEqual(patch_body["allow_multi_doctor_visibility"], flipped_value)

        restore_status, restore_body = request_json(
            "/clinic-settings",
            method="PATCH",
            token=self.admin_token,
            payload={"allow_multi_doctor_visibility": get_body["allow_multi_doctor_visibility"]},
        )
        self.assertEqual(restore_status, 200)
        self.assertEqual(restore_body["allow_multi_doctor_visibility"], get_body["allow_multi_doctor_visibility"])

    def test_admin_can_toggle_email_delivery(self) -> None:
        get_status, get_body = request_json("/clinic-settings", token=self.admin_token)
        self.assertEqual(get_status, 200)
        original_value = get_body["email_delivery_enabled"]

        patch_status, patch_body = request_json(
            "/clinic-settings",
            method="PATCH",
            token=self.admin_token,
            payload={"email_delivery_enabled": not original_value},
        )
        self.assertEqual(patch_status, 200)
        self.assertEqual(patch_body["email_delivery_enabled"], (not original_value))

        restore_status, restore_body = request_json(
            "/clinic-settings",
            method="PATCH",
            token=self.admin_token,
            payload={"email_delivery_enabled": original_value},
        )
        self.assertEqual(restore_status, 200)
        self.assertEqual(restore_body["email_delivery_enabled"], original_value)

    def test_admin_can_toggle_individual_email_process(self) -> None:
        get_status, get_body = request_json("/clinic-settings", token=self.admin_token)
        self.assertEqual(get_status, 200)
        original_value = get_body["password_reset_email_enabled"]

        patch_status, patch_body = request_json(
            "/clinic-settings",
            method="PATCH",
            token=self.admin_token,
            payload={"password_reset_email_enabled": not original_value},
        )
        self.assertEqual(patch_status, 200)
        self.assertEqual(patch_body["password_reset_email_enabled"], (not original_value))

        restore_status, restore_body = request_json(
            "/clinic-settings",
            method="PATCH",
            token=self.admin_token,
            payload={"password_reset_email_enabled": original_value},
        )
        self.assertEqual(restore_status, 200)
        self.assertEqual(restore_body["password_reset_email_enabled"], original_value)
