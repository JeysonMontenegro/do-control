from datetime import date as date_cls, datetime

from pydantic import BaseModel, Field, model_validator


class PatientMatchRequest(BaseModel):
    patient_name: str
    phone_number: str


class PatientMatchCandidate(BaseModel):
    patient_id: int
    medical_record_number: str
    patient_name: str
    display_name: str | None = None
    primary_phone: str
    confidence: str
    created_at: datetime
    updated_at: datetime


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


class DoctorVerificationRead(BaseModel):
    id: int
    full_name: str
    specialty: str | None
    license_number: str | None
    is_active: bool
    primary_phone: str | None


class IntegrationDoctorProfileRead(BaseModel):
    doctor_id: int
    full_name: str
    specialty: str | None
    license_number: str | None
    gender: str | None
    primary_phone: str | None


class IntegrationUserVerificationRead(BaseModel):
    is_valid: bool
    user_id: int | None = None
    role: str | None = None
    roles: list[str] = []
    user_name: str | None = None
    phone_number: str | None = None
    is_active: bool = False
    permissions: list[str] = []
    doctor_profile: IntegrationDoctorProfileRead | None = None


class IntegrationPatientCreateRequest(BaseModel):
    full_name: str | None = None
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    primary_phone: str
    doctor_id: int

    @model_validator(mode="after")
    def validate_name_input(self) -> "IntegrationPatientCreateRequest":
        if self.full_name:
            return self
        if self.first_name and self.last_name:
            return self
        raise ValueError("Provide either full_name or first_name plus last_name.")


class IntegrationPatientCreateResponse(BaseModel):
    id: int
    medical_record_number: str
    patient_name: str
    display_name: str | None = None
    primary_phone: str


class IntegrationPatientPhoneUpdateRequest(BaseModel):
    phone_number: str


class IntegrationPatientPhoneUpdateResponse(BaseModel):
    status: str
    patient_id: int
    primary_phone: str
    previous_phone: str | None = None


class IntegrationPatientDeactivateResponse(BaseModel):
    status: str
    patient_id: int


class MessagingWhitelistAllowedRead(BaseModel):
    allowed: bool


class MessagingWhitelistStateRead(BaseModel):
    enabled: bool
    phones: list[str] = []


class MessagingWhitelistToggle(BaseModel):
    enabled: bool


class MessagingWhitelistPhoneMutation(BaseModel):
    phone: str


class MessagingWhitelistPhoneMutationRead(BaseModel):
    added: str | None = None
    removed: str | None = None


class MessagingConversationRead(BaseModel):
    patient_phone: str
    patient_name: str | None = None
    last_message: str | None = None
    last_direction: str
    last_at: datetime
    unread_count: int = 0
    window_open: bool = False


class MessagingConversationMessageRead(BaseModel):
    id: str | int
    direction: str
    type: str
    text: str | None = None
    sender_type: str | None = None
    intent: str | None = None
    created_at: datetime
    status: str


class MessagingConversationSendRequest(BaseModel):
    doctor_id: int
    patient_phone: str
    text: str = Field(min_length=1, max_length=4000)


class MessagingConversationSendResponse(BaseModel):
    status: str
    window_open: bool
    message_id: str | None = None


class EmailWhitelistAllowedRead(BaseModel):
    allowed: bool


class EmailWhitelistStateRead(BaseModel):
    enabled: bool
    addresses: list[str] = []


class EmailWhitelistToggle(BaseModel):
    enabled: bool


class EmailWhitelistAddressMutation(BaseModel):
    email: str


class EmailWhitelistAddressMutationRead(BaseModel):
    added: str | None = None
    removed: str | None = None


class ProposedAppointmentRequest(BaseModel):
    patient_name: str
    phone_number: str
    patient_id: int | None = None
    requester_phone_number: str | None = None
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
        if self.doctor_id is None and not self.doctor_phone_number and not self.requester_phone_number:
            raise ValueError("Either doctor_id, doctor_phone_number or requester_phone_number is required.")
        return self


class AvailableDoctorOption(BaseModel):
    id: int
    full_name: str


