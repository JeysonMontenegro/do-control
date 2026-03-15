from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.communication_dispatch import (
    CommunicationDispatchCreate,
    CommunicationDispatchRead,
    CommunicationDispatchUpdate,
)
from app.services.communication_dispatch import CommunicationDispatchService
from app.services.errors import NotFoundError

router = APIRouter()


@router.get("", response_model=list[CommunicationDispatchRead])
def list_communication_dispatches(
    limit: int = 100,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "receptionist")),
) -> list[CommunicationDispatchRead]:
    return CommunicationDispatchService(db).list_dispatches(limit=limit)


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
