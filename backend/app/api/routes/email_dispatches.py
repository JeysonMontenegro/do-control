from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.email_dispatch import EmailDispatchRead, EmailDispatchResendRequest, EmailDispatchTestRequest
from app.services.email_service import EmailService
from app.services.errors import NotFoundError

router = APIRouter()


@router.get("", response_model=list[EmailDispatchRead])
def list_email_dispatches(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> list[EmailDispatchRead]:
    return EmailService(db).list_dispatches()


@router.post("/{dispatch_id}/resend", response_model=EmailDispatchRead)
def resend_email_dispatch(
    dispatch_id: int,
    payload: EmailDispatchResendRequest,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailDispatchRead:
    try:
        return EmailService(db).resend_dispatch(dispatch_id, recipient_email=payload.recipient_email)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/test", response_model=EmailDispatchRead)
def send_test_email(
    payload: EmailDispatchTestRequest,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailDispatchRead:
    try:
        return EmailService(db).send_test_email(
            recipient_email=payload.recipient_email,
            template_key=payload.template_key,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
