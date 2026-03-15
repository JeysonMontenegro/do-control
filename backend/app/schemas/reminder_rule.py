from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReminderRuleCreate(BaseModel):
    doctor_id: int | None = None
    channel: str = "whatsapp"
    trigger_type: str = "before_appointment"
    minutes_before: int
    template_key: str
    is_active: bool = True


class ReminderRuleUpdate(BaseModel):
    doctor_id: int | None = None
    channel: str | None = None
    trigger_type: str | None = None
    minutes_before: int | None = None
    template_key: str | None = None
    is_active: bool | None = None


class ReminderRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: int | None
    channel: str
    trigger_type: str
    minutes_before: int
    template_key: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
