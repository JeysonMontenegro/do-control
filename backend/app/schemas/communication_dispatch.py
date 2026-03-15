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
    external_reference: str | None = None
    rendered_message: str | None = None
    error_message: str | None = None


class CommunicationDispatchUpdate(BaseModel):
    status: str | None = None
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
    external_reference: str | None
    rendered_message: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class CommunicationDispatchGenerationRead(BaseModel):
    created_count: int
