from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.email_template import (
    EmailTemplateCreate,
    EmailTemplatePreviewRead,
    EmailTemplatePreviewRequest,
    EmailTemplateRead,
    EmailTemplateUpdate,
)
from app.services.email_template import EmailTemplateService
from app.services.errors import NotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=list[EmailTemplateRead])
def list_email_templates(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> list[EmailTemplateRead]:
    return EmailTemplateService(db).list_templates()


@router.post("", response_model=EmailTemplateRead, status_code=status.HTTP_201_CREATED)
def create_email_template(
    payload: EmailTemplateCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailTemplateRead:
    try:
        return EmailTemplateService(db).create_template(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{template_id}", response_model=EmailTemplateRead)
def update_email_template(
    template_id: int,
    payload: EmailTemplateUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailTemplateRead:
    try:
        return EmailTemplateService(db).update_template(template_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/preview", response_model=EmailTemplatePreviewRead)
def preview_email_template(
    payload: EmailTemplatePreviewRequest,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> EmailTemplatePreviewRead:
    try:
        return EmailTemplateService(db).preview_template(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