class AvailablePatientOption(BaseModel):
    patient_id: int
    patient_name: str
    display_name: str | None = None
    medical_record_number: str
    primary_phone: str
    created_at: datetime
    updated_at: datetime


class ProposedAppointmentResponse(BaseModel):
    status: str
    patient_id: int | None = None
    appointment_id: int | None = None
    appointment_public_id: str | None = None
    appointment_public_url: str | None = None
    doctor_id: int | None = None
    message: str
    existing_appointment_id: int | None = None
    available_doctors: list[AvailableDoctorOption] = []
    available_patients: list[AvailablePatientOption] = []


class AppointmentActionResponse(BaseModel):
    status: str
    appointment_id: int
    appointment_public_id: str | None = None
    appointment_public_url: str | None = None


class AppointmentCancelRequest(BaseModel):
    doctor_id: int
    patient_name: str
    date: date_cls | None = None


class AppointmentCancelResponse(BaseModel):
    status: str
    appointment_id: int | None = None
    appointment_public_id: str | None = None
    appointment_public_url: str | None = None
    patient_name: str | None = None
    scheduled_start: datetime | None = None


class AppointmentRescheduleRequest(BaseModel):
    doctor_id: int
    patient_name: str
    date: date_cls | None = None
    requested_start: datetime | None = None
    requested_end: datetime | None = None
    note: str | None = None


class AppointmentRescheduleResponse(BaseModel):
    status: str
    appointment_id: int | None = None
    appointment_public_id: str | None = None
    appointment_public_url: str | None = None
    review_item_id: int | None = None
    patient_name: str | None = None
    current_scheduled_start: datetime | None = None
    requested_start: datetime | None = None
    requested_end: datetime | None = None


class DoctorScheduleAppointmentRead(BaseModel):
    appointment_id: int
    appointment_public_id: str | None = None
    appointment_public_url: str | None = None
    patient_name: str
    scheduled_start: datetime
    scheduled_end: datetime
    reason: str | None
    status: str
    confirmation_status: str


class PendingAppointmentRead(BaseModel):
    appointment_id: int
    appointment_public_id: str | None = None
    appointment_public_url: str | None = None
    doctor_id: int
    doctor_name: str
    doctor_specialty: str | None = None
    clinic_name: str | None = None
    clinic_address: str | None = None
    patient_id: int
    scheduled_start: datetime
    scheduled_end: datetime
    status: str
    confirmation_status: str


class PendingAppointmentsRead(BaseModel):
    appointments: list[PendingAppointmentRead] = []


class IntegrationDiagnosisCreate(BaseModel):
    diagnosis_text: str
    diagnosis_code: str | None = None
    is_primary: bool = False
    notes: str | None = None


class IntegrationExamOrderCreate(BaseModel):
    exam_name: str
    exam_category: str | None = None
    instructions: str | None = None
    expected_date: date_cls | None = None


class IntegrationEncounterCreateRequest(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: int | None = None
    encounter_date: datetime
    encounter_type: str
    chief_complaint: str
    clinical_impression: str | None = None
    treatment_plan: str | None = None
    follow_up_notes: str | None = None
    diagnoses: list[IntegrationDiagnosisCreate] = []
    exam_orders: list[IntegrationExamOrderCreate] = []


class IntegrationEncounterCreateResponse(BaseModel):
    status: str
    encounter_id: int
    patient_id: int
    exams_ordered: list[str] = []


class PendingCommunicationDispatchRead(BaseModel):
    dispatch_id: int
    patient_id: int
    doctor_id: int | None
    appointment_id: int | None
    exam_order_id: int | None
    reminder_rule_id: int | None
    template_id: int | None
    channel: str
    recipient_phone: str
    external_reference: str | None
    rendered_message: str
    template_key: str | None
    template_title: str | None
    template_body: str | None
    created_at: datetime


class CommunicationDispatchStatusUpdate(BaseModel):
    status: str
    external_reference: str | None = None
    error_message: str | None = Field(default=None, exclude=True)
    failure_reason: str | None = None
    rendered_message: str | None = None
