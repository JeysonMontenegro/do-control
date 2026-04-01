from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.appointment import AppointmentSummaryRead
from app.schemas.receptionist import ReceptionistDoctorRead
from app.schemas.encounter import EncounterDetailRead
from app.schemas.file_attachment import FileAttachmentRead
from app.schemas.patient_phone_number import PatientPhoneNumberRead


class PatientBase(BaseModel):
    medical_record_number: str | None = None
    display_name: str | None = None
    first_name: str
    middle_name: str | None = None
    last_name: str
    second_last_name: str | None = None
    married_name: str | None = None
    sex: str | None = None
    date_of_birth: date | None = None
    national_id: str | None = None
    tax_id: str | None = None
    primary_phone: str
    secondary_phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None
    blood_type: str | None = None
    notes: str | None = None


class PatientCreate(PatientBase):
    doctor_id: int | None = None


class PatientUpdate(BaseModel):
    display_name: str | None = None
    first_name: str | None = None
    middle_name: str | None = None
    last_name: str | None = None
    second_last_name: str | None = None
    married_name: str | None = None
    sex: str | None = None
    date_of_birth: date | None = None
    national_id: str | None = None
    tax_id: str | None = None
    primary_phone: str | None = None
    secondary_phone: str | None = None
    email: EmailStr | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None
    blood_type: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class PatientRead(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    phone_numbers: list[PatientPhoneNumberRead] = []
    assigned_doctors: list[ReceptionistDoctorRead] = []


class PatientSummaryRead(BaseModel):
    patient: PatientRead
    appointments: list[AppointmentSummaryRead]
    encounters: list[EncounterDetailRead]
    attachments: list[FileAttachmentRead]
