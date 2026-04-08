from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.services.doctor import DoctorService
from app.schemas.communication_dispatch import (
    CommunicationDispatchAttemptRead,
    CommunicationDispatchBatchRequeueRead,
    CommunicationDispatchBatchRequeueRequest,
    CommunicationDispatchCreate,
    CommunicationDispatchGenerationRead,
    CommunicationDispatchRead,
    CommunicationDispatchSummaryRead,
    CommunicationDispatchUpdate,
)
from app.services.communication_dispatch import CommunicationDispatchService
from app.services.errors import NotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=list[CommunicationDispatchRead])
def list_communication_dispatches(
    limit: int = 100,
    status_filter: str | None = None,
    channel: str | None = None,
    query: str | None = None,
    patient_id: int | None = None,
    doctor_id: int | None = None,
    appointment_id: int | None = None,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[CommunicationDispatchRead]:
    current_roles = {user_role.role.name for user_role in current_user.roles}
    if "doctor" in current_roles and patient_id is None and appointment_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctors must filter communication dispatches by patient or appointment.",
        )
    accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
    if accessible_doctor_ids is not None and doctor_id is not None and doctor_id not in accessible_doctor_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication dispatch not found.")
    return CommunicationDispatchService(db).list_dispatches(
        limit=limit,
        status=status_filter,
        channel=channel,
        query=query,
        patient_id=patient_id,
        doctor_id=doctor_id,
        appointment_id=appointment_id,
        accessible_doctor_ids=accessible_doctor_ids,
    )


@router.get("/summary", response_model=CommunicationDispatchSummaryRead)
def get_communication_dispatch_summary(
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "receptionist")),
) -> CommunicationDispatchSummaryRead:
    accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
    return CommunicationDispatchService(db).get_summary(accessible_doctor_ids=accessible_doctor_ids)


@router.post("/appointments/{appointment_id}/send-now", response_model=CommunicationDispatchRead, status_code=status.HTTP_201_CREATED)
def send_appointment_reminder_now(
    appointment_id: int,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> CommunicationDispatchRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return CommunicationDispatchService(db).send_appointment_reminder_now(
            appointment_id,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/generate", response_model=CommunicationDispatchGenerationRead)
def generate_communication_dispatches(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> CommunicationDispatchGenerationRead:
    created_count = CommunicationDispatchService(db).generate_due_dispatches()
    return CommunicationDispatchGenerationRead(created_count=created_count)


@router.post("/requeue-batch", response_model=CommunicationDispatchBatchRequeueRead)
def requeue_communication_dispatches_batch(
    payload: CommunicationDispatchBatchRequeueRequest,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> CommunicationDispatchBatchRequeueRead:
    return CommunicationDispatchService(db).requeue_dispatches(payload.dispatch_ids)


@router.get("/{dispatch_id}/attempts", response_model=list[CommunicationDispatchAttemptRead])
def list_communication_dispatch_attempts(
    dispatch_id: int,
    limit: int = 50,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "receptionist")),
) -> list[CommunicationDispatchAttemptRead]:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return CommunicationDispatchService(db).list_attempts(
            dispatch_id,
            limit=limit,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("", response_model=CommunicationDispatchRead, status_code=status.HTTP_201_CREATED)
def create_communication_dispatch(
    payload: CommunicationDispatchCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> CommunicationDispatchRead:
    try:
        return CommunicationDispatchService(db).create_dispatch(payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{dispatch_id}", response_model=CommunicationDispatchRead)
def update_communication_dispatch(
    dispatch_id: int,
    payload: CommunicationDispatchUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> CommunicationDispatchRead:
    try:
        return CommunicationDispatchService(db).update_dispatch(dispatch_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{dispatch_id}/requeue", response_model=CommunicationDispatchRead)
def requeue_communication_dispatch(
    dispatch_id: int,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> CommunicationDispatchRead:
    try:
        return CommunicationDispatchService(db).requeue_dispatch(dispatch_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
