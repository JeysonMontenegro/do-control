from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    reason: str | None = None
    source: str = "receptionist"
    created_by: str | None = None


class AppointmentStatusUpdate(BaseModel):
    status: str
    change_reason: str | None = None
    changed_by: str | None = None


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    reason: str | None
    status: str
    confirmation_status: str
    source: str
    created_by: str | None
    created_at: datetime
    updated_at: datetime


class AppointmentSummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    status: str
    confirmation_status: str
