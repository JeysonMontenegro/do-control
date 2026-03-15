from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PatientPhoneNumberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone_number: str
    is_primary: bool
    is_active: bool
    created_at: datetime
