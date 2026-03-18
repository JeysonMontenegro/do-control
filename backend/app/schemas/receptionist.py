from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReceptionistDoctorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    specialty: str | None


class ReceptionistCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    gender: str | None = None
    phone_number: str | None = None
    doctor_ids: list[int] = []


class ReceptionistUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    phone_number: str | None = None
    password: str | None = None
    doctor_ids: list[int] | None = None
    is_active: bool | None = None


class ReceptionistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    gender: str | None
    phone_number: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    assigned_doctors: list[ReceptionistDoctorRead] = []
