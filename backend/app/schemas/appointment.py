from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    reason: str | None = None
    internal_notes: str | None = None
    source: str = "receptionist"
    created_by: str | None = None
    notify_patient: bool = True


class AppointmentUpdate(BaseModel):
    internal_notes: str | None = None
    changed_by: str | None = None


class AppointmentStatusUpdate(BaseModel):
    status: str
    change_reason: str | None = None
    changed_by: str | None = None


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: str
    patient_id: int
    doctor_id: int
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    reason: str | None
    internal_notes: str | None
    status: str
    confirmation_status: str
    source: str
    created_by: str | None
    patient_name: str | None = None
    doctor_name: str | None = None
    created_at: datetime
    updated_at: datetime


class AppointmentSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: str | None = None
    doctor_id: int
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    status: str
    confirmation_status: str


class AppointmentHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    appointment_id: int
    old_status: str | None
    new_status: str
    change_reason: str | None
    changed_by: str | None
    created_at: datetime


class AppointmentPublicCardRead(BaseModel):
    id: int
    public_id: str
    doctor_name: str
    doctor_title: str | None
    doctor_specialty: str | None
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    reason: str | None
    status: str
    confirmation_status: str
    status_label: str
    clinic_name: str | None
    clinic_address: str | None
    clinic_phone: str | None
