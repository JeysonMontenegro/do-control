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


class CommunicationTemplateHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.doctor_token = login("doctor@docontrol.local", "Doctor123!")

    def test_doctor_can_create_preview_and_update_confirmation_template(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        template_key = f"doctor_confirmation_{unique_suffix}"

        create_status, create_body = request_json(
            "/communication-templates",
            method="POST",
            token=self.doctor_token,
            payload={
                "doctor_id": 1,
                "channel": "whatsapp",
                "template_key": template_key,
                "title": "Confirmación personalizada",
                "body": "Hola {patient_name}, su cita con {doctor_name} está confirmada para {appointment_date} a las {appointment_time}.",
                "is_active": True,
            },
        )
        self.assertEqual(create_status, 201)
        self.assertIsInstance(create_body, dict)

        preview_status, preview_body = request_json(
            "/communication-templates/preview",
            method="POST",
            token=self.doctor_token,
            payload={
                "doctor_id": 1,
                "channel": "whatsapp",
                "template_key": template_key,
                "title": "Confirmación personalizada",
                "body": "Hola {patient_name}, su cita con {doctor_name} está confirmada para {appointment_date} a las {appointment_time}.",
            },
        )
        self.assertEqual(preview_status, 200)
        self.assertIsInstance(preview_body, dict)
        self.assertIn("rendered_message", preview_body)
        self.assertIsInstance(preview_body["rendered_message"], str)

        update_status, update_body = request_json(
            f"/communication-templates/{create_body['id']}",
            method="PATCH",
            token=self.doctor_token,
            payload={"title": "Confirmación actualizada"},
        )
        self.assertEqual(update_status, 200)
        self.assertEqual(update_body["title"], "Confirmación actualizada")


if __name__ == "__main__":
    unittest.main()
