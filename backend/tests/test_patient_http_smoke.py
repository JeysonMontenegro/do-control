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


class PatientHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.doctor_token = login("doctor@docontrol.local", "Doctor123!")
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_doctor_can_create_and_update_patient(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_phone = f"557{int(time.time() * 1000) % 10000000:07d}"

        create_status, created_patient = request_json(
            "/patients",
            method="POST",
            token=self.doctor_token,
            payload={
                "medical_record_number": f"EXP-DR-{unique_suffix}",
                "first_name": "Paciente",
                "last_name": f"Doctor{unique_suffix}",
                "primary_phone": unique_phone,
                "national_id": f"DPI-{unique_suffix}",
                "tax_id": None,
                "email": None,
            },
        )
        self.assertEqual(create_status, 201)
        self.assertIsInstance(created_patient, dict)
        self.assertEqual(created_patient["first_name"], "Paciente")

        update_status, updated_patient = request_json(
            f"/patients/{created_patient['id']}",
            method="PATCH",
            token=self.doctor_token,
            payload={
                "first_name": "Paciente Editado",
                "primary_phone": f"558{int(time.time() * 1000) % 10000000:07d}",
                "notes": "Actualizado por doctor",
            },
        )
        self.assertEqual(update_status, 200)
        self.assertIsInstance(updated_patient, dict)
        self.assertEqual(updated_patient["first_name"], "Paciente Editado")
        self.assertEqual(updated_patient["notes"], "Actualizado por doctor")

    def test_admin_must_select_doctor_when_creating_patient(self) -> None:
        doctors_status, doctors_body = request_json("/doctors", token=self.admin_token)
        self.assertEqual(doctors_status, 200)
        self.assertIsInstance(doctors_body, list)
        self.assertTrue(doctors_body)
        doctor_id = doctors_body[0]["id"]

        unique_suffix = str(int(time.time() * 1000) % 10000000)
        unique_phone = f"559{int(time.time() * 1000) % 10000000:07d}"

        create_without_doctor_status, create_without_doctor_body = request_json(
            "/patients",
            method="POST",
            token=self.admin_token,
            payload={
                "medical_record_number": f"EXP-ADMIN-{unique_suffix}",
                "first_name": "Paciente",
                "last_name": f"Admin{unique_suffix}",
                "primary_phone": unique_phone,
            },
        )
        self.assertEqual(create_without_doctor_status, 409)
        self.assertEqual(create_without_doctor_body["detail"], "Debe seleccionar el doctor responsable del paciente.")

        create_with_doctor_status, create_with_doctor_body = request_json(
            "/patients",
            method="POST",
            token=self.admin_token,
            payload={
                "medical_record_number": f"EXP-ADMIN-OK-{unique_suffix}",
                "first_name": "Paciente",
                "last_name": f"AdminDoctor{unique_suffix}",
                "primary_phone": f"556{int(time.time() * 1000) % 10000000:07d}",
                "doctor_id": doctor_id,
            },
        )
        self.assertEqual(create_with_doctor_status, 201)
        self.assertIsInstance(create_with_doctor_body, dict)
        self.assertEqual(create_with_doctor_body["assigned_doctors"][0]["id"], doctor_id)


if __name__ == "__main__":
    unittest.main()
