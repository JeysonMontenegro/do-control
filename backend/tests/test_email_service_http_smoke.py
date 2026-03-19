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


class EmailServiceHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_admin_can_manage_email_templates_and_resend_dispatches(self) -> None:
        templates_status, templates_body = request_json("/email-templates", token=self.admin_token)
        self.assertEqual(templates_status, 200)
        self.assertIsInstance(templates_body, list)
        self.assertGreaterEqual(len(templates_body), 3)
        welcome_template = next(template for template in templates_body if template["template_key"] == "welcome_email")

        preview_status, preview_body = request_json(
            "/email-templates/preview",
            method="POST",
            token=self.admin_token,
            payload={
                "subject": "Bienvenido a {app_name}",
                "html_body": "<p>Hola {recipient_name}</p>",
                "text_body": "Hola {recipient_name}",
                "variables": {"app_name": "do-control", "recipient_name": "Ana"},
            },
        )
        self.assertEqual(preview_status, 200)
        self.assertEqual(preview_body["rendered_subject"], "Bienvenido a do-control")

        update_status, update_body = request_json(
            f"/email-templates/{welcome_template['id']}",
            method="PATCH",
            token=self.admin_token,
            payload={"title": "Bienvenida principal"},
        )
        self.assertEqual(update_status, 200)
        self.assertEqual(update_body["title"], "Bienvenida principal")

        unique_suffix = str(int(time.time() * 1000) % 10000000)
        invite_status, invite_body = request_json(
            "/auth/admin-invites",
            method="POST",
            token=self.admin_token,
            payload={
                "email": f"admin.invite.{unique_suffix}@example.com",
                "first_name": "Admin",
                "last_name": f"Invitado{unique_suffix}",
            },
        )
        self.assertEqual(invite_status, 200)
        self.assertEqual(invite_body["status"], "sent")

        reset_status, reset_body = request_json(
            "/auth/password-reset/request",
            method="POST",
            payload={"email": "admin@docontrol.local"},
        )
        self.assertEqual(reset_status, 200)
        self.assertEqual(reset_body["status"], "accepted")

        dispatches_status, dispatches_body = request_json("/email-dispatches", token=self.admin_token)
        self.assertEqual(dispatches_status, 200)
        self.assertIsInstance(dispatches_body, list)
        self.assertGreaterEqual(len(dispatches_body), 2)
        latest_dispatch = dispatches_body[0]
        self.assertIn(latest_dispatch["status"], {"sent", "skipped", "failed"})

        resend_status, resend_body = request_json(
            f"/email-dispatches/{latest_dispatch['id']}/resend",
            method="POST",
            token=self.admin_token,
            payload={},
        )
        self.assertEqual(resend_status, 200)
        self.assertEqual(resend_body["subject"], latest_dispatch["subject"])
        self.assertGreaterEqual(resend_body["retry_count"], 0)

        test_send_status, test_send_body = request_json(
            "/email-dispatches/test",
            method="POST",
            token=self.admin_token,
            payload={
                "recipient_email": "qa@example.com",
                "template_key": "welcome_email",
            },
        )
        self.assertEqual(test_send_status, 200)
        self.assertEqual(test_send_body["recipient_email"], "qa@example.com")
        self.assertEqual(test_send_body["template_key"], "welcome_email")


if __name__ == "__main__":
    unittest.main()
