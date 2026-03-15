from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.doctor_phone_number import DoctorPhoneNumberRead

class DoctorCreate(BaseModel):
    first_name: str
    last_name: str
    license_number: str | None = None
    specialty: str | None = None
    primary_phone: str | None = None
    phone_channel_type: str | None = "whatsapp"


class DoctorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    license_number: str | None
    specialty: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    phone_numbers: list[DoctorPhoneNumberRead] = []
