from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommunicationDispatchCreate(BaseModel):
    patient_id: int
    doctor_id: int | None = None
    appointment_id: int | None = None
    exam_order_id: int | None = None
    reminder_rule_id: int | None = None
    template_id: int | None = None
    channel: str = "whatsapp"
    recipient_phone: str
    status: str = "pending"
    retry_count: int = 0
    last_attempt_at: datetime | None = None
    next_attempt_at: datetime | None = None
    external_reference: str | None = None
    rendered_message: str | None = None
    error_message: str | None = None


class CommunicationDispatchUpdate(BaseModel):
    status: str | None = None
    retry_count: int | None = None
    last_attempt_at: datetime | None = None
    next_attempt_at: datetime | None = None
    external_reference: str | None = None
    rendered_message: str | None = None
    error_message: str | None = None


class CommunicationDispatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int | None
    appointment_id: int | None
    exam_order_id: int | None
    reminder_rule_id: int | None
    template_id: int | None
    channel: str
    recipient_phone: str
    status: str
    retry_count: int
    last_attempt_at: datetime | None
    next_attempt_at: datetime | None
    external_reference: str | None
    rendered_message: str | None
    error_message: str | None
    patient_name: str | None = None
    patient_medical_record_number: str | None = None
    doctor_name: str | None = None
    appointment_scheduled_start: datetime | None = None
    appointment_scheduled_end: datetime | None = None
    template_key: str | None = None
    template_title: str | None = None
    created_at: datetime
    updated_at: datetime


class CommunicationDispatchGenerationRead(BaseModel):
    created_count: int


class CommunicationDispatchSummaryRead(BaseModel):
    total: int
    pending: int
    sent: int
    delivered: int
    failed: int
    due_now: int


class CommunicationDispatchBatchRequeueRequest(BaseModel):
    dispatch_ids: list[int]


class CommunicationDispatchBatchRequeueRead(BaseModel):
    requeued_count: int


class CommunicationDispatchAttemptRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dispatch_id: int
    attempt_source: str
    result_status: str
    attempted_at: datetime
    external_reference: str | None
    error_message: str | None
    rendered_message: str | None
    created_at: datetime
