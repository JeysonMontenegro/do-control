from datetime import date
import unicodedata

from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.repositories.communication_template import CommunicationTemplateRepository
from app.schemas.appointment import AppointmentCreate
from app.schemas.communication_dispatch import CommunicationDispatchUpdate
from app.schemas.encounter import DiagnosisCreate, EncounterCreate, ExamOrderCreate
from app.schemas.integration import (
    AppointmentActionResponse,
    AppointmentCancelRequest,
    AppointmentCancelResponse,
    AppointmentRescheduleRequest,
    AppointmentRescheduleResponse,
    CommunicationDispatchStatusUpdate,
    DoctorMatchCandidate,
    DoctorMatchRequest,
    DoctorMatchResponse,
    DoctorScheduleAppointmentRead,
    DoctorVerificationRead,
    IntegrationDoctorProfileRead,
    IntegrationUserVerificationRead,
    IntegrationEncounterCreateRequest,
    IntegrationEncounterCreateResponse,
    IntegrationPatientCreateRequest,
    IntegrationPatientCreateResponse,
    IntegrationPatientPhoneUpdateRequest,
    IntegrationPatientPhoneUpdateResponse,
    PatientMatchCandidate,
    PatientMatchRequest,
    PatientMatchResponse,
    PendingAppointmentRead,
    PendingCommunicationDispatchRead,
    ProposedAppointmentRequest,
    ProposedAppointmentResponse,
)
from app.schemas.patient import PatientCreate
from app.repositories.user import UserRepository
from app.services.appointment import AppointmentService
from app.services.appointment_review_item import AppointmentReviewItemService
from app.services.audit import create_audit_log
from app.services.communication_dispatch import CommunicationDispatchService
from app.services.doctor import DoctorService
from app.services.encounter import EncounterService
from app.services.errors import ConflictError, NotFoundError, ValidationError
from app.services.patient import PatientService
from app.services.phone_number import normalize_phone_number
from app.services.doctor_scope import scoped_doctor_ids_for_user


