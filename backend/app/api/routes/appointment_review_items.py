from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.appointment_review_item import AppointmentReviewItemRead, AppointmentReviewItemResolveRequest
from app.services.appointment_review_item import AppointmentReviewItemService
from app.services.errors import NotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=list[AppointmentReviewItemRead])
def list_appointment_review_items(
    review_status: str | None = "pending_review",
    limit: int = 100,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[AppointmentReviewItemRead]:
    return AppointmentReviewItemService(db).list_items(review_status=review_status, limit=limit)


@router.post("/{item_id}/resolve", response_model=AppointmentReviewItemRead)
def resolve_appointment_review_item(
    item_id: int,
    payload: AppointmentReviewItemResolveRequest,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> AppointmentReviewItemRead:
    try:
        return AppointmentReviewItemService(db).resolve_item(item_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
