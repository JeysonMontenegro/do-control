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


def request_multipart(
    path: str,
    *,
    fields: dict[str, str],
    files: list[tuple[str, str, bytes, str]],
) -> tuple[int, dict | list]:
    boundary = f"----WebKitFormBoundary{time.time_ns()}"
    body_parts: list[bytes] = []
    for key, value in fields.items():
        body_parts.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )
    for field_name, file_name, content, content_type in files:
        body_parts.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                (
                    f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'
                    f"Content-Type: {content_type}\r\n\r\n"
                ).encode("utf-8"),
                content,
                b"\r\n",
            ]
        )
    body_parts.append(f"--{boundary}--\r\n".encode("utf-8"))
    payload = b"".join(body_parts)

    req = request.Request(
        f"{BASE_URL}{path}",
        data=payload,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


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
        self.assertIsNone(validate_body["profile_photo_url"])

        photo_status, photo_body = request_multipart(
            "/doctor-onboarding/photo",
            fields={"token": raw_token},
            files=[("file", "doctor.png", b"fake-image-content", "image/png")],
        )
        self.assertEqual(photo_status, 200)
        self.assertEqual(photo_body["email"], invite_email)
        self.assertTrue(photo_body["profile_photo_url"])

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

    def test_admin_can_list_reissue_revoke_and_complete_onboarding(self) -> None:
        unique_suffix = str(time.time_ns())
        invite_email = f"doctor-admin-onboarding-{unique_suffix[-8:]}@docontrol.local"
        invite_phone = f"553{int(unique_suffix[-7:]):07d}"

        invite_status, invite_body = request_json(
            "/doctors/invitations",
            method="POST",
            token=self.admin_token,
            payload={
                "full_name": f"Doctor Admin {unique_suffix[-6:]}",
                "email": invite_email,
                "phone_number": invite_phone,
            },
        )
        self.assertEqual(invite_status, 201)
        doctor_id = invite_body["doctor_id"]

        list_status, list_body = request_json("/doctors/onboarding", token=self.admin_token)
        self.assertEqual(list_status, 200)
        self.assertIsInstance(list_body, list)
        onboarding_item = next(item for item in list_body if item["doctor_id"] == doctor_id)
        self.assertEqual(onboarding_item["token_status"], "active")
        self.assertTrue(onboarding_item["can_reissue"])
        self.assertTrue(any(step["key"] == "invitation" for step in onboarding_item["steps"]))

        reissue_status, reissue_body = request_json(
            f"/doctors/{doctor_id}/onboarding/reissue",
            method="POST",
            token=self.admin_token,
        )
        self.assertEqual(reissue_status, 200)
        self.assertEqual(reissue_body["status"], "reissued")
        self.assertIn("/doctor/onboarding/", reissue_body["onboarding_url"])

        revoke_status, revoke_body = request_json(
            f"/doctors/{doctor_id}/onboarding/revoke",
            method="POST",
            token=self.admin_token,
        )
        self.assertEqual(revoke_status, 200)
        self.assertEqual(revoke_body["token_status"], "revoked")

        complete_status, complete_body = request_json(
            f"/doctors/{doctor_id}/onboarding",
            method="PATCH",
            token=self.admin_token,
            payload={
                "first_name": "Admin",
                "last_name": "Completa",
                "gender": "male",
                "doctor_title": "Dr.",
                "specialty": "Radiología",
                "phone_number": invite_phone,
                "user_password": "TempAdminComplete123!",
                "activate_user": True,
                "clinics": [
                    {
                        "clinic_name": "Centro Diagnóstico",
                        "address": "Zona 14",
                        "latitude": 14.6,
                        "longitude": -90.5,
                        "phone_number": "55551111",
                        "notes": "Ingreso administrativo",
                        "is_primary": True,
                    }
                ],
            },
        )
        self.assertEqual(complete_status, 200)
        self.assertEqual(complete_body["onboarding_status"], "completed")
        self.assertEqual(complete_body["token_status"], "revoked")

        login_status, login_body = login(invite_email, "TempAdminComplete123!")
        self.assertEqual(login_status, 200)
        self.assertIn("access_token", login_body)


if __name__ == "__main__":
    unittest.main()
