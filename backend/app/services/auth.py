from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from app.repositories.doctor import DoctorRepository
from app.repositories.user import UserRepository
from app.schemas.auth import AuthProfileRead, AuthProfileUpdate, LoginResponse
from app.services.errors import ValidationError
from app.services.security import create_access_token, hash_password, verify_password
from app.services.service_utils import sync_doctor_primary_phone
from app.services.storage import StorageService


class AuthService:
    def __init__(self, db: Session) -> None:
        self.repository = UserRepository(db)
        self.doctor_repository = DoctorRepository(db)
        self.storage = StorageService()

    def _profile_photo_url(self, storage_key: str | None) -> str | None:
        if not storage_key:
            return None
        return self.storage.generate_presigned_download_url(key=storage_key, expires_in_seconds=3600)

    def _serialize_profile(self, user) -> AuthProfileRead:
        roles = [user_role.role.name for user_role in user.roles]
        return AuthProfileRead(
            user_email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            display_name=user.display_name,
            gender=user.gender,
            phone_number=user.primary_phone_number,
            profile_photo_url=self._profile_photo_url(user.profile_photo_storage_key),
            roles=roles,
        )

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
            first_name=user.first_name,
            last_name=user.last_name,
            display_name=user.display_name,
            gender=user.gender,
            phone_number=user.primary_phone_number,
            profile_photo_url=self._profile_photo_url(user.profile_photo_storage_key),
            roles=roles,
        )

    def read_profile(self, user_id: int) -> AuthProfileRead:
        user = self.repository.get(user_id)
        if user is None or not user.is_active:
            raise ValidationError("Invalid user.")
        return self._serialize_profile(user)

    def update_profile(self, user_id: int, payload: AuthProfileUpdate) -> AuthProfileRead:
        user = self.repository.get(user_id)
        if user is None or not user.is_active:
            raise ValidationError("Invalid user.")

        if payload.new_password:
            if not payload.current_password:
                raise ValidationError("Current password is required to set a new password.")
            if not verify_password(payload.current_password, user.password_hash):
                raise ValidationError("Current password is invalid.")
            user.password_hash = hash_password(payload.new_password)

        if payload.first_name is not None:
            normalized_first_name = payload.first_name.strip()
            if not normalized_first_name:
                raise ValidationError("First name is required.")
            user.first_name = normalized_first_name
        if payload.last_name is not None:
            normalized_last_name = payload.last_name.strip()
            if not normalized_last_name:
                raise ValidationError("Last name is required.")
            user.last_name = normalized_last_name
        if payload.gender is not None:
            user.gender = payload.gender
        if payload.display_name is not None:
            user.display_name = payload.display_name.strip() or None
        if payload.phone_number is not None:
            normalized_phone = payload.phone_number.strip() or None
            if normalized_phone:
                existing_user = self.repository.get_by_phone_number(normalized_phone)
                if existing_user is not None and existing_user.id != user.id:
                    raise ValidationError("That phone number is already in use.")
                if self.doctor_repository.phone_number_in_use(normalized_phone, exclude_linked_user_id=user.id):
                    raise ValidationError("That phone number is already in use.")
            self.repository.sync_primary_phone_number(
                user.id,
                normalized_phone,
                phone_type="mobile",
                is_verified=False,
                can_talk_to_bot=bool(normalized_phone),
            )

        sync_doctor_primary_phone(
            doctor_repository=self.doctor_repository,
            user=user,
            phone_number=user.primary_phone_number,
        )
        self.repository.db.commit()
        self.repository.db.refresh(user)
        return self._serialize_profile(user)

    def upload_profile_photo(
        self,
        *,
        user_id: int,
        file_name: str,
        content_type: str | None,
        content: bytes,
    ) -> AuthProfileRead:
        user = self.repository.get(user_id)
        if user is None or not user.is_active:
            raise ValidationError("Invalid user.")
        if not content:
            raise ValidationError("Profile photo content is required.")
        if not content_type or not content_type.startswith("image/"):
            raise ValidationError("Profile photo must be an image.")
        if len(content) > 5 * 1024 * 1024:
            raise ValidationError("Profile photo must be 5 MB or smaller.")

        suffix = Path(file_name).suffix or ".bin"
        key = f"users/{user.id}/profile/{uuid4()}{suffix}"
        self.storage.ensure_bucket()
        self.storage.upload_bytes(key=key, content=content, content_type=content_type)
        user.profile_photo_storage_key = key
        self.repository.db.commit()
        self.repository.db.refresh(user)
        return self._serialize_profile(user)
