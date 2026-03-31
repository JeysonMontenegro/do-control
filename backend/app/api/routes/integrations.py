from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.core.config import settings
from app.schemas.integration import (
    AppointmentActionResponse,
    AppointmentCancelRequest,
    AppointmentCancelResponse,
    AppointmentRescheduleRequest,
    AppointmentRescheduleResponse,
    CommunicationDispatchStatusUpdate,
    DoctorMatchRequest,
    DoctorMatchResponse,
    EmailWhitelistAddressMutation,
    EmailWhitelistAddressMutationRead,
    EmailWhitelistAllowedRead,
    EmailWhitelistStateRead,
    EmailWhitelistToggle,
    DoctorScheduleAppointmentRead,
    DoctorVerificationRead,
    IntegrationUserVerificationRead,
    IntegrationEncounterCreateRequest,
    IntegrationEncounterCreateResponse,
    IntegrationPatientCreateRequest,
    IntegrationPatientCreateResponse,
    IntegrationPatientPhoneUpdateRequest,
    IntegrationPatientPhoneUpdateResponse,
    MessagingWhitelistAllowedRead,
    MessagingWhitelistPhoneMutation,
    MessagingWhitelistPhoneMutationRead,
    MessagingWhitelistStateRead,
    MessagingWhitelistToggle,
    PatientMatchRequest,
    PatientMatchResponse,
    PendingAppointmentRead,
    PendingAppointmentsRead,
    PendingCommunicationDispatchRead,
    ProposedAppointmentRequest,
    ProposedAppointmentResponse,
)
from app.services.errors import ConflictError, NotFoundError, ValidationError
from app.services.email_whitelist import EmailWhitelistService
from app.services.integration import IntegrationService
from app.services.messaging_whitelist import MessagingWhitelistService

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


@router.post("/patients", response_model=IntegrationPatientCreateResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: IntegrationPatientCreateRequest,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> IntegrationPatientCreateResponse:
    try:
        return IntegrationService(db).create_patient(payload)
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/patients/{patient_id}/phone", response_model=IntegrationPatientPhoneUpdateResponse)
def update_patient_phone(
    patient_id: int,
    payload: IntegrationPatientPhoneUpdateRequest,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> IntegrationPatientPhoneUpdateResponse:
    try:
        return IntegrationService(db).update_patient_phone(patient_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/doctors/{doctor_id}", response_model=DoctorVerificationRead)
def verify_doctor(
    doctor_id: int,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> DoctorVerificationRead:
    try:
        return IntegrationService(db).verify_doctor(doctor_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/users/verify", response_model=IntegrationUserVerificationRead)
def verify_user_by_phone(
    phone: str = Query(...),
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> IntegrationUserVerificationRead:
    return IntegrationService(db).verify_user_by_phone(phone)


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
    response: Response,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> ProposedAppointmentResponse:
    result = IntegrationService(db).create_proposed_appointment(payload)
    if result.status == "created":
        response.status_code = status.HTTP_201_CREATED
    elif result.status == "conflict":
        response.status_code = status.HTTP_409_CONFLICT
    return result


@router.post("/appointments/{appointment_id}/confirm", response_model=AppointmentActionResponse)
def confirm_appointment(
    appointment_id: int,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> AppointmentActionResponse:
    try:
        return IntegrationService(db).confirm_appointment(appointment_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/appointments/cancel", response_model=AppointmentCancelResponse)
def cancel_appointment(
    payload: AppointmentCancelRequest,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> AppointmentCancelResponse:
    return IntegrationService(db).cancel_appointment(payload)


@router.post("/appointments/reschedule", response_model=AppointmentRescheduleResponse)
def request_appointment_reschedule(
    payload: AppointmentRescheduleRequest,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> AppointmentRescheduleResponse:
    return IntegrationService(db).request_reschedule(payload)


@router.get("/appointments/schedule", response_model=list[DoctorScheduleAppointmentRead])
def get_doctor_schedule(
    doctor_id: int = Query(...),
    date_value: date = Query(..., alias="date"),
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> list[DoctorScheduleAppointmentRead]:
    try:
        return IntegrationService(db).list_schedule(doctor_id, date_value)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/appointments/pending", response_model=PendingAppointmentsRead)
def get_pending_appointment(
    patient_id: int = Query(...),
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> PendingAppointmentsRead:
    return IntegrationService(db).get_pending_appointment(patient_id)


@router.post("/encounters", response_model=IntegrationEncounterCreateResponse, status_code=status.HTTP_201_CREATED)
def create_encounter(
    payload: IntegrationEncounterCreateRequest,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> IntegrationEncounterCreateResponse:
    try:
        return IntegrationService(db).create_encounter(payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


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
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/messaging/can-send", response_model=MessagingWhitelistAllowedRead)
def can_send_message(
    phone: str = Query(...),
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> MessagingWhitelistAllowedRead:
    return MessagingWhitelistService(db).can_send(phone)


@router.get("/messaging/whitelist", response_model=MessagingWhitelistStateRead)
def get_messaging_whitelist(
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> MessagingWhitelistStateRead:
    return MessagingWhitelistService(db).get_state()


@router.put("/messaging/whitelist", response_model=MessagingWhitelistStateRead)
def update_messaging_whitelist(
    payload: MessagingWhitelistToggle,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> MessagingWhitelistStateRead:
    return MessagingWhitelistService(db).update_enabled(payload)


@router.post("/messaging/whitelist/phones", response_model=MessagingWhitelistPhoneMutationRead)
def add_messaging_whitelist_phone(
    payload: MessagingWhitelistPhoneMutation,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> MessagingWhitelistPhoneMutationRead:
    try:
        return MessagingWhitelistService(db).add_phone(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/messaging/whitelist/phones/{phone}", response_model=MessagingWhitelistPhoneMutationRead)
def remove_messaging_whitelist_phone(
    phone: str,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> MessagingWhitelistPhoneMutationRead:
    try:
        return MessagingWhitelistService(db).remove_phone(phone)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/email/can-send", response_model=EmailWhitelistAllowedRead)
def can_send_email(
    email: str = Query(...),
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> EmailWhitelistAllowedRead:
    try:
        return EmailWhitelistService(db).can_send(email)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/email/whitelist", response_model=EmailWhitelistStateRead)
def get_email_whitelist(
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> EmailWhitelistStateRead:
    return EmailWhitelistService(db).get_state()


@router.put("/email/whitelist", response_model=EmailWhitelistStateRead)
def update_email_whitelist(
    payload: EmailWhitelistToggle,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> EmailWhitelistStateRead:
    return EmailWhitelistService(db).update_enabled(payload)


@router.post("/email/whitelist/addresses", response_model=EmailWhitelistAddressMutationRead)
def add_email_whitelist_address(
    payload: EmailWhitelistAddressMutation,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> EmailWhitelistAddressMutationRead:
    try:
        return EmailWhitelistService(db).add_address(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/email/whitelist/addresses/{email}", response_model=EmailWhitelistAddressMutationRead)
def remove_email_whitelist_address(
    email: str,
    db: Session = Depends(get_db_session),
    _key: str = Depends(require_integration_key),
) -> EmailWhitelistAddressMutationRead:
    try:
        return EmailWhitelistService(db).remove_address(email)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
