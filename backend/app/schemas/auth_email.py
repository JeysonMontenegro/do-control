from pydantic import BaseModel


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str


class AdminInviteRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    gender: str | None = None


class AuthEmailActionRead(BaseModel):
    status: str
    message: str
