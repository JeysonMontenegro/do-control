from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DoctorPhoneNumberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone_number: str
    is_primary: bool
    is_active: bool
    channel_type: str | None
    created_at: datetime
    updated_at: datetime
