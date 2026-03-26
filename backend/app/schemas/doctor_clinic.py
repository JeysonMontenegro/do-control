from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DoctorClinicBase(BaseModel):
    clinic_name: str
    address: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    phone_number: str | None = None
    notes: str | None = None
    is_primary: bool = False


class DoctorClinicCreate(DoctorClinicBase):
    pass


class DoctorClinicRead(DoctorClinicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
