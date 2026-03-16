import json
import time
import unittest
from urllib import error, request


BASE_URL = "http://127.0.0.1:8000/api/integrations"
INTEGRATION_KEY = "appoint-me-dev-key"


def post_json(path: str, payload: dict, integration_key: str) -> tuple[int, dict]:
    req = request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-integration-key": integration_key,
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


class IntegrationHttpSmokeTests(unittest.TestCase):
    def test_match_patient_rejects_invalid_integration_key(self) -> None:
        status_code, body = post_json(
            "/patients/match",
            {"patient_name": "Pedro Ruiz", "phone_number": ""},
            integration_key="wrong-key",
        )

        self.assertEqual(status_code, 401)
        self.assertEqual(body, {"detail": "Invalid integration key."})

    def test_create_patient_and_match_patient_roundtrip(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_name = f"PedroUnico {unique_suffix}"
        unique_phone = f"555{int(time.time() * 1000) % 10000000:07d}"
        create_status, created_patient = post_json(
            "/patients",
            {"full_name": unique_name, "primary_phone": unique_phone},
            integration_key=INTEGRATION_KEY,
        )

        self.assertEqual(create_status, 201)
        self.assertEqual(created_patient["patient_name"], unique_name)
        self.assertEqual(created_patient["primary_phone"], unique_phone)

        match_status, matched_patient = post_json(
            "/patients/match",
            {"patient_name": unique_name, "phone_number": ""},
            integration_key=INTEGRATION_KEY,
        )

        self.assertEqual(match_status, 200)
        self.assertEqual(matched_patient["status"], "matched")
        self.assertTrue(matched_patient["candidate_matches"])
        self.assertEqual(matched_patient["candidate_matches"][0]["patient_id"], created_patient["id"])
        self.assertEqual(matched_patient["candidate_matches"][0]["confidence"], "high")


if __name__ == "__main__":
    unittest.main()
