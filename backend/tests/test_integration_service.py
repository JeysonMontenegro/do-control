import unittest
from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from app.services.integration import IntegrationService
from app.schemas.integration import PatientMatchRequest
from app.services.errors import NotFoundError


class DummySession:
    def commit(self) -> None:
        return None


class IntegrationServiceMatchPatientTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())

    @patch("app.services.integration.create_audit_log")
    def test_returns_matched_for_single_high_confidence_name(
        self,
        _audit_log,
    ) -> None:
        self.service.patient_service = SimpleNamespace(
            list_patients=lambda query=None, accessible_doctor_ids=None, doctor_id=None: [
                SimpleNamespace(
                    id=3,
                    display_name=None,
                    first_name="Ana",
                    last_name="Lopez",
                    medical_record_number="EXP-000003",
                    primary_phone="55530000",
                    is_active=True,
                    created_at=datetime(2026, 3, 15, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 3, 16, tzinfo=timezone.utc),
                ),
                SimpleNamespace(
                    id=5,
                    display_name="Pedro Ruiz (padre)",
                    first_name="Pedro",
                    last_name="Ruiz",
                    medical_record_number="EXP-000005",
                    primary_phone="5599887766",
                    is_active=True,
                    created_at=datetime(2026, 3, 17, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 3, 18, tzinfo=timezone.utc),
                ),
            ]
        )

        result = self.service.match_patient(PatientMatchRequest(patient_name="Pedro Ruiz", phone_number=""))

        self.assertEqual(result.status, "matched")
        self.assertEqual(len(result.candidate_matches), 1)
        self.assertEqual(result.candidate_matches[0].patient_id, 5)
        self.assertEqual(result.candidate_matches[0].confidence, "high")
        self.assertEqual(result.candidate_matches[0].display_name, "Pedro Ruiz (padre)")
        self.assertEqual(result.candidate_matches[0].created_at, datetime(2026, 3, 17, tzinfo=timezone.utc))
        self.assertEqual(result.candidate_matches[0].updated_at, datetime(2026, 3, 18, tzinfo=timezone.utc))

    @patch("app.services.integration.create_audit_log")
    def test_returns_candidate_matches_for_partial_name_matches(
        self,
        _audit_log,
    ) -> None:
        self.service.patient_service = SimpleNamespace(
            list_patients=lambda query=None, accessible_doctor_ids=None, doctor_id=None: [
                SimpleNamespace(
                    id=3,
                    display_name="Ana María (mamá)",
                    first_name="Ana Maria",
                    last_name="Lopez Hernandez",
                    medical_record_number="EXP-000003",
                    primary_phone="55530000",
                    is_active=True,
                    created_at=datetime(2026, 3, 15, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 3, 16, tzinfo=timezone.utc),
                ),
                SimpleNamespace(
                    id=4,
                    display_name=None,
                    first_name="Maria",
                    last_name="Lopez",
                    medical_record_number="EXP-000004",
                    primary_phone="55540000",
                    is_active=True,
                    created_at=datetime(2026, 3, 17, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 3, 18, tzinfo=timezone.utc),
                ),
            ]
        )

        result = self.service.match_patient(PatientMatchRequest(patient_name="María", phone_number=""))

        self.assertEqual(result.status, "candidate_matches")
        self.assertEqual([candidate.patient_id for candidate in result.candidate_matches], [3, 4])
        self.assertTrue(all(candidate.confidence == "medium" for candidate in result.candidate_matches))

    @patch("app.services.integration.create_audit_log")
    def test_returns_no_match_when_name_is_not_relevant(
        self,
        _audit_log,
    ) -> None:
        self.service.patient_service = SimpleNamespace(
            list_patients=lambda query=None, accessible_doctor_ids=None, doctor_id=None: [
                SimpleNamespace(
                    id=1,
                    display_name=None,
                    first_name="Ana",
                    last_name="Lopez",
                    medical_record_number="EXP-000001",
                    primary_phone="55510000",
                    is_active=True,
                    created_at=datetime(2026, 3, 15, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 3, 16, tzinfo=timezone.utc),
                ),
                SimpleNamespace(
                    id=2,
                    display_name="Maria Perez (inactivo)",
                    first_name="Maria",
                    last_name="Perez",
                    medical_record_number="EXP-000002",
                    primary_phone="55520000",
                    is_active=False,
                    created_at=datetime(2026, 3, 17, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 3, 18, tzinfo=timezone.utc),
                ),
            ]
        )

        result = self.service.match_patient(PatientMatchRequest(patient_name="Pedro Ruiz", phone_number=""))

        self.assertEqual(result.status, "no_match")
        self.assertEqual(result.candidate_matches, [])

    @patch("app.services.integration.create_audit_log")
    def test_match_patient_applies_requester_doctor_scope(
        self,
        _audit_log,
    ) -> None:
        captured = {}

        def list_patients(*, query=None, accessible_doctor_ids=None, doctor_id=None):
            captured["query"] = query
            captured["accessible_doctor_ids"] = accessible_doctor_ids
            captured["doctor_id"] = doctor_id
            return []

        self.service.patient_service = SimpleNamespace(list_patients=list_patients)
        self.service._requester_accessible_doctor_ids = lambda _phone: {7}

        result = self.service.match_patient(
            PatientMatchRequest(
                patient_name="Pedro Ruiz",
                phone_number="55510000",
                requester_phone_number="50255510000",
            )
        )

        self.assertEqual(result.status, "no_match")
        self.assertEqual(captured["query"], "55510000")
        self.assertEqual(captured["accessible_doctor_ids"], {7})
        self.assertIsNone(captured["doctor_id"])


class IntegrationServiceVerifyUserByPhoneTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())

    def test_includes_doctor_profile_for_doctor_users(self) -> None:
        self.service.user_repository = SimpleNamespace(
            get_by_phone_number=lambda _phone: SimpleNamespace(
                id=5,
                first_name="Steve",
                last_name="Alay",
                phone_number="+502 3992-5713",
                is_active=True,
                roles=[SimpleNamespace(role=SimpleNamespace(name="doctor"))],
                doctor_profile=SimpleNamespace(
                    id=3,
                    first_name="Steve",
                    last_name="Alay",
                    specialty=None,
                    license_number=None,
                    gender="M",
                    phone_numbers=[
                        SimpleNamespace(phone_number="+502 3992-5713", is_primary=True, is_active=True),
                    ],
                ),
            )
        )

        result = self.service.verify_user_by_phone("50239925713")

        self.assertTrue(result.is_valid)
        self.assertEqual(result.role, "doctor")
        self.assertEqual(result.user_id, 5)
        self.assertEqual(result.phone_number, "50239925713")
        self.assertIsNotNone(result.doctor_profile)
        assert result.doctor_profile is not None
        self.assertEqual(result.doctor_profile.doctor_id, 3)
        self.assertEqual(result.doctor_profile.full_name, "Steve Alay")
        self.assertEqual(result.doctor_profile.gender, "M")
        self.assertEqual(result.doctor_profile.primary_phone, "50239925713")

    def test_omits_doctor_profile_for_non_doctor_users(self) -> None:
        self.service.user_repository = SimpleNamespace(
            get_by_phone_number=lambda _phone: SimpleNamespace(
                id=1,
                first_name="Jeyson",
                last_name="Montenegro",
                phone_number="50258420737",
                is_active=True,
                roles=[SimpleNamespace(role=SimpleNamespace(name="admin"))],
                doctor_profile=None,
            )
        )

        result = self.service.verify_user_by_phone("50258420737")

        self.assertTrue(result.is_valid)
        self.assertEqual(result.role, "admin")
        self.assertIsNone(result.doctor_profile)

    def test_returns_invalid_for_missing_user(self) -> None:
        self.service.user_repository = SimpleNamespace(get_by_phone_number=lambda _phone: None)

        result = self.service.verify_user_by_phone("55550007")

        self.assertFalse(result.is_valid)
        self.assertEqual(result.phone_number, "55550007")
        self.assertEqual(result.permissions, [])


class IntegrationServicePendingAppointmentsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())

    def test_returns_pending_appointments_list_with_doctor_and_clinic_details(self) -> None:
        first_appointment = SimpleNamespace(
            id=11,
            public_id="pub-11",
            doctor_id=3,
            patient_id=9,
            scheduled_start="2026-04-01T15:00:00Z",
            scheduled_end="2026-04-01T15:30:00Z",
            status="scheduled",
            confirmation_status="pending",
            doctor=SimpleNamespace(
                first_name="Steve",
                last_name="Alay",
                specialty="Medicina general",
                clinics=[
                    SimpleNamespace(
                        clinic_name="Clínica Norte",
                        address="Zona 15, Ciudad de Guatemala",
                        is_primary=True,
                    )
                ],
            ),
        )
        second_appointment = SimpleNamespace(
            id=12,
            public_id="pub-12",
            doctor_id=3,
            patient_id=9,
            scheduled_start="2026-04-02T16:00:00Z",
            scheduled_end="2026-04-02T16:45:00Z",
            status="scheduled",
            confirmation_status="confirmed",
            doctor=SimpleNamespace(
                first_name="Steve",
                last_name="Alay",
                specialty="Medicina general",
                clinics=[
                    SimpleNamespace(
                        clinic_name="Clínica Norte",
                        address="Zona 15, Ciudad de Guatemala",
                        is_primary=True,
                    )
                ],
            ),
        )
        self.service.appointment_service = SimpleNamespace(
            get_pending_for_patient=lambda _patient_id: [first_appointment, second_appointment]
        )

        result = self.service.get_pending_appointment(9)

        self.assertEqual(len(result.appointments), 2)
        self.assertEqual(result.appointments[0].appointment_id, 11)
        self.assertEqual(result.appointments[0].doctor_name, "Steve Alay")
        self.assertEqual(result.appointments[0].doctor_specialty, "Medicina general")
        self.assertEqual(result.appointments[0].clinic_name, "Clínica Norte")
        self.assertEqual(result.appointments[0].clinic_address, "Zona 15, Ciudad de Guatemala")
        self.assertEqual(result.appointments[0].confirmation_status, "pending")
        self.assertEqual(result.appointments[1].scheduled_end, datetime(2026, 4, 2, 16, 45, tzinfo=timezone.utc))

    def test_returns_empty_list_when_patient_has_no_pending_appointments(self) -> None:
        self.service.appointment_service = SimpleNamespace(get_pending_for_patient=lambda _patient_id: [])

        result = self.service.get_pending_appointment(9)

        self.assertEqual(result.appointments, [])

    def test_pending_appointments_applies_requester_doctor_scope(self) -> None:
        first_appointment = SimpleNamespace(
            id=11,
            public_id="pub-11",
            doctor_id=3,
            patient_id=9,
            scheduled_start=datetime(2026, 4, 1, 15, 0, tzinfo=timezone.utc),
            scheduled_end=datetime(2026, 4, 1, 15, 30, tzinfo=timezone.utc),
            status="scheduled",
            confirmation_status="pending",
            doctor=SimpleNamespace(first_name="Steve", last_name="Alay", specialty="Medicina general", clinics=[]),
        )
        second_appointment = SimpleNamespace(
            id=12,
            public_id="pub-12",
            doctor_id=8,
            patient_id=9,
            scheduled_start=datetime(2026, 4, 2, 16, 0, tzinfo=timezone.utc),
            scheduled_end=datetime(2026, 4, 2, 16, 45, tzinfo=timezone.utc),
            status="scheduled",
            confirmation_status="confirmed",
            doctor=SimpleNamespace(first_name="Otro", last_name="Doctor", specialty="Pediatría", clinics=[]),
        )
        self.service.appointment_service = SimpleNamespace(
            get_pending_for_patient=lambda _patient_id: [first_appointment, second_appointment]
        )
        self.service._requester_accessible_doctor_ids = lambda _phone: {3}

        result = self.service.get_pending_appointment(9, requester_phone_number="50255510000")

        self.assertEqual(len(result.appointments), 1)
        self.assertEqual(result.appointments[0].appointment_id, 11)

    def test_raises_when_patient_does_not_exist(self) -> None:
        self.service.appointment_service = SimpleNamespace(
            get_pending_for_patient=lambda _patient_id: (_ for _ in ()).throw(NotFoundError("Patient not found."))
        )

        with self.assertRaises(NotFoundError):
            self.service.get_pending_appointment(999)


class IntegrationServiceProposedAppointmentsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())
        self.payload = SimpleNamespace(
            patient_name="Edward Gomez",
            phone_number="50252827538",
            patient_id=29,
            requester_phone_number=None,
            doctor_id=3,
            doctor_phone_number=None,
            doctor_name=None,
            scheduled_start=datetime(2026, 4, 1, 15, 0, tzinfo=timezone.utc),
            scheduled_end=datetime(2026, 4, 1, 15, 30, tzinfo=timezone.utc),
            appointment_type="follow_up",
            reason="Control",
            source="integration",
            create_patient_if_missing=False,
        )

    @patch("app.services.integration.create_audit_log")
    def test_uses_explicit_patient_id_without_matching(self, _audit_log) -> None:
        doctor = SimpleNamespace(id=3)
        appointment = SimpleNamespace(id=77, public_id="pub-77")
        self.service._resolve_doctor = lambda _payload: doctor
        self.service.patient_service = SimpleNamespace(
            get_patient=lambda patient_id: SimpleNamespace(id=patient_id)
        )
        self.service.match_patient = lambda _payload: (_ for _ in ()).throw(AssertionError("match_patient should not be called"))
        self.service.appointment_service = SimpleNamespace(
            repository=SimpleNamespace(find_overlap=lambda *_args, **_kwargs: None),
            create_appointment=lambda appointment_payload: appointment,
        )

        result = self.service.create_proposed_appointment(self.payload)

        self.assertEqual(result.status, "created")
        self.assertEqual(result.patient_id, 29)
        self.assertEqual(result.appointment_id, 77)

    @patch("app.services.integration.create_audit_log")
    def test_returns_available_patients_when_duplicate_candidates_exist(self, _audit_log) -> None:
        doctor = SimpleNamespace(id=3)
        review_items: list[dict] = []
        self.service._resolve_doctor = lambda _payload: doctor
        self.service.appointment_review_item_service = SimpleNamespace(
            create_item=lambda **kwargs: review_items.append(kwargs)
        )
        self.service.match_patient = lambda _payload: SimpleNamespace(
            status="candidate_matches",
            candidate_matches=[
                SimpleNamespace(
                    patient_id=29,
                    patient_name="Edward Gomez",
                    display_name="Edward Gomez (padre)",
                    medical_record_number="EXP-000029",
                    primary_phone="50252827538",
                    created_at=datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 3, 18, 23, 0, tzinfo=timezone.utc),
                ),
                SimpleNamespace(
                    patient_id=41,
                    patient_name="Edward Gomez",
                    display_name="Edward Gomez (hijo)",
                    medical_record_number="EXP-000041",
                    primary_phone="50252827538",
                    created_at=datetime(2026, 3, 18, 10, 0, tzinfo=timezone.utc),
                    updated_at=datetime(2026, 3, 18, 10, 0, tzinfo=timezone.utc),
                ),
            ],
        )
        duplicate_payload = SimpleNamespace(**{**self.payload.__dict__, "patient_id": None})

        result = self.service.create_proposed_appointment(duplicate_payload)

        self.assertEqual(result.status, "needs_manual_review")
        self.assertEqual(result.doctor_id, 3)
        self.assertEqual(len(result.available_patients), 2)
        self.assertEqual(result.available_patients[0].patient_id, 29)
        self.assertEqual(result.available_patients[0].display_name, "Edward Gomez (padre)")
        self.assertEqual(result.available_patients[0].medical_record_number, "EXP-000029")
        self.assertEqual(result.available_patients[0].updated_at, datetime(2026, 3, 18, 23, 0, tzinfo=timezone.utc))
        self.assertEqual(len(review_items), 1)


class IntegrationServicePatientDeactivationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())

    def test_returns_deactivated_status(self) -> None:
        self.service.patient_service = SimpleNamespace(
            get_patient=lambda patient_id, accessible_doctor_ids=None, doctor_id=None: SimpleNamespace(id=patient_id),
            deactivate_patient=lambda patient_id: SimpleNamespace(id=patient_id)
        )

        result = self.service.deactivate_patient(29)

        self.assertEqual(result.status, "deactivated")
        self.assertEqual(result.patient_id, 29)

    def test_deactivate_patient_rejects_requester_outside_scope(self) -> None:
        self.service._get_patient_for_requester = lambda _patient_id, _phone: (_ for _ in ()).throw(NotFoundError("Patient not found."))

        with self.assertRaises(NotFoundError):
            self.service.deactivate_patient(29, requester_phone_number="50255510000")


class IntegrationServiceRequesterScopeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = IntegrationService(DummySession())

    def test_create_patient_passes_requester_scope_to_patient_service(self) -> None:
        captured = {}

        def create_patient(payload, *, accessible_doctor_ids=None):
            captured["doctor_id"] = payload.doctor_id
            captured["accessible_doctor_ids"] = accessible_doctor_ids
            return SimpleNamespace(
                id=7,
                medical_record_number="EXP-000007",
                first_name=payload.first_name,
                last_name=payload.last_name,
                display_name=payload.display_name,
                primary_phone=payload.primary_phone,
            )

        self.service.patient_service = SimpleNamespace(
            split_full_name=lambda full_name: ("Pedro", "Ruiz"),
            create_patient=create_patient,
        )
        self.service._assert_requester_can_access_doctor = lambda doctor_id, requester_phone_number: {doctor_id}

        result = self.service.create_patient(
            SimpleNamespace(
                full_name="Pedro Ruiz",
                first_name=None,
                last_name=None,
                display_name="Pedro Ruiz (padre)",
                primary_phone="50255510000",
                doctor_id=3,
                requester_phone_number="50250000000",
            )
        )

        self.assertEqual(result.id, 7)
        self.assertEqual(captured["doctor_id"], 3)
        self.assertEqual(captured["accessible_doctor_ids"], {3})

    def test_update_patient_phone_validates_requester_scope(self) -> None:
        called = {}
        self.service._get_patient_for_requester = lambda patient_id, requester_phone_number: called.setdefault(
            "args", (patient_id, requester_phone_number)
        ) or SimpleNamespace(id=patient_id)
        self.service.patient_service = SimpleNamespace(
            update_primary_phone_with_history=lambda patient_id, phone_number: (
                SimpleNamespace(id=patient_id, primary_phone=phone_number),
                "50211111111",
            )
        )

        result = self.service.update_patient_phone(
            29,
            SimpleNamespace(phone_number="50222222222", requester_phone_number="50250000000"),
        )

        self.assertEqual(called["args"], (29, "50250000000"))
        self.assertEqual(result.primary_phone, "50222222222")

    def test_list_schedule_rejects_requester_outside_scope(self) -> None:
        self.service._assert_requester_can_access_doctor = lambda doctor_id, requester_phone_number: (_ for _ in ()).throw(
            NotFoundError("Doctor not found.")
        )

        with self.assertRaises(NotFoundError):
            self.service.list_schedule(3, date(2026, 4, 7), requester_phone_number="50250000000")


if __name__ == "__main__":
    unittest.main()
