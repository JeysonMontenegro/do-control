from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.receptionist import ReceptionistCreate, ReceptionistRead
from app.services.errors import NotFoundError, ValidationError
from app.services.receptionist import ReceptionistService

router = APIRouter()


@router.get("", response_model=list[ReceptionistRead])
def list_receptionists(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> list[ReceptionistRead]:
    return ReceptionistService(db).list_receptionists()


@router.post("", response_model=ReceptionistRead, status_code=status.HTTP_201_CREATED)
def create_receptionist(
    payload: ReceptionistCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> ReceptionistRead:
    try:
        return ReceptionistService(db).create_receptionist(payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
