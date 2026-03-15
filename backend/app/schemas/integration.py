from datetime import datetime

from pydantic import BaseModel, model_validator


class PatientMatchRequest(BaseModel):
    patient_name: str
    phone_number: str


class PatientMatchCandidate(BaseModel):
    patient_id: int
    medical_record_number: str
    patient_name: str
    primary_phone: str
    confidence: str


class PatientMatchResponse(BaseModel):
    status: str
    candidate_matches: list[PatientMatchCandidate] = []


class DoctorMatchRequest(BaseModel):
    doctor_name: str | None = None
    phone_number: str


class DoctorMatchCandidate(BaseModel):
    doctor_id: int
    doctor_name: str
    license_number: str | None
    specialty: str | None
    primary_phone: str | None
    confidence: str


class DoctorMatchResponse(BaseModel):
    status: str
    candidate_matches: list[DoctorMatchCandidate] = []


class ProposedAppointmentRequest(BaseModel):
    patient_name: str
    phone_number: str
    doctor_id: int | None = None
    doctor_phone_number: str | None = None
    doctor_name: str | None = None
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    reason: str | None = None
    source: str = "integration"
    create_patient_if_missing: bool = False

    @model_validator(mode="after")
    def validate_doctor_reference(self) -> "ProposedAppointmentRequest":
        if self.doctor_id is None and not self.doctor_phone_number:
            raise ValueError("Either doctor_id or doctor_phone_number is required.")
        return self


class ProposedAppointmentResponse(BaseModel):
    status: str
    patient_id: int | None = None
    appointment_id: int | None = None
    doctor_id: int | None = None
    message: str


class PendingCommunicationDispatchRead(BaseModel):
    dispatch_id: int
    patient_id: int
    doctor_id: int | None
    appointment_id: int | None
    reminder_rule_id: int | None
    template_id: int | None
    channel: str
    recipient_phone: str
    external_reference: str | None
    rendered_message: str | None
    template_key: str | None
    template_title: str | None
    template_body: str | None
    created_at: datetime


class CommunicationDispatchStatusUpdate(BaseModel):
    status: str
    external_reference: str | None = None
    error_message: str | None = None
    rendered_message: str | None = None
