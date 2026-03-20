import json
import time
import unittest
from urllib import error, request


BASE_URL = "http://127.0.0.1:8000/api"
ADMIN_PHONE = "50258420737"


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


class AuthProfileHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")
        request_json(
            "/auth/me",
            method="PATCH",
            token=cls.admin_token,
            payload={"phone_number": ADMIN_PHONE},
        )

    def test_admin_can_read_and_update_own_phone(self) -> None:
        read_status, read_body = request_json("/auth/me", token=self.admin_token)
        self.assertEqual(read_status, 200)
        self.assertEqual(read_body["user_email"], "admin@docontrol.local")
        original_phone = read_body["phone_number"] or ADMIN_PHONE

        unique_suffix = str(int(time.time() * 1000) % 100000)
        new_phone = f"50258{int(unique_suffix):05d}"

        update_status, update_body = request_json(
            "/auth/me",
            method="PATCH",
            token=self.admin_token,
            payload={"phone_number": new_phone},
        )
        self.assertEqual(update_status, 200)
        self.assertEqual(update_body["phone_number"], new_phone)
        self.assertIn("admin", update_body["roles"])

        verify_status, verify_body = request_json("/auth/me", token=self.admin_token)
        self.assertEqual(verify_status, 200)
        self.assertEqual(verify_body["phone_number"], new_phone)

        restore_status, restore_body = request_json(
            "/auth/me",
            method="PATCH",
            token=self.admin_token,
            payload={"phone_number": ADMIN_PHONE if original_phone != ADMIN_PHONE else original_phone},
        )
        self.assertEqual(restore_status, 200)
        self.assertEqual(restore_body["phone_number"], ADMIN_PHONE if original_phone != ADMIN_PHONE else original_phone)

    def test_admin_cannot_reuse_another_users_phone(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        duplicate_phone = f"404{int(unique_suffix) % 10000000:07d}"

        create_doctor_status, _create_doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Duplicado",
                "last_name": f"Perfil{unique_suffix}",
                "gender": "male",
                "specialty": "General",
                "license_number": f"PROFILE-{unique_suffix}",
                "primary_phone": duplicate_phone,
                "user_email": f"duplicado.perfil.{unique_suffix}@docontrol.local",
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(create_doctor_status, 201)

        update_status, update_body = request_json(
            "/auth/me",
            method="PATCH",
            token=self.admin_token,
            payload={"phone_number": duplicate_phone},
        )
        self.assertEqual(update_status, 400)
        self.assertIn("already in use", update_body["detail"].lower())


if __name__ == "__main__":
    unittest.main()
