from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.doctor_onboarding import (
    DoctorOnboardingAdminCompleteRequest,
    DoctorOnboardingAdminRead,
    DoctorOnboardingInviteCreate,
    DoctorOnboardingInviteRead,
)
from app.schemas.doctor import DoctorCreate, DoctorRead, DoctorUpdate
from app.services.doctor_onboarding import DoctorOnboardingService
from app.services.doctor import DoctorService
from app.services.errors import NotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=list[DoctorRead])
def list_doctors(
    query: str | None = None,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[DoctorRead]:
    service = DoctorService(db)
    return [service.serialize_doctor(doctor) for doctor in service.list_doctors(query=query, current_user=current_user)]


@router.get("/onboarding", response_model=list[DoctorOnboardingAdminRead])
def list_doctor_onboarding_statuses(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> list[DoctorOnboardingAdminRead]:
    return DoctorOnboardingService(db).list_admin_onboardings()


@router.get("/{doctor_id}", response_model=DoctorRead)
def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> DoctorRead:
    try:
        service = DoctorService(db)
        return service.serialize_doctor(service.get_doctor(doctor_id, current_user=current_user))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: DoctorCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> DoctorRead:
    try:
        service = DoctorService(db)
        return service.serialize_doctor(service.create_doctor(payload))
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/invitations", response_model=DoctorOnboardingInviteRead, status_code=status.HTTP_201_CREATED)
def create_doctor_invitation(
    payload: DoctorOnboardingInviteCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> DoctorOnboardingInviteRead:
    try:
        return DoctorOnboardingService(db).create_invitation(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{doctor_id}/onboarding/reissue", response_model=DoctorOnboardingInviteRead)
def reissue_doctor_onboarding_invitation(
    doctor_id: int,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> DoctorOnboardingInviteRead:
    try:
        return DoctorOnboardingService(db).reissue_invitation(doctor_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{doctor_id}/onboarding/revoke", response_model=DoctorOnboardingAdminRead)
def revoke_doctor_onboarding_invitation(
    doctor_id: int,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> DoctorOnboardingAdminRead:
    try:
        return DoctorOnboardingService(db).revoke_invitation(doctor_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{doctor_id}/onboarding", response_model=DoctorOnboardingAdminRead)
def complete_doctor_onboarding_by_admin(
    doctor_id: int,
    payload: DoctorOnboardingAdminCompleteRequest,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> DoctorOnboardingAdminRead:
    try:
        return DoctorOnboardingService(db).admin_complete_onboarding(doctor_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{doctor_id}", response_model=DoctorRead)
def update_doctor(
    doctor_id: int,
    payload: DoctorUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> DoctorRead:
    try:
        service = DoctorService(db)
        return service.serialize_doctor(service.update_doctor(doctor_id, payload))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
