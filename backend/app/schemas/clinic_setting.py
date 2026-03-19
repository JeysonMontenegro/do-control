from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ClinicSettingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    allow_multi_doctor_visibility: bool
    created_at: datetime
    updated_at: datetime


class ClinicSettingUpdate(BaseModel):
    allow_multi_doctor_visibility: bool | None = None
