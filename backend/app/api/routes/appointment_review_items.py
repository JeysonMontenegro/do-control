from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.appointment_review_item import AppointmentReviewItemRead
from app.services.appointment_review_item import AppointmentReviewItemService

router = APIRouter()


@router.get("", response_model=list[AppointmentReviewItemRead])
def list_appointment_review_items(
    review_status: str | None = "pending_review",
    limit: int = 100,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[AppointmentReviewItemRead]:
    return AppointmentReviewItemService(db).list_items(review_status=review_status, limit=limit)
