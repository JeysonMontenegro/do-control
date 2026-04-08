import json
import time
import unittest
from urllib import error, request

from app.db.session import SessionLocal
from app.models.all_models import *  # noqa: F401,F403
from app.repositories.user import UserRepository
from app.services.security import create_access_token


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


def token_for(email: str) -> str:
    db = SessionLocal()
    try:
        user = UserRepository(db).get_by_email(email)
        if user is None:
            raise AssertionError(f"User not found: {email}")
        roles = [user_role.role.name for user_role in user.roles]
        return create_access_token(subject=user.email, user_id=user.id, roles=roles)
    finally:
        db.close()


class CommunicationTemplateHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = token_for("admin@docontrol.local")

    def test_doctor_can_create_preview_and_update_confirmation_template(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        template_key = f"doctor_confirmation_{unique_suffix}"
        doctor_status, doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Template",
                "last_name": f"Owner{unique_suffix}",
                "gender": "male",
                "primary_phone": f"50255{unique_suffix[:6]}",
                "specialty": "Medicina general",
                "user_email": f"template.owner.{unique_suffix}@example.com",
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(doctor_status, 201, doctor_body)
        doctor_token = token_for(f"template.owner.{unique_suffix}@example.com")

        create_status, create_body = request_json(
            "/communication-templates",
            method="POST",
            token=doctor_token,
            payload={
                "doctor_id": doctor_body["id"],
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
            token=doctor_token,
            payload={
                "doctor_id": doctor_body["id"],
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
            token=doctor_token,
            payload={"title": "Confirmación actualizada"},
        )
        self.assertEqual(update_status, 200)
        self.assertEqual(update_body["title"], "Confirmación actualizada")

    def test_doctor_only_lists_own_and_global_templates(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)

        doctor_a_status, doctor_a_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Template",
                "last_name": f"A{unique_suffix}",
                "gender": "male",
                "primary_phone": f"50253{unique_suffix[:6]}",
                "specialty": "Medicina general",
                "user_email": f"template.a.{unique_suffix}@example.com",
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(doctor_a_status, 201, doctor_a_body)

        doctor_b_status, doctor_b_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Template",
                "last_name": f"B{unique_suffix}",
                "gender": "female",
                "primary_phone": f"50252{unique_suffix[:6]}",
                "specialty": "Pediatría",
                "user_email": f"template.b.{unique_suffix}@example.com",
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(doctor_b_status, 201, doctor_b_body)

        template_a_status, template_a_body = request_json(
            "/communication-templates",
            method="POST",
            token=self.admin_token,
            payload={
                "doctor_id": doctor_a_body["id"],
                "channel": "whatsapp",
                "template_key": f"scope_a_{unique_suffix}",
                "title": "Template A",
                "body": "Hola {patient_name}",
                "is_active": True,
            },
        )
        self.assertEqual(template_a_status, 201, template_a_body)

        template_b_status, template_b_body = request_json(
            "/communication-templates",
            method="POST",
            token=self.admin_token,
            payload={
                "doctor_id": doctor_b_body["id"],
                "channel": "whatsapp",
                "template_key": f"scope_b_{unique_suffix}",
                "title": "Template B",
                "body": "Hola {patient_name}",
                "is_active": True,
            },
        )
        self.assertEqual(template_b_status, 201, template_b_body)

        doctor_a_token = token_for(f"template.a.{unique_suffix}@example.com")
        list_status, list_body = request_json("/communication-templates", token=doctor_a_token)
        self.assertEqual(list_status, 200)
        self.assertIsInstance(list_body, list)
        self.assertTrue(any(item["id"] == template_a_body["id"] for item in list_body))
        self.assertFalse(any(item["id"] == template_b_body["id"] for item in list_body))


if __name__ == "__main__":
    unittest.main()
