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
