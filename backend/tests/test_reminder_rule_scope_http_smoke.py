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


class ReminderRuleScopeHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = token_for("admin@docontrol.local")

    def test_doctor_only_sees_own_rules(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)

        doctor_a_status, doctor_a_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Rule",
                "last_name": f"A{unique_suffix}",
                "gender": "male",
                "primary_phone": f"50257{unique_suffix[:6]}",
                "specialty": "Medicina general",
                "user_email": f"rule.a.{unique_suffix}@example.com",
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(doctor_a_status, 201, doctor_a_body)

        doctor_b_status, doctor_b_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Rule",
                "last_name": f"B{unique_suffix}",
                "gender": "female",
                "primary_phone": f"50256{unique_suffix[:6]}",
                "specialty": "Pediatría",
                "user_email": f"rule.b.{unique_suffix}@example.com",
                "user_password": "Doctor123!",
            },
        )
        self.assertEqual(doctor_b_status, 201, doctor_b_body)

        rule_a_status, rule_a_body = request_json(
            "/reminder-rules",
            method="POST",
            token=self.admin_token,
            payload={
                "doctor_id": doctor_a_body["id"],
                "channel": "whatsapp",
                "trigger_type": "before_appointment",
                "minutes_before": 1440,
                "template_key": "appointment_confirmation_doctor",
                "is_active": True,
            },
        )
        self.assertEqual(rule_a_status, 201, rule_a_body)

        rule_b_status, rule_b_body = request_json(
            "/reminder-rules",
            method="POST",
            token=self.admin_token,
            payload={
                "doctor_id": doctor_b_body["id"],
                "channel": "whatsapp",
                "trigger_type": "before_appointment",
                "minutes_before": 120,
                "template_key": "appointment_confirmation_doctor",
                "is_active": True,
            },
        )
        self.assertEqual(rule_b_status, 201, rule_b_body)

        doctor_a_token = token_for(f"rule.a.{unique_suffix}@example.com")
        list_status, list_body = request_json("/reminder-rules", token=doctor_a_token)
        self.assertEqual(list_status, 200)
        self.assertIsInstance(list_body, list)
        self.assertTrue(any(rule["doctor_id"] == doctor_a_body["id"] for rule in list_body))
        self.assertFalse(any(rule["doctor_id"] == doctor_b_body["id"] for rule in list_body))


if __name__ == "__main__":
    unittest.main()
