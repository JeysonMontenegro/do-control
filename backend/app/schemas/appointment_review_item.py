from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppointmentReviewItemResolveRequest(BaseModel):
    action: str
    patient_id: int | None = None
    doctor_id: int | None = None
    appointment_id: int | None = None
    note: str | None = None
    changed_by: str | None = None


class AppointmentReviewItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_name: str
    phone_number: str
    doctor_id: int | None
    doctor_name: str | None
    doctor_phone_number: str | None
    scheduled_start: datetime
    scheduled_end: datetime
    appointment_type: str
    reason: str | None
    source: str
    review_status: str
    review_reason: str
    review_message: str
    existing_appointment_id: int | None
    created_at: datetime
    updated_at: datetime
