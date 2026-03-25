import json
import time
import unittest
from urllib import error, parse, request


BASE_API_URL = "http://127.0.0.1:8000/api"
BASE_INTEGRATION_URL = "http://127.0.0.1:8000/api/integrations"
INTEGRATION_HEADERS = {
    "Content-Type": "application/json",
    "x-integration-key": "appoint-me-dev-key",
}


def request_json(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
    token: str | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict | list]:
    final_headers = {"Content-Type": "application/json"}
    if token:
        final_headers["Authorization"] = f"Bearer {token}"
    if headers:
        final_headers.update(headers)
    req = request.Request(
        f"{base_url}{path}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=final_headers,
        method=method,
    )
    try:
        with request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


def login(email: str, password: str) -> str:
    status_code, body = request_json(
        BASE_API_URL,
        "/auth/login",
        method="POST",
        payload={"email": email, "password": password},
    )
    if status_code != 200 or not isinstance(body, dict):
        raise AssertionError(f"Login failed for {email}: {status_code} {body}")
    return body["access_token"]


class IntegrationEmailWhitelistHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_email_whitelist_can_guard_real_dispatches(self) -> None:
        state_status, state_body = request_json(BASE_INTEGRATION_URL, "/email/whitelist", headers=INTEGRATION_HEADERS)
        self.assertEqual(state_status, 200)
        self.assertEqual(state_body["enabled"], True)

        target_email = f"qa{int(time.time() * 1000) % 100000}@clinic.com"
        encoded_email = parse.quote(target_email, safe="")

        request_json(BASE_INTEGRATION_URL, f"/email/whitelist/addresses/{encoded_email}", method="DELETE", headers=INTEGRATION_HEADERS)

        blocked_status, blocked_body = request_json(
            BASE_API_URL,
            "/email-dispatches/test",
            method="POST",
            token=self.admin_token,
            payload={"recipient_email": target_email, "template_key": "welcome_email"},
        )
        self.assertEqual(blocked_status, 200)
        self.assertEqual(blocked_body["status"], "skipped")
        self.assertEqual(blocked_body["error_message"], "Recipient email is blocked by whitelist.")

        add_status, add_body = request_json(
            BASE_INTEGRATION_URL,
            "/email/whitelist/addresses",
            method="POST",
            headers=INTEGRATION_HEADERS,
            payload={"email": target_email.upper()},
        )
        self.assertEqual(add_status, 200)
        self.assertEqual(add_body["added"], target_email)

        allowed_status, allowed_body = request_json(
            BASE_INTEGRATION_URL,
            f"/email/can-send?{parse.urlencode({'email': target_email})}",
            headers=INTEGRATION_HEADERS,
        )
        self.assertEqual(allowed_status, 200)
        self.assertEqual(allowed_body["allowed"], True)

        allowed_send_status, allowed_send_body = request_json(
            BASE_API_URL,
            "/email-dispatches/test",
            method="POST",
            token=self.admin_token,
            payload={"recipient_email": target_email, "template_key": "welcome_email"},
        )
        self.assertEqual(allowed_send_status, 200)
        self.assertIn(allowed_send_body["status"], {"sent", "skipped"})
        self.assertNotEqual(allowed_send_body["error_message"], "Recipient email is blocked by whitelist.")

        disabled_status, disabled_body = request_json(
            BASE_INTEGRATION_URL,
            "/email/whitelist",
            method="PUT",
            headers=INTEGRATION_HEADERS,
            payload={"enabled": False},
        )
        self.assertEqual(disabled_status, 200)
        self.assertEqual(disabled_body["enabled"], False)

        unrestricted_status, unrestricted_body = request_json(
            BASE_INTEGRATION_URL,
            "/email/can-send?email=outside%40clinic.com",
            headers=INTEGRATION_HEADERS,
        )
        self.assertEqual(unrestricted_status, 200)
        self.assertEqual(unrestricted_body["allowed"], True)

        reenable_status, reenable_body = request_json(
            BASE_INTEGRATION_URL,
            "/email/whitelist",
            method="PUT",
            headers=INTEGRATION_HEADERS,
            payload={"enabled": True},
        )
        self.assertEqual(reenable_status, 200)
        self.assertEqual(reenable_body["enabled"], True)

        remove_status, remove_body = request_json(
            BASE_INTEGRATION_URL,
            f"/email/whitelist/addresses/{encoded_email}",
            method="DELETE",
            headers=INTEGRATION_HEADERS,
        )
        self.assertEqual(remove_status, 200)
        self.assertEqual(remove_body["removed"], target_email)


if __name__ == "__main__":
    unittest.main()
