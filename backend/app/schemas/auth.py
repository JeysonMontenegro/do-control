from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_email: str
    first_name: str
    last_name: str
    gender: str | None = None
    roles: list[str]
