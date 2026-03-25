from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.appointment import AppointmentPublicCardRead
from app.services.appointment import AppointmentService
from app.services.errors import NotFoundError

router = APIRouter()


@router.get("/{public_id}/card", response_model=AppointmentPublicCardRead)
def get_public_appointment_card(
    public_id: str,
    db: Session = Depends(get_db_session),
) -> AppointmentPublicCardRead:
    try:
        return AppointmentService(db).get_public_card(public_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
