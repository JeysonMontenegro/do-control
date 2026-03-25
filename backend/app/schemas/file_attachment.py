from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FileAttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    encounter_id: int | None
    file_type: str
    file_name: str
    storage_key: str
    content_type: str | None
    file_size: int | None
    uploaded_by: str | None
    created_at: datetime
    updated_at: datetime


class FileAttachmentDownloadRead(BaseModel):
    attachment_id: int
    file_name: str
    download_url: str
    expires_in_seconds: int


class FileAttachmentDeleteRead(BaseModel):
    attachment_id: int
    status: str
