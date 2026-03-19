from datetime import datetime

from pydantic import BaseModel, ConfigDict


class EmailTemplateBase(BaseModel):
    template_key: str
    title: str
    subject: str
    html_body: str
    text_body: str | None = None
    is_active: bool = True


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    title: str | None = None
    subject: str | None = None
    html_body: str | None = None
    text_body: str | None = None
    is_active: bool | None = None


class EmailTemplatePreviewRequest(BaseModel):
    subject: str
    html_body: str
    text_body: str | None = None
    variables: dict[str, str | None] = {}


class EmailTemplatePreviewRead(BaseModel):
    rendered_subject: str
    rendered_html_body: str
    rendered_text_body: str | None


class EmailTemplateRead(EmailTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
