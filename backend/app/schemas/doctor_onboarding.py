from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.doctor_clinic import DoctorClinicCreate


class DoctorOnboardingInviteCreate(BaseModel):
    full_name: str = Field(min_length=3, max_length=200)
    email: str = Field(min_length=3, max_length=255)
    phone_number: str = Field(min_length=8, max_length=30)

    @model_validator(mode="after")
    def validate_email_like(self) -> "DoctorOnboardingInviteCreate":
        normalized_email = self.email.strip()
        if "@" not in normalized_email or normalized_email.startswith("@") or normalized_email.endswith("@"):
            raise ValueError("Ingresa un correo válido.")
        self.email = normalized_email
        return self


class DoctorOnboardingInviteRead(BaseModel):
    status: str
    doctor_id: int
    user_id: int
    email: str
    phone_number: str
    expires_at: datetime
    onboarding_url: str


class DoctorOnboardingTokenRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    doctor_id: int
    user_id: int
    first_name: str
    last_name: str
    email: str
    phone_number: str | None = None
    profile_photo_url: str | None = None
    expires_at: datetime


class DoctorOnboardingStepRead(BaseModel):
    key: str
    title: str
    status: str


class DoctorOnboardingAdminRead(BaseModel):
    doctor_id: int
    user_id: int
    first_name: str
    last_name: str
    email: str
    phone_number: str | None = None
    profile_photo_url: str | None = None
    onboarding_status: str
    token_status: str
    invitation_sent_at: datetime | None = None
    expires_at: datetime | None = None
    token_used_at: datetime | None = None
    token_revoked_at: datetime | None = None
    can_reissue: bool = False
    can_revoke: bool = False
    can_complete_for_doctor: bool = False
    steps: list[DoctorOnboardingStepRead] = []


class DoctorOnboardingCompleteRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=200)
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    gender: str | None = None
    doctor_title: str | None = Field(default=None, max_length=50)
    date_of_birth: date | None = None
    license_number: str | None = Field(default=None, max_length=100)
    specialty: str | None = Field(default=None, max_length=100)
    clinics: list[DoctorClinicCreate] = []


class DoctorOnboardingCompleteRead(BaseModel):
    status: str
    doctor_id: int
    user_id: int
    email: str


class DoctorOnboardingAdminCompleteRequest(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    gender: str | None = None
    doctor_title: str | None = Field(default=None, max_length=50)
    date_of_birth: date | None = None
    license_number: str | None = Field(default=None, max_length=100)
    specialty: str | None = Field(default=None, max_length=100)
    phone_number: str | None = Field(default=None, min_length=8, max_length=30)
    user_password: str | None = Field(default=None, min_length=8, max_length=200)
    activate_user: bool = True
    clinics: list[DoctorClinicCreate] | None = None
