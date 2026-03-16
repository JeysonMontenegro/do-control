from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.appointment import AppointmentCreate, AppointmentHistoryRead, AppointmentRead, AppointmentStatusUpdate
from app.services.appointment import AppointmentService
from app.services.errors import ConflictError, NotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=list[AppointmentRead])
def list_appointments(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[AppointmentRead]:
    return AppointmentService(db).list_appointments()


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "receptionist")),
) -> AppointmentRead:
    try:
        return AppointmentService(db).create_appointment(payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (ConflictError, ValidationError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{appointment_id}/status", response_model=AppointmentRead)
def update_appointment_status(
    appointment_id: int,
    payload: AppointmentStatusUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "receptionist")),
) -> AppointmentRead:
    try:
        return AppointmentService(db).update_status(appointment_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{appointment_id}/history", response_model=list[AppointmentHistoryRead])
def list_appointment_history(
    appointment_id: int,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[AppointmentHistoryRead]:
    try:
        return AppointmentService(db).list_history(appointment_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
