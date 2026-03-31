from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, require_roles
from app.schemas.integration import (
    MessagingConversationMessageRead,
    MessagingConversationRead,
    MessagingConversationSendRequest,
    MessagingConversationSendResponse,
)
from app.services.appointme_inbox import AppointMeInboxService
from app.services.doctor_scope import scoped_doctor_ids_for_user
from app.services.errors import ValidationError


router = APIRouter()


def _resolve_target_doctor_id(current_user, requested_doctor_id: int | None) -> int:
    scoped_doctor_ids = scoped_doctor_ids_for_user(current_user)
    if scoped_doctor_ids is None:
        if requested_doctor_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor id is required.")
        return requested_doctor_id
    if not scoped_doctor_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have doctor inbox access.")
    if requested_doctor_id is None:
        if len(scoped_doctor_ids) == 1:
            return next(iter(scoped_doctor_ids))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor id is required.")
    if requested_doctor_id not in scoped_doctor_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to that doctor inbox.")
    return requested_doctor_id


@router.get(
    "/conversations",
    response_model=list[MessagingConversationRead],
    dependencies=[Depends(require_roles("admin", "doctor", "receptionist"))],
)
def list_conversations(
    doctor_id: int | None = Query(None),
    current_user=Depends(get_current_user),
) -> list[MessagingConversationRead]:
    try:
        target_doctor_id = _resolve_target_doctor_id(current_user, doctor_id)
        return AppointMeInboxService().list_conversations(doctor_id=target_doctor_id)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get(
    "/conversations/{patient_phone}/messages",
    response_model=list[MessagingConversationMessageRead],
    dependencies=[Depends(require_roles("admin", "doctor", "receptionist"))],
)
def list_conversation_messages(
    patient_phone: str,
    doctor_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
) -> list[MessagingConversationMessageRead]:
    try:
        target_doctor_id = _resolve_target_doctor_id(current_user, doctor_id)
        return AppointMeInboxService().list_messages(
            doctor_id=target_doctor_id,
            patient_phone=patient_phone,
            limit=limit,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/messages/send",
    response_model=MessagingConversationSendResponse,
    dependencies=[Depends(require_roles("admin", "doctor", "receptionist"))],
)
def send_message(
    payload: MessagingConversationSendRequest,
    current_user=Depends(get_current_user),
) -> MessagingConversationSendResponse:
    try:
        target_doctor_id = _resolve_target_doctor_id(current_user, payload.doctor_id)
        return AppointMeInboxService().send_message(payload.model_copy(update={"doctor_id": target_doctor_id}))
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
