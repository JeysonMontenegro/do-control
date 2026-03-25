import json
import unittest
from urllib import error, parse, request


BASE_URL = "http://127.0.0.1:8000/api/integrations"
HEADERS = {
    "Content-Type": "application/json",
    "x-integration-key": "appoint-me-dev-key",
}


def request_json(
    path: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
) -> tuple[int, dict | list]:
    req = request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8") if payload is not None else None,
        headers=HEADERS,
        method=method,
    )
    try:
        with request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


class IntegrationMessagingWhitelistHttpSmokeTests(unittest.TestCase):
    def test_whitelist_defaults_on_in_development_and_can_manage_phones(self) -> None:
        status_code, body = request_json("/messaging/whitelist")
        self.assertEqual(status_code, 200)
        self.assertIsInstance(body, dict)
        self.assertEqual(body["enabled"], True)
        self.assertIn("phones", body)

        test_phone = "50252827538"
        request_json(f"/messaging/whitelist/phones/{test_phone}", method="DELETE")

        can_send_status, can_send_body = request_json(f"/messaging/can-send?{parse.urlencode({'phone': test_phone})}")
        self.assertEqual(can_send_status, 200)
        self.assertEqual(can_send_body["allowed"], False)

        add_status, add_body = request_json(
            "/messaging/whitelist/phones",
            method="POST",
            payload={"phone": test_phone},
        )
        self.assertEqual(add_status, 200)
        self.assertEqual(add_body["added"], test_phone)

        state_status, state_body = request_json("/messaging/whitelist")
        self.assertEqual(state_status, 200)
        self.assertIn(test_phone, state_body["phones"])

        local_format_status, local_format_body = request_json("/messaging/can-send?phone=52827538")
        self.assertEqual(local_format_status, 200)
        self.assertEqual(local_format_body["allowed"], True)

        disabled_status, disabled_body = request_json(
            "/messaging/whitelist",
            method="PUT",
            payload={"enabled": False},
        )
        self.assertEqual(disabled_status, 200)
        self.assertEqual(disabled_body["enabled"], False)

        unrestricted_status, unrestricted_body = request_json("/messaging/can-send?phone=50239925713")
        self.assertEqual(unrestricted_status, 200)
        self.assertEqual(unrestricted_body["allowed"], True)

        reenable_status, reenable_body = request_json(
            "/messaging/whitelist",
            method="PUT",
            payload={"enabled": True},
        )
        self.assertEqual(reenable_status, 200)
        self.assertEqual(reenable_body["enabled"], True)

        remove_status, remove_body = request_json(f"/messaging/whitelist/phones/{test_phone}", method="DELETE")
        self.assertEqual(remove_status, 200)
        self.assertEqual(remove_body["removed"], test_phone)


if __name__ == "__main__":
    unittest.main()
