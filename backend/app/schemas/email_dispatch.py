from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmailDispatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    template_id: int | None
    recipient_email: str
    subject: str
    html_body: str
    text_body: str | None
    template_key: str | None
    status: str
    provider: str
    provider_message_id: str | None
    error_message: str | None
    retry_count: int
    created_at: datetime
    updated_at: datetime


class EmailDispatchResendRequest(BaseModel):
    recipient_email: str | None = None


class EmailDispatchTestRequest(BaseModel):
    recipient_email: str
    template_key: str
