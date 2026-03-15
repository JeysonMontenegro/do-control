from sqlalchemy.orm import Session

from app.repositories.user import UserRepository
from app.schemas.auth import LoginResponse
from app.services.errors import ValidationError
from app.services.security import create_access_token, verify_password


class AuthService:
    def __init__(self, db: Session) -> None:
        self.repository = UserRepository(db)

    def login(self, email: str, password: str) -> LoginResponse:
        user = self.repository.get_by_email(email)
        if user is None or not user.is_active:
            raise ValidationError("Invalid credentials.")

        if not verify_password(password, user.password_hash):
            raise ValidationError("Invalid credentials.")

        roles = [user_role.role.name for user_role in user.roles]
        token = create_access_token(subject=user.email, user_id=user.id, roles=roles)
        return LoginResponse(
            access_token=token,
            user_email=user.email,
            roles=roles,
        )
