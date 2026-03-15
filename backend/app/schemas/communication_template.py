from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommunicationTemplateCreate(BaseModel):
    doctor_id: int | None = None
    channel: str = "whatsapp"
    template_key: str
    title: str
    body: str
    is_active: bool = True


class CommunicationTemplateUpdate(BaseModel):
    doctor_id: int | None = None
    channel: str | None = None
    template_key: str | None = None
    title: str | None = None
    body: str | None = None
    is_active: bool | None = None


class CommunicationTemplatePreviewRequest(BaseModel):
    doctor_id: int | None = None
    channel: str = "whatsapp"
    template_key: str = "preview"
    title: str = "Preview"
    body: str
    patient_id: int | None = None
    appointment_id: int | None = None
    exam_order_id: int | None = None


class CommunicationTemplatePreviewRead(BaseModel):
    rendered_message: str
    patient_id: int | None
    doctor_id: int | None
    appointment_id: int | None
    exam_order_id: int | None


class CommunicationTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int | None
    channel: str
    template_key: str
    title: str
    body: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
