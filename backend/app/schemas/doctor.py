from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.doctor_clinic import DoctorClinicCreate, DoctorClinicRead
from app.schemas.doctor_phone_number import DoctorPhoneNumberRead


class AssignedReceptionistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    gender: str | None
    phone_number: str | None
    is_active: bool


class DoctorCreate(BaseModel):
    first_name: str
    last_name: str
    gender: str | None = None
    doctor_title: str | None = None
    date_of_birth: date | None = None
    license_number: str | None = None
    specialty: str | None = None
    primary_phone: str
    phone_channel_type: str | None = "whatsapp"
    user_email: str
    user_password: str
    clinics: list[DoctorClinicCreate] = []


class DoctorUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    doctor_title: str | None = None
    date_of_birth: date | None = None
    license_number: str | None = None
    specialty: str | None = None
    primary_phone: str | None = None
    user_password: str | None = None
    is_active: bool | None = None
    clinics: list[DoctorClinicCreate] | None = None


class DoctorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    gender: str | None
    doctor_title: str | None
    date_of_birth: date | None
    license_number: str | None
    specialty: str | None
    linked_user_id: int
    linked_user_email: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    clinics: list[DoctorClinicRead] = []
    phone_numbers: list[DoctorPhoneNumberRead] = []
    assigned_receptionists: list[AssignedReceptionistRead] = []