class IntegrationService:
    ROLE_PERMISSION_MAP = {
        "admin": [
            "manage_doctors",
            "manage_staff",
            "manage_patients",
            "manage_appointments",
            "view_services",
            "manage_settings",
        ],
        "doctor": [
            "manage_patients",
            "manage_appointments",
            "manage_encounters",
            "send_reminders",
        ],
        "receptionist": [
            "manage_patients",
            "manage_appointments",
        ],
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        self.patient_service = PatientService(db)
        self.appointment_service = AppointmentService(db)
        self.appointment_review_item_service = AppointmentReviewItemService(db)
        self.communication_dispatch_service = CommunicationDispatchService(db)
        self.communication_template_repository = CommunicationTemplateRepository(db)
        self.doctor_service = DoctorService(db)
        self.encounter_service = EncounterService(db)
        self.user_repository = UserRepository(db)

    @staticmethod
    def _appointment_public_fields(appointment) -> dict[str, str | None]:
        if appointment is None or not getattr(appointment, "public_id", None):
            return {
                "appointment_public_id": None,
                "appointment_public_url": None,
            }
        return {
            "appointment_public_id": appointment.public_id,
            "appointment_public_url": AppointmentService.public_url(appointment.public_id),
        }

    @staticmethod
    def _primary_role(role_names: set[str]) -> str | None:
        for role_name in ("admin", "doctor", "receptionist"):
            if role_name in role_names:
                return role_name
        return next(iter(sorted(role_names)), None)

    @staticmethod
    def _build_doctor_profile(doctor: Doctor | None) -> IntegrationDoctorProfileRead | None:
        if doctor is None:
            return None

        primary_phone = next(
            (phone.phone_number for phone in doctor.phone_numbers if phone.is_primary and phone.is_active),
            None,
        )
        return IntegrationDoctorProfileRead(
            doctor_id=doctor.id,
            full_name=f"{doctor.first_name} {doctor.last_name}".strip(),
            specialty=doctor.specialty,
            license_number=doctor.license_number,
            gender=doctor.gender,
            primary_phone=normalize_phone_number(primary_phone),
        )

    def verify_user_by_phone(self, phone_number: str) -> IntegrationUserVerificationRead:
        user = self.user_repository.get_by_phone_number(phone_number)
        if user is None or not user.is_active:
            return IntegrationUserVerificationRead(
                is_valid=False,
                phone_number=phone_number,
                permissions=[],
            )

        role_names = {user_role.role.name for user_role in user.roles}
        primary_role = self._primary_role(role_names)
        permissions: set[str] = set()
        for role_name in role_names:
            permissions.update(self.ROLE_PERMISSION_MAP.get(role_name, []))

        primary_phone_number = getattr(user, "primary_phone_number", None) or getattr(user, "phone_number", None)
        return IntegrationUserVerificationRead(
            is_valid=True,
            user_id=user.id,
            role=primary_role,
            roles=sorted(role_names),
            user_name=f"{user.first_name} {user.last_name}".strip(),
            phone_number=normalize_phone_number(primary_phone_number),
            is_active=user.is_active,
            permissions=sorted(permissions),
            doctor_profile=self._build_doctor_profile(user.doctor_profile) if "doctor" in role_names else None,
        )

    def verify_doctor(self, doctor_id: int) -> DoctorVerificationRead:
        doctor = self.doctor_service.get_doctor(doctor_id)
        primary_phone = next(
            (phone.phone_number for phone in doctor.phone_numbers if phone.is_primary and phone.is_active),
            None,
        )
        return DoctorVerificationRead(
            id=doctor.id,
            full_name=f"{doctor.first_name} {doctor.last_name}".strip(),
            specialty=doctor.specialty,
            license_number=doctor.license_number,
            is_active=doctor.is_active,
            primary_phone=primary_phone,
        )

    @staticmethod
    def _normalize_name(value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value)
        ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
        return " ".join(ascii_only.lower().split())

    def _patient_name_confidence(self, requested_name: str, patient_name: str) -> str | None:
        normalized_requested = self._normalize_name(requested_name)
        normalized_patient = self._normalize_name(patient_name)
        if not normalized_requested or not normalized_patient:
            return None
        if normalized_requested == normalized_patient:
            return "high"

        requested_tokens = normalized_requested.split()
        patient_tokens = normalized_patient.split()
        if all(
            any(requested_token in patient_token for patient_token in patient_tokens)
            for requested_token in requested_tokens
        ):
            return "medium"
        return None

    def match_patient(self, payload: PatientMatchRequest) -> PatientMatchResponse:
        results = self.patient_service.list_patients(query=payload.phone_number.strip() or None)
        candidates = []
        requested_name = payload.patient_name.strip()
        for patient in results:
            patient_name = f"{patient.first_name} {patient.last_name}".strip()
            confidence = self._patient_name_confidence(requested_name, patient_name)
            if confidence is None:
                continue
            candidates.append(
                PatientMatchCandidate(
                    patient_id=patient.id,
                    medical_record_number=patient.medical_record_number,
                    patient_name=patient_name,
                    primary_phone=patient.primary_phone,
                    confidence=confidence,
                )
            )

        high_confidence_candidates = [candidate for candidate in candidates if candidate.confidence == "high"]

        if not candidates:
            status = "no_match"
        elif len(high_confidence_candidates) == 1:
            status = "matched"
            candidates = high_confidence_candidates
        else:
            status = "candidate_matches"

        create_audit_log(
            self.db,
            action="integration_patient_match",
            entity_type="integration",
            entity_id=payload.phone_number,
            after_data={"status": status, "candidate_count": len(candidates)},
        )
        self.db.commit()
        return PatientMatchResponse(status=status, candidate_matches=candidates)

    def create_patient(self, payload: IntegrationPatientCreateRequest) -> IntegrationPatientCreateResponse:
        if payload.full_name:
            first_name, last_name = self.patient_service.split_full_name(payload.full_name)
        else:
            first_name = payload.first_name or ""
            last_name = payload.last_name or ""

        patient = self.patient_service.create_patient(
            PatientCreate(
                first_name=first_name,
                last_name=last_name,
                primary_phone=payload.primary_phone,
                doctor_id=payload.doctor_id,
            )
        )
        return IntegrationPatientCreateResponse(
            id=patient.id,
            medical_record_number=patient.medical_record_number,
            patient_name=f"{patient.first_name} {patient.last_name}".strip(),
            primary_phone=patient.primary_phone,
        )

    def update_patient_phone(
        self,
        patient_id: int,
        payload: IntegrationPatientPhoneUpdateRequest,
    ) -> IntegrationPatientPhoneUpdateResponse:
        patient, previous_phone = self.patient_service.update_primary_phone_with_history(patient_id, payload.phone_number)
        return IntegrationPatientPhoneUpdateResponse(
            status="updated",
            patient_id=patient.id,
            primary_phone=patient.primary_phone,
            previous_phone=previous_phone,
        )

    def match_doctor(self, payload: DoctorMatchRequest) -> DoctorMatchResponse:
        results = self.doctor_service.list_doctors(query=payload.phone_number)
        candidates = []
        requested_name = payload.doctor_name.strip().lower() if payload.doctor_name else None
        for doctor in results:
            doctor_name = f"{doctor.first_name} {doctor.last_name}".strip()
            confidence = "high" if requested_name is None or doctor_name.lower() == requested_name else "medium"
            primary_phone = next(
                (
                    phone.phone_number
                    for phone in doctor.phone_numbers
                    if phone.is_primary and phone.is_active
                ),
                None,
            )
            candidates.append(
                DoctorMatchCandidate(
                    doctor_id=doctor.id,
                    doctor_name=doctor_name,
                    license_number=doctor.license_number,
                    specialty=doctor.specialty,
                    primary_phone=primary_phone,
                    confidence=confidence,
                )
            )

        if not candidates:
            status = "no_match"
        elif len(candidates) == 1:
            status = "matched"
        else:
            status = "candidate_matches"

        create_audit_log(
            self.db,
            action="integration_doctor_match",
            entity_type="integration",
            entity_id=payload.phone_number,
            after_data={"status": status, "candidate_count": len(candidates)},
        )
        self.db.commit()
        return DoctorMatchResponse(status=status, candidate_matches=candidates)

    def _requester_accessible_doctor_ids(self, requester_phone_number: str | None) -> set[int] | None:
        if not requester_phone_number:
            return None

        requester = self.user_repository.get_by_phone_number(requester_phone_number)
        if requester is None:
            return None
        return scoped_doctor_ids_for_user(requester)

    def _requester_accessible_doctors(self, requester_phone_number: str | None) -> list[Doctor] | None:
        accessible_doctor_ids = self._requester_accessible_doctor_ids(requester_phone_number)
        if accessible_doctor_ids is None:
            return None
        if not accessible_doctor_ids:
            return []
        doctors = [
            self.doctor_service.get_doctor(doctor_id)
            for doctor_id in sorted(accessible_doctor_ids)
        ]
        return doctors

    def _resolve_doctor(self, payload: ProposedAppointmentRequest) -> Doctor:
        accessible_doctor_ids = self._requester_accessible_doctor_ids(payload.requester_phone_number)

        if payload.doctor_id is not None:
            if accessible_doctor_ids is not None and payload.doctor_id not in accessible_doctor_ids:
                raise ValidationError("El solicitante no puede agendar para ese doctor.")
            return self.doctor_service.get_doctor(payload.doctor_id)

        if not payload.doctor_phone_number:
            if accessible_doctor_ids is None:
                raise ValidationError("Debe indicar doctor_id o doctor_phone_number.")
            if len(accessible_doctor_ids) == 1:
                return self.doctor_service.get_doctor(next(iter(accessible_doctor_ids)))
            if len(accessible_doctor_ids) > 1:
                raise ValidationError("El solicitante puede agendar para varios doctores y debe especificar cuál usar.")
            raise ValidationError("El solicitante no está vinculado a ningún doctor.")

        match = self.match_doctor(
            DoctorMatchRequest(
                doctor_name=payload.doctor_name,
                phone_number=payload.doctor_phone_number,
            )
        )
        if match.status == "matched":
            doctor_id = match.candidate_matches[0].doctor_id
            if accessible_doctor_ids is not None and doctor_id not in accessible_doctor_ids:
                raise ValidationError("El solicitante no puede agendar para ese doctor.")
            return self.doctor_service.get_doctor(doctor_id)
        if match.status == "candidate_matches":
            candidates = match.candidate_matches
            if accessible_doctor_ids is not None:
                candidates = [candidate for candidate in candidates if candidate.doctor_id in accessible_doctor_ids]
                if len(candidates) == 1:
                    return self.doctor_service.get_doctor(candidates[0].doctor_id)
            raise ValidationError("Se encontraron varios doctores para el número proporcionado.")
        raise ValidationError("No se encontró un doctor para el número proporcionado.")

    def create_proposed_appointment(self, payload: ProposedAppointmentRequest) -> ProposedAppointmentResponse:
        def create_review_item(*, review_reason: str, review_message: str, doctor_id: int | None = None, existing_appointment_id: int | None = None) -> None:
            self.appointment_review_item_service.create_item(
                patient_name=payload.patient_name,
                phone_number=payload.phone_number,
                doctor_id=doctor_id,
                doctor_name=payload.doctor_name,
                doctor_phone_number=payload.doctor_phone_number,
                scheduled_start=payload.scheduled_start,
                scheduled_end=payload.scheduled_end,
                appointment_type=payload.appointment_type,
                reason=payload.reason,
                source=payload.source,
                review_reason=review_reason,
                review_message=review_message,
                existing_appointment_id=existing_appointment_id,
            )

        accessible_doctors = self._requester_accessible_doctors(payload.requester_phone_number)
        if (
            payload.doctor_id is None
            and not payload.doctor_phone_number
            and accessible_doctors is not None
            and len(accessible_doctors) > 1
        ):
            review_message = "Debe especificar el doctor. Contacte a su administrador."
            create_review_item(review_reason="doctor_resolution", review_message=review_message)
            return ProposedAppointmentResponse(
                status="needs_manual_review",
                message=review_message,
            )

        try:
            doctor = self._resolve_doctor(payload)
        except (NotFoundError, ValidationError) as exc:
            create_review_item(review_reason="doctor_resolution", review_message=str(exc))
            return ProposedAppointmentResponse(status="needs_manual_review", message=str(exc))

        match = self.match_patient(
            PatientMatchRequest(patient_name=payload.patient_name, phone_number=payload.phone_number)
        )

        patient_id: int | None = None
        if match.status == "matched":
            patient_id = match.candidate_matches[0].patient_id
        elif match.status == "candidate_matches":
            review_message = "Multiple patient candidates found for the provided phone number."
            create_review_item(review_reason="patient_resolution", review_message=review_message, doctor_id=doctor.id)
            return ProposedAppointmentResponse(
                status="needs_manual_review",
                doctor_id=doctor.id,
                message=review_message,
            )
        elif payload.create_patient_if_missing:
            first_name, last_name = self.patient_service.split_full_name(payload.patient_name)
            patient = self.patient_service.create_patient(
                PatientCreate(
                    first_name=first_name,
                    last_name=last_name,
                    primary_phone=payload.phone_number,
                    doctor_id=doctor.id,
                )
            )
            patient_id = patient.id
        else:
            review_message = "No patient match found and automatic creation is disabled."
            create_review_item(review_reason="patient_missing", review_message=review_message, doctor_id=doctor.id)
            return ProposedAppointmentResponse(
                status="no_match",
                doctor_id=doctor.id,
                message=review_message,
            )

        overlap = self.appointment_service.repository.find_overlap(
            doctor.id,
            payload.scheduled_start,
            payload.scheduled_end,
        )
        if overlap is not None:
            review_message = "Doctor already has an appointment in that time range."
            create_review_item(
                review_reason="schedule_conflict",
                review_message=review_message,
                doctor_id=doctor.id,
                existing_appointment_id=overlap.id,
            )
            return ProposedAppointmentResponse(
                status="conflict",
                patient_id=patient_id,
                doctor_id=doctor.id,
                existing_appointment_id=overlap.id,
                **self._appointment_public_fields(overlap),
                message=review_message,
            )

        try:
            appointment = self.appointment_service.create_appointment(
                AppointmentCreate(
                    patient_id=patient_id,
                    doctor_id=doctor.id,
                    scheduled_start=payload.scheduled_start,
                    scheduled_end=payload.scheduled_end,
                    appointment_type=payload.appointment_type,
                    reason=payload.reason,
                    source=payload.source,
                    created_by="appoint-me",
                )
            )
        except (ConflictError, ValidationError) as exc:
            create_review_item(review_reason="validation_rejected", review_message=str(exc), doctor_id=doctor.id)
            return ProposedAppointmentResponse(
                status="rejected",
                patient_id=patient_id,
                doctor_id=doctor.id,
                message=str(exc),
            )

        create_audit_log(
            self.db,
            action="integration_proposed_appointment",
            entity_type="appointment",
            entity_id=str(appointment.id),
            after_data={"patient_id": patient_id, "doctor_id": doctor.id},
        )
        self.db.commit()
        return ProposedAppointmentResponse(
            status="created",
            patient_id=patient_id,
            appointment_id=appointment.id,
            **self._appointment_public_fields(appointment),
            doctor_id=doctor.id,
            message="Appointment created.",
        )

    def confirm_appointment(self, appointment_id: int) -> AppointmentActionResponse:
        appointment = self.appointment_service.confirm_appointment(appointment_id, changed_by="appoint-me")
        return AppointmentActionResponse(
            status="confirmed",
            appointment_id=appointment.id,
            **self._appointment_public_fields(appointment),
        )

    def cancel_appointment(self, payload: AppointmentCancelRequest) -> AppointmentCancelResponse:
        try:
            appointment = self.appointment_service.cancel_for_doctor_patient_name(
                payload.doctor_id,
                payload.patient_name,
                target_date=payload.date,
                changed_by="appoint-me",
            )
        except NotFoundError:
            return AppointmentCancelResponse(status="not_found")

        return AppointmentCancelResponse(
            status="cancelled",
            appointment_id=appointment.id,
            **self._appointment_public_fields(appointment),
            patient_name=appointment.patient_name,
            scheduled_start=appointment.scheduled_start,
        )

    def request_reschedule(self, payload: AppointmentRescheduleRequest) -> AppointmentRescheduleResponse:
        try:
            appointment = self.appointment_service.find_for_doctor_patient_name(
                payload.doctor_id,
                payload.patient_name,
                target_date=payload.date,
            )
        except NotFoundError:
            return AppointmentRescheduleResponse(status="not_found")

        requested_start = payload.requested_start or appointment.scheduled_start
        requested_end = payload.requested_end or appointment.scheduled_end
        note = payload.note or "Paciente solicitó reagendar desde WhatsApp."
        patient_name = (
            f"{appointment.patient.first_name} {appointment.patient.last_name}".strip()
            if appointment.patient is not None
            else payload.patient_name
        )
        review_item = self.appointment_review_item_service.create_item(
            patient_name=patient_name,
            phone_number=appointment.patient.primary_phone,
            doctor_id=appointment.doctor_id,
            doctor_name=f"{appointment.doctor.first_name} {appointment.doctor.last_name}".strip() if appointment.doctor else None,
            doctor_phone_number=None,
            scheduled_start=requested_start,
            scheduled_end=requested_end,
            appointment_type=appointment.appointment_type,
            reason=appointment.reason,
            source="appoint-me",
            review_reason="reschedule_request",
            review_message=note,
            existing_appointment_id=appointment.id,
        )
        create_audit_log(
            self.db,
            action="integration_reschedule_request",
            entity_type="appointment",
            entity_id=str(appointment.id),
            after_data={
                "review_item_id": review_item.id,
                "requested_start": requested_start.isoformat(),
                "requested_end": requested_end.isoformat(),
            },
        )
        self.db.commit()
        return AppointmentRescheduleResponse(
            status="pending_review",
            appointment_id=appointment.id,
            **self._appointment_public_fields(appointment),
            review_item_id=review_item.id,
            patient_name=patient_name,
            current_scheduled_start=appointment.scheduled_start,
            requested_start=requested_start,
            requested_end=requested_end,
        )

    def list_schedule(self, doctor_id: int, target_date: date) -> list[DoctorScheduleAppointmentRead]:
        appointments = self.appointment_service.list_schedule_for_doctor_date(doctor_id, target_date)
        return [
            DoctorScheduleAppointmentRead(
                appointment_id=appointment.id,
                **self._appointment_public_fields(appointment),
                patient_name=f"{appointment.patient.first_name} {appointment.patient.last_name}".strip(),
                scheduled_start=appointment.scheduled_start,
                scheduled_end=appointment.scheduled_end,
                reason=appointment.reason,
                status=appointment.status,
                confirmation_status=appointment.confirmation_status,
            )
            for appointment in appointments
        ]

    def get_pending_appointment(self, patient_id: int) -> PendingAppointmentRead | None:
        try:
            appointment = self.appointment_service.get_pending_for_patient(patient_id)
        except NotFoundError:
            return None
        return PendingAppointmentRead(
            appointment_id=appointment.id,
            **self._appointment_public_fields(appointment),
            doctor_id=appointment.doctor_id,
            patient_id=appointment.patient_id,
            scheduled_start=appointment.scheduled_start,
            status=appointment.status,
        )

    def create_encounter(self, payload: IntegrationEncounterCreateRequest) -> IntegrationEncounterCreateResponse:
        encounter = self.encounter_service.create_encounter(
            EncounterCreate(
                patient_id=payload.patient_id,
                doctor_id=payload.doctor_id,
                appointment_id=payload.appointment_id,
                encounter_date=payload.encounter_date,
                encounter_type=payload.encounter_type,
                chief_complaint=payload.chief_complaint,
                clinical_impression=payload.clinical_impression,
                treatment_plan=payload.treatment_plan,
                follow_up_notes=payload.follow_up_notes,
                created_by="appoint-me",
                diagnoses=[
                    DiagnosisCreate(
                        diagnosis_text=item.diagnosis_text,
                        diagnosis_code=item.diagnosis_code,
                        is_primary=item.is_primary,
                        notes=item.notes,
                    )
                    for item in payload.diagnoses
                ],
                exam_orders=[
                    ExamOrderCreate(
                        exam_name=item.exam_name,
                        exam_category=item.exam_category,
                        instructions=item.instructions,
                        expected_date=item.expected_date,
                    )
                    for item in payload.exam_orders
                ],
            )
        )
        return IntegrationEncounterCreateResponse(
            status="created",
            encounter_id=encounter.id,
            patient_id=encounter.patient_id,
            exams_ordered=[exam.exam_name for exam in encounter.exam_orders],
        )

    def list_pending_dispatches(self, limit: int = 100) -> list[PendingCommunicationDispatchRead]:
        dispatches = self.communication_dispatch_service.list_pending_dispatches(limit=limit)
        results: list[PendingCommunicationDispatchRead] = []
        for dispatch in dispatches:
            template = (
                self.communication_template_repository.get(dispatch.template_id)
                if dispatch.template_id is not None
                else None
            )
            results.append(
                PendingCommunicationDispatchRead(
                    dispatch_id=dispatch.id,
                    patient_id=dispatch.patient_id,
                    doctor_id=dispatch.doctor_id,
                    appointment_id=dispatch.appointment_id,
                    exam_order_id=dispatch.exam_order_id,
                    reminder_rule_id=dispatch.reminder_rule_id,
                    template_id=dispatch.template_id,
                    channel=dispatch.channel,
                    recipient_phone=dispatch.recipient_phone,
                    external_reference=dispatch.external_reference,
                    rendered_message=dispatch.rendered_message or "",
                    template_key=template.template_key if template is not None else None,
                    template_title=template.title if template is not None else None,
                    template_body=template.body if template is not None else None,
                    created_at=dispatch.created_at,
                )
            )
        return results

    def update_dispatch_status(
        self,
        dispatch_id: int,
        payload: CommunicationDispatchStatusUpdate,
    ) -> PendingCommunicationDispatchRead:
        dispatch = self.communication_dispatch_service.update_dispatch_from_integration(
            dispatch_id,
            CommunicationDispatchUpdate(
                status=payload.status,
                external_reference=payload.external_reference,
                error_message=payload.failure_reason or payload.error_message,
                rendered_message=payload.rendered_message,
            ),
        )
        template = (
            self.communication_template_repository.get(dispatch.template_id)
            if dispatch.template_id is not None
            else None
        )
        return PendingCommunicationDispatchRead(
            dispatch_id=dispatch.id,
            patient_id=dispatch.patient_id,
            doctor_id=dispatch.doctor_id,
            appointment_id=dispatch.appointment_id,
            exam_order_id=dispatch.exam_order_id,
            reminder_rule_id=dispatch.reminder_rule_id,
            template_id=dispatch.template_id,
            channel=dispatch.channel,
            recipient_phone=dispatch.recipient_phone,
            external_reference=dispatch.external_reference,
            rendered_message=dispatch.rendered_message or "",
            template_key=template.template_key if template is not None else None,
            template_title=template.title if template is not None else None,
            template_body=template.body if template is not None else None,
            created_at=dispatch.created_at,
        )
