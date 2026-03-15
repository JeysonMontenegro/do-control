from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.core.config import settings
from app.schemas.integration import (
    CommunicationDispatchStatusUpdate,
    DoctorMatchRequest,
    DoctorMatchResponse,
    PatientMatchRequest,
    PatientMatchResponse,
    PendingCommunicationDispatchRead,
    ProposedAppointmentRequest,
    ProposedAppointmentResponse,
)
from app.services.errors import ValidationError
from app.services.integration import IntegrationService

router = APIRouter()


def require_integration_key(x_integration_key: str = Header(...)) -> str:
    expected_key = getattr(settings, "integration_api_key", "appoint-me-dev-key")
    if x_integration_key != expected_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid integration key.")
    return x_integration_key


@router.post("/patients/match", response_model=PatientMatchResponse)
def match_patient(
    payload: PatientMatchRequest,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> PatientMatchResponse:
    return IntegrationService(db).match_patient(payload)


@router.post("/doctors/match", response_model=DoctorMatchResponse)
def match_doctor(
    payload: DoctorMatchRequest,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> DoctorMatchResponse:
    return IntegrationService(db).match_doctor(payload)


@router.post("/appointments/proposed", response_model=ProposedAppointmentResponse)
def create_proposed_appointment(
    payload: ProposedAppointmentRequest,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> ProposedAppointmentResponse:
    return IntegrationService(db).create_proposed_appointment(payload)


@router.get("/communication-dispatches/pending", response_model=list[PendingCommunicationDispatchRead])
def list_pending_communication_dispatches(
    limit: int = 100,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> list[PendingCommunicationDispatchRead]:
    return IntegrationService(db).list_pending_dispatches(limit=limit)


@router.patch("/communication-dispatches/{dispatch_id}/status", response_model=PendingCommunicationDispatchRead)
def update_communication_dispatch_status(
    dispatch_id: int,
    payload: CommunicationDispatchStatusUpdate,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> PendingCommunicationDispatchRead:
    try:
        return IntegrationService(db).update_dispatch_status(dispatch_id, payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
