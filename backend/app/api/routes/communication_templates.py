from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.communication_template import (
    CommunicationTemplateCreate,
    CommunicationTemplateRead,
    CommunicationTemplateUpdate,
)
from app.services.communication_template import CommunicationTemplateService
from app.services.errors import NotFoundError

router = APIRouter()


@router.get("", response_model=list[CommunicationTemplateRead])
def list_communication_templates(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "receptionist")),
) -> list[CommunicationTemplateRead]:
    return CommunicationTemplateService(db).list_templates()


@router.post("", response_model=CommunicationTemplateRead, status_code=status.HTTP_201_CREATED)
def create_communication_template(
    payload: CommunicationTemplateCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> CommunicationTemplateRead:
    try:
        return CommunicationTemplateService(db).create_template(payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{template_id}", response_model=CommunicationTemplateRead)
def update_communication_template(
    template_id: int,
    payload: CommunicationTemplateUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> CommunicationTemplateRead:
    try:
        return CommunicationTemplateService(db).update_template(template_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
