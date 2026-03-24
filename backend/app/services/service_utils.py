from typing import Any

from app.models.doctor_phone_number import DoctorPhoneNumber
from app.models.user import User
from app.repositories.doctor import DoctorRepository
from app.services.phone_number import phone_number_candidates


def resolve_actor_user_id(user_repository: Any, actor_identifier: str | None) -> int | None:
    if not actor_identifier or "@" not in actor_identifier:
        return None
    user = user_repository.get_by_email(actor_identifier)
    return user.id if user is not None else None


def sync_doctor_primary_phone(
    *,
    doctor_repository: DoctorRepository,
    user: User,
    phone_number: str | None,
    channel_type: str = "whatsapp",
) -> None:
    doctor = user.doctor_profile
    if doctor is None:
        return

    matched_phone = None
    candidates = phone_number_candidates(phone_number)
    for phone in doctor.phone_numbers:
        phone.is_primary = False
        if phone_number is None:
            phone.is_active = False
            continue
        if phone.phone_number in candidates:
            matched_phone = phone

    if phone_number is None:
        return

    if matched_phone is not None:
        matched_phone.is_primary = True
        matched_phone.is_active = True
        matched_phone.channel_type = channel_type
        return

    doctor_repository.add_phone_number(
        DoctorPhoneNumber(
            doctor_id=doctor.id,
            phone_number=phone_number,
            is_primary=True,
            is_active=True,
            channel_type=channel_type,
        )
    )
