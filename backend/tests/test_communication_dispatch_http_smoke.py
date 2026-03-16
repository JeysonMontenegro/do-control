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


class CommunicationDispatchHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")
        cls.doctor_token = login("doctor@docontrol.local", "Doctor123!")

    def test_doctor_requires_patient_or_appointment_filter(self) -> None:
        status_code, body = request_json(
            "/communication-dispatches?limit=5",
            token=self.doctor_token,
        )

        self.assertEqual(status_code, 403)
        self.assertEqual(
            body,
            {"detail": "Doctors must filter communication dispatches by patient or appointment."},
        )

    def test_dispatch_list_by_patient_includes_readable_context(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_name = f"TimelinePaciente {unique_suffix}"
        unique_phone = f"556{int(time.time() * 1000) % 10000000:07d}"

        patient_status, patient_body = request_json(
            "/patients",
            method="POST",
            token=self.admin_token,
            payload={
                "medical_record_number": f"EXP-TL-{unique_suffix}",
                "first_name": "TimelinePaciente",
                "last_name": unique_suffix,
                "primary_phone": unique_phone,
                "national_id": None,
                "tax_id": None,
                "email": None,
            },
        )
        self.assertEqual(patient_status, 201)
        self.assertIsInstance(patient_body, dict)

        dispatch_status, dispatch_body = request_json(
            "/communication-dispatches",
            method="POST",
            token=self.admin_token,
            payload={
                "patient_id": patient_body["id"],
                "doctor_id": 1,
                "channel": "whatsapp",
                "recipient_phone": unique_phone,
                "status": "sent",
                "rendered_message": f"Hola {unique_name}",
            },
        )
        self.assertEqual(dispatch_status, 201)
        self.assertIsInstance(dispatch_body, dict)

        list_status, listed_dispatches = request_json(
            f"/communication-dispatches?patient_id={patient_body['id']}&limit=10",
            token=self.doctor_token,
        )
        self.assertEqual(list_status, 200)
        self.assertIsInstance(listed_dispatches, list)
        self.assertTrue(listed_dispatches)

        matching_dispatch = next(
            dispatch for dispatch in listed_dispatches if dispatch["id"] == dispatch_body["id"]
        )
        self.assertEqual(matching_dispatch["patient_name"], unique_name)
        self.assertEqual(matching_dispatch["patient_medical_record_number"], f"EXP-TL-{unique_suffix}")
        self.assertEqual(matching_dispatch["doctor_name"], "Demo Doctor")
        self.assertEqual(matching_dispatch["rendered_message"], f"Hola {unique_name}")


if __name__ == "__main__":
    unittest.main()
