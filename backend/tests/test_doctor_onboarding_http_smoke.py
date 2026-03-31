import json
import time
import unittest
from urllib import error, parse, request


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


def login(email: str, password: str) -> tuple[int, dict]:
    status_code, body = request_json(
        "/auth/login",
        method="POST",
        payload={"email": email, "password": password},
    )
    return status_code, body if isinstance(body, dict) else {}


class DoctorOnboardingHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        status_code, body = login("admin@docontrol.local", "ChangeMe123!")
        if status_code != 200:
            raise AssertionError(f"Admin login failed: {status_code} {body}")
        cls.admin_token = body["access_token"]

    def test_admin_can_invite_and_doctor_can_complete_onboarding_once(self) -> None:
        unique_suffix = str(time.time_ns())
        invite_email = f"doctor-onboarding-{unique_suffix[-8:]}@docontrol.local"
        invite_phone = f"554{int(unique_suffix[-7:]):07d}"

        invite_status, invite_body = request_json(
            "/doctors/invitations",
            method="POST",
            token=self.admin_token,
            payload={
                "full_name": f"Doctora Demo {unique_suffix[-6:]}",
                "email": invite_email,
                "phone_number": invite_phone,
            },
        )
        self.assertEqual(invite_status, 201)
        self.assertEqual(invite_body["status"], "sent")
        self.assertIn("/doctor/onboarding/", invite_body["onboarding_url"])

        raw_token = invite_body["onboarding_url"].rstrip("/").rsplit("/", 1)[-1]

        validate_status, validate_body = request_json(
            f"/doctor-onboarding/validate?{parse.urlencode({'token': raw_token})}"
        )
        self.assertEqual(validate_status, 200)
        self.assertEqual(validate_body["email"], invite_email)
        self.assertEqual(validate_body["phone_number"], invite_phone)

        complete_status, complete_body = request_json(
            "/doctor-onboarding/complete",
            method="POST",
            payload={
                "token": raw_token,
                "password": "DoctorOnboarding123!",
                "first_name": "Doctora",
                "last_name": "Completa",
                "gender": "female",
                "doctor_title": "Dra.",
                "specialty": "Pediatría",
                "clinics": [
                    {
                        "clinic_name": "Clínica Central",
                        "address": "Zona 10",
                        "latitude": 14.595,
                        "longitude": -90.513,
                        "phone_number": "55550000",
                        "notes": "Nivel 2",
                        "is_primary": True,
                    }
                ],
            },
        )
        self.assertEqual(complete_status, 200)
        self.assertEqual(complete_body["status"], "completed")
        self.assertEqual(complete_body["email"], invite_email)

        login_status, login_body = login(invite_email, "DoctorOnboarding123!")
        self.assertEqual(login_status, 200)
        self.assertIn("access_token", login_body)

        reused_status, reused_body = request_json(
            f"/doctor-onboarding/validate?{parse.urlencode({'token': raw_token})}"
        )
        self.assertEqual(reused_status, 400)
        self.assertEqual(
            reused_body["detail"],
            "El enlace de registro no es válido, ya venció o ya fue utilizado.",
        )


if __name__ == "__main__":
    unittest.main()
