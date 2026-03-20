import json
from datetime import datetime, timedelta, timezone
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


class StaffAssignmentHttpSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.admin_token = login("admin@docontrol.local", "ChangeMe123!")

    def test_admin_can_register_doctor_and_receptionist_with_scoped_agenda(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)

        doctor_status, doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Jeyson",
                "last_name": f"Montenegro{unique_suffix}",
                "gender": "male",
                "date_of_birth": "1988-05-10",
                "specialty": "Medicina general",
                "license_number": f"COL-{unique_suffix}",
                "primary_phone": f"401{int(unique_suffix) % 10000000:07d}",
                "user_email": f"dr.montenegro.{unique_suffix}@docontrol.local",
                "user_password": "DoctorNew123!",
                "clinics": [
                    {
                        "clinic_name": f"Clínica Centro {unique_suffix}",
                        "address": "Zona 10",
                        "phone_number": "55510000",
                        "notes": "Sede principal",
                        "is_primary": True,
                    }
                ],
            },
        )
        self.assertEqual(doctor_status, 201)
        self.assertEqual(doctor_body["date_of_birth"], "1988-05-10")
        self.assertEqual(len(doctor_body["clinics"]), 1)

        extra_doctor_status, extra_doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Otro",
                "last_name": f"Doctor{unique_suffix}",
                "gender": "male",
                "specialty": "Pediatría",
                "license_number": f"COL-EXTRA-{unique_suffix}",
                "primary_phone": f"406{int(unique_suffix) % 10000000:07d}",
                "user_email": f"otro.doctor.{unique_suffix}@docontrol.local",
                "user_password": "DoctorNew123!",
            },
        )
        self.assertEqual(extra_doctor_status, 201)

        receptionist_status, receptionist_body = request_json(
            "/receptionists",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Ana",
                "last_name": f"Recepcion{unique_suffix}",
                "gender": "female",
                "phone_number": f"402{int(unique_suffix) % 10000000:07d}",
                "email": f"recepcion.{unique_suffix}@docontrol.local",
                "password": "ReceptionNew123!",
                "doctor_ids": [doctor_body["id"]],
            },
        )
        self.assertEqual(receptionist_status, 201)
        self.assertEqual(len(receptionist_body["assigned_doctors"]), 1)

        doctor_update_status, doctor_update_body = request_json(
            f"/doctors/{doctor_body['id']}",
            method="PATCH",
            token=self.admin_token,
            payload={
                "specialty": "Medicina interna",
                "primary_phone": f"404{int(unique_suffix) % 10000000:07d}",
                "date_of_birth": "1988-06-11",
                "clinics": [
                    {
                        "clinic_name": f"Clínica Norte {unique_suffix}",
                        "address": "Zona 15",
                        "phone_number": "55520000",
                        "notes": "Horario vespertino",
                        "is_primary": True,
                    }
                ],
            },
        )
        self.assertEqual(doctor_update_status, 200)
        self.assertEqual(doctor_update_body["specialty"], "Medicina interna")
        self.assertEqual(doctor_update_body["date_of_birth"], "1988-06-11")
        self.assertEqual(doctor_update_body["clinics"][0]["clinic_name"], f"Clínica Norte {unique_suffix}")

        receptionist_update_status, receptionist_update_body = request_json(
            f"/receptionists/{receptionist_body['id']}",
            method="PATCH",
            token=self.admin_token,
            payload={
                "phone_number": f"405{int(unique_suffix) % 10000000:07d}",
                "doctor_ids": [doctor_body["id"], extra_doctor_body["id"]],
            },
        )
        self.assertEqual(receptionist_update_status, 200)
        self.assertEqual(len(receptionist_update_body["assigned_doctors"]), 2)

        blocked_doctor_status, blocked_doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Bloqueado",
                "last_name": f"Doctor{unique_suffix}",
                "gender": "male",
                "specialty": "Dermatología",
                "license_number": f"COL-BLOCK-{unique_suffix}",
                "primary_phone": f"407{int(unique_suffix) % 10000000:07d}",
                "user_email": f"bloqueado.doctor.{unique_suffix}@docontrol.local",
                "user_password": "DoctorNew123!",
            },
        )
        self.assertEqual(blocked_doctor_status, 201)

        doctor_token = login(doctor_body["linked_user_email"], "DoctorNew123!")
        receptionist_token = login(receptionist_body["email"], "ReceptionNew123!")

        doctor_list_status, doctor_list_body = request_json("/doctors", token=doctor_token)
        self.assertEqual(doctor_list_status, 200)
        self.assertEqual(len(doctor_list_body), 1)
        self.assertEqual(doctor_list_body[0]["id"], doctor_body["id"])

        receptionist_doctors_status, receptionist_doctors_body = request_json("/doctors", token=receptionist_token)
        self.assertEqual(receptionist_doctors_status, 200)
        self.assertEqual(len(receptionist_doctors_body), 2)

        visible_doctor_status, _visible_doctor_body = request_json(
            f"/doctors/{doctor_body['id']}",
            token=receptionist_token,
        )
        self.assertEqual(visible_doctor_status, 200)

        unscoped_patient_status, unscoped_patient_body = request_json(
            "/patients",
            method="POST",
            token=receptionist_token,
            payload={
                "medical_record_number": f"EXP-STAFF-{unique_suffix}",
                "first_name": "Paciente",
                "last_name": f"Scope{unique_suffix}",
                "primary_phone": f"403{int(unique_suffix) % 10000000:07d}",
                "national_id": None,
                "tax_id": None,
                "email": None,
            },
        )
        self.assertEqual(unscoped_patient_status, 409)
        self.assertIn("debe seleccionar el doctor", unscoped_patient_body["detail"].lower())

        patient_status, patient_body = request_json(
            "/patients",
            method="POST",
            token=receptionist_token,
            payload={
                "medical_record_number": f"EXP-STAFF-{unique_suffix}",
                "first_name": "Paciente",
                "last_name": f"Scope{unique_suffix}",
                "primary_phone": f"403{int(unique_suffix) % 10000000:07d}",
                "national_id": None,
                "tax_id": None,
                "email": None,
                "doctor_id": doctor_body["id"],
            },
        )
        self.assertEqual(patient_status, 201)

        patients_missing_scope_status, patients_missing_scope_body = request_json("/patients", token=receptionist_token)
        self.assertEqual(patients_missing_scope_status, 400)
        self.assertIn("debe seleccionar el doctor", patients_missing_scope_body["detail"].lower())

        scoped_patients_status, scoped_patients_body = request_json(
            f"/patients?doctor_id={doctor_body['id']}",
            token=receptionist_token,
        )
        self.assertEqual(scoped_patients_status, 200)
        self.assertEqual(len(scoped_patients_body), 1)
        self.assertEqual(scoped_patients_body[0]["id"], patient_body["id"])

        other_scope_status, other_scope_body = request_json(
            f"/patients?doctor_id={extra_doctor_body['id']}",
            token=receptionist_token,
        )
        self.assertEqual(other_scope_status, 200)
        self.assertNotIn(patient_body["id"], {patient["id"] for patient in other_scope_body})

        start_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=10)).isoformat()
        end_at = (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=10, minutes=30)).isoformat()
        allowed_status, _allowed_body = request_json(
            "/appointments",
            method="POST",
            token=receptionist_token,
            payload={
                "patient_id": patient_body["id"],
                "doctor_id": doctor_body["id"],
                "scheduled_start": start_at,
                "scheduled_end": end_at,
                "appointment_type": "follow_up",
                "reason": "Agenda recepcionista asignada",
                "source": "receptionist",
                "created_by": "staff-smoke",
            },
        )
        self.assertEqual(allowed_status, 201)

        blocked_status, blocked_body = request_json(
            "/appointments",
            method="POST",
            token=receptionist_token,
            payload={
                "patient_id": patient_body["id"],
                "doctor_id": blocked_doctor_body["id"],
                "scheduled_start": (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=11)).isoformat(),
                "scheduled_end": (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=11, minutes=30)).isoformat(),
                "appointment_type": "follow_up",
                "reason": "Intento fuera de scope",
                "source": "receptionist",
                "created_by": "staff-smoke",
            },
        )
        self.assertEqual(blocked_status, 400)
        self.assertIn("cannot create appointments", blocked_body["detail"].lower())

    def test_inactive_doctor_cannot_receive_new_appointments(self) -> None:
        unique_suffix = str(int(time.time() * 1000) % 10000000)

        doctor_status, doctor_body = request_json(
            "/doctors",
            method="POST",
            token=self.admin_token,
            payload={
                "first_name": "Inactivo",
                "last_name": f"Doctor{unique_suffix}",
                "gender": "male",
                "specialty": "Cardiología",
                "license_number": f"INACTIVE-{unique_suffix}",
                "primary_phone": f"601{int(unique_suffix) % 10000000:07d}",
                "user_email": f"inactivo.doctor.{unique_suffix}@docontrol.local",
                "user_password": "DoctorNew123!",
            },
        )
        self.assertEqual(doctor_status, 201)

        deactivate_status, deactivate_body = request_json(
            f"/doctors/{doctor_body['id']}",
            method="PATCH",
            token=self.admin_token,
            payload={"is_active": False},
        )
        self.assertEqual(deactivate_status, 200)
        self.assertFalse(deactivate_body["is_active"])

        patient_status, patient_body = request_json(
            "/patients",
            method="POST",
            token=self.admin_token,
            payload={
                "medical_record_number": f"EXP-INACTIVE-{unique_suffix}",
                "first_name": "Paciente",
                "last_name": f"Inactivo{unique_suffix}",
                "primary_phone": f"602{int(unique_suffix) % 10000000:07d}",
                "doctor_id": doctor_body["id"],
                "national_id": None,
                "tax_id": None,
                "email": None,
            },
        )
        self.assertEqual(patient_status, 201)

        blocked_status, blocked_body = request_json(
            "/appointments",
            method="POST",
            token=self.admin_token,
            payload={
                "patient_id": patient_body["id"],
                "doctor_id": doctor_body["id"],
                "scheduled_start": (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=13)).isoformat(),
                "scheduled_end": (datetime.now(timezone.utc).replace(second=0, microsecond=0) + timedelta(days=13, minutes=30)).isoformat(),
                "appointment_type": "follow_up",
                "reason": "Debe bloquear doctor inactivo",
                "source": "receptionist",
                "created_by": "staff-smoke",
            },
        )
        self.assertEqual(blocked_status, 400)
        self.assertIn("inactive doctor", blocked_body["detail"].lower())


if __name__ == "__main__":
    unittest.main()
