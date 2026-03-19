from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str
    recaptcha_token: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_email: str
    first_name: str
    last_name: str
    display_name: str | None = None
    gender: str | None = None
    phone_number: str | None = None
    profile_photo_url: str | None = None
    roles: list[str]


class AuthProfileRead(BaseModel):
    user_email: str
    first_name: str
    last_name: str
    display_name: str | None = None
    gender: str | None = None
    phone_number: str | None = None
    profile_photo_url: str | None = None
    roles: list[str]


class AuthProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    display_name: str | None = None
    gender: str | None = None
    phone_number: str | None = None
    current_password: str | None = None
    new_password: str | None = None
