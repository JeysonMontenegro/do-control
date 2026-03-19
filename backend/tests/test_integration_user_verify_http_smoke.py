import json
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
) -> tuple[int, dict | list]:
    headers = {"Content-Type": "application/json"}
    if integration_key:
        headers["x-integration-key"] = integration_key
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


if __name__ == "__main__":
    unittest.main()
