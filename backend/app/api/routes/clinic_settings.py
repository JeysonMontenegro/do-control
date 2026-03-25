from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.clinic_setting import ClinicSettingRead, ClinicSettingUpdate
from app.schemas.integration import (
    EmailWhitelistAddressMutation,
    EmailWhitelistAddressMutationRead,
    EmailWhitelistStateRead,
    EmailWhitelistToggle,
    MessagingWhitelistPhoneMutation,
    MessagingWhitelistPhoneMutationRead,
    MessagingWhitelistStateRead,
    MessagingWhitelistToggle,
)
from app.services.clinic_setting import ClinicSettingService
from app.services.email_whitelist import EmailWhitelistService
from app.services.errors import ValidationError
from app.services.messaging_whitelist import MessagingWhitelistService

router = APIRouter()


@router.get("", response_model=ClinicSettingRead)
def get_clinic_settings(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> ClinicSettingRead:
    return ClinicSettingService(db).get_settings()


@router.patch("", response_model=ClinicSettingRead)
def update_clinic_settings(
    payload: ClinicSettingUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> ClinicSettingRead:
    return ClinicSettingService(db).update_settings(payload)


@router.get("/messaging-whitelist", response_model=MessagingWhitelistStateRead)
def get_messaging_whitelist(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> MessagingWhitelistStateRead:
    return MessagingWhitelistService(db).get_state()


@router.put("/messaging-whitelist", response_model=MessagingWhitelistStateRead)
def update_messaging_whitelist(
    payload: MessagingWhitelistToggle,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> MessagingWhitelistStateRead:
    return MessagingWhitelistService(db).update_enabled(payload)


@router.post("/messaging-whitelist/phones", response_model=MessagingWhitelistPhoneMutationRead)
def add_messaging_whitelist_phone(
    payload: MessagingWhitelistPhoneMutation,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> MessagingWhitelistPhoneMutationRead:
    try:
        return MessagingWhitelistService(db).add_phone(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/messaging-whitelist/phones/{phone}", response_model=MessagingWhitelistPhoneMutationRead)
def remove_messaging_whitelist_phone(
    phone: str,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> MessagingWhitelistPhoneMutationRead:
    try:
        return MessagingWhitelistService(db).remove_phone(phone)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/email-whitelist", response_model=EmailWhitelistStateRead)
def get_email_whitelist(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailWhitelistStateRead:
    return EmailWhitelistService(db).get_state()


@router.put("/email-whitelist", response_model=EmailWhitelistStateRead)
def update_email_whitelist(
    payload: EmailWhitelistToggle,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailWhitelistStateRead:
    return EmailWhitelistService(db).update_enabled(payload)


@router.post("/email-whitelist/addresses", response_model=EmailWhitelistAddressMutationRead)
def add_email_whitelist_address(
    payload: EmailWhitelistAddressMutation,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailWhitelistAddressMutationRead:
    try:
        return EmailWhitelistService(db).add_address(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/email-whitelist/addresses/{email}", response_model=EmailWhitelistAddressMutationRead)
def remove_email_whitelist_address(
    email: str,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailWhitelistAddressMutationRead:
    try:
        return EmailWhitelistService(db).remove_address(email)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
