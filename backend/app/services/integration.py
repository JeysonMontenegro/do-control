from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.repositories.communication_template import CommunicationTemplateRepository
from app.schemas.appointment import AppointmentCreate
from app.schemas.communication_dispatch import CommunicationDispatchUpdate
from app.schemas.integration import (
    CommunicationDispatchStatusUpdate,
    DoctorMatchCandidate,
    DoctorMatchRequest,
    DoctorMatchResponse,
    PatientMatchCandidate,
    PatientMatchRequest,
    PatientMatchResponse,
    PendingCommunicationDispatchRead,
    ProposedAppointmentRequest,
    ProposedAppointmentResponse,
)
from app.schemas.patient import PatientCreate
from app.services.appointment import AppointmentService
from app.services.audit import create_audit_log
from app.services.communication_dispatch import CommunicationDispatchService
from app.services.doctor import DoctorService
from app.services.errors import ConflictError, NotFoundError, ValidationError
from app.services.patient import PatientService


class IntegrationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.patient_service = PatientService(db)
        self.appointment_service = AppointmentService(db)
        self.communication_dispatch_service = CommunicationDispatchService(db)
        self.communication_template_repository = CommunicationTemplateRepository(db)
        self.doctor_service = DoctorService(db)

    def match_patient(self, payload: PatientMatchRequest) -> PatientMatchResponse:
        results = self.patient_service.list_patients(query=payload.phone_number)
        candidates = []
        requested_name = payload.patient_name.strip().lower()
        for patient in results:
            patient_name = f"{patient.first_name} {patient.last_name}".strip()
            confidence = "high" if patient_name.lower() == requested_name else "medium"
            candidates.append(
                PatientMatchCandidate(
                    patient_id=patient.id,
                    medical_record_number=patient.medical_record_number,
                    patient_name=patient_name,
                    primary_phone=patient.primary_phone,
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
            action="integration_patient_match",
            entity_type="integration",
            entity_id=payload.phone_number,
            after_data={"status": status, "candidate_count": len(candidates)},
        )
        self.db.commit()
        return PatientMatchResponse(status=status, candidate_matches=candidates)

    def match_doctor(self, payload: DoctorMatchRequest) -> DoctorMatchResponse:
        results = self.doctor_service.list_doctors(query=payload.phone_number)
        candidates = []
        requested_name = payload.doctor_name.strip().lower() if payload.doctor_name else None
        for doctor in results:
            doctor_name = f"{doctor.first_name} {doctor.last_name}".strip()
            if requested_name is None:
                confidence = "high"
            else:
                confidence = "high" if doctor_name.lower() == requested_name else "medium"

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

    def _resolve_doctor(self, payload: ProposedAppointmentRequest) -> Doctor | None:
        if payload.doctor_id is not None:
            return self.doctor_service.get_doctor(payload.doctor_id)

        if not payload.doctor_phone_number:
            return None

        match = self.match_doctor(
            DoctorMatchRequest(
                doctor_name=payload.doctor_name,
                phone_number=payload.doctor_phone_number,
            )
        )
        if match.status == "matched":
            return self.doctor_service.get_doctor(match.candidate_matches[0].doctor_id)
        if match.status == "candidate_matches":
            raise ValidationError("Multiple doctor candidates found for the provided phone number.")
        raise ValidationError("Doctor not found for the provided phone number.")

    def create_proposed_appointment(self, payload: ProposedAppointmentRequest) -> ProposedAppointmentResponse:
        try:
            doctor = self._resolve_doctor(payload)
        except (NotFoundError, ValidationError) as exc:
            return ProposedAppointmentResponse(status="needs_manual_review", message=str(exc))

        match = self.match_patient(
            PatientMatchRequest(
                patient_name=payload.patient_name,
                phone_number=payload.phone_number,
            )
        )

        patient_id: int | None = None
        if match.status == "matched":
            patient_id = match.candidate_matches[0].patient_id
        elif match.status == "candidate_matches":
            return ProposedAppointmentResponse(
                status="needs_manual_review",
                doctor_id=doctor.id if doctor is not None else None,
                message="Multiple patient candidates found for the provided phone number.",
            )
        elif payload.create_patient_if_missing:
            name_parts = payload.patient_name.strip().split(maxsplit=1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else "Unknown"
            patient = self.patient_service.create_patient(
                PatientCreate(
                    first_name=first_name,
                    last_name=last_name,
                    primary_phone=payload.phone_number,
                )
            )
            patient_id = patient.id
        else:
            return ProposedAppointmentResponse(
                status="no_match",
                doctor_id=doctor.id if doctor is not None else None,
                message="No patient match found and automatic creation is disabled.",
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
            doctor_id=doctor.id,
            message="Appointment created.",
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
                    reminder_rule_id=dispatch.reminder_rule_id,
                    template_id=dispatch.template_id,
                    channel=dispatch.channel,
                    recipient_phone=dispatch.recipient_phone,
                    external_reference=dispatch.external_reference,
                    rendered_message=dispatch.rendered_message,
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
        dispatch = self.communication_dispatch_service.update_dispatch(
            dispatch_id,
            CommunicationDispatchUpdate(
                status=payload.status,
                external_reference=payload.external_reference,
                error_message=payload.error_message,
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
            reminder_rule_id=dispatch.reminder_rule_id,
            template_id=dispatch.template_id,
            channel=dispatch.channel,
            recipient_phone=dispatch.recipient_phone,
            external_reference=dispatch.external_reference,
            rendered_message=dispatch.rendered_message,
            template_key=template.template_key if template is not None else None,
            template_title=template.title if template is not None else None,
            template_body=template.body if template is not None else None,
            created_at=dispatch.created_at,
        )
