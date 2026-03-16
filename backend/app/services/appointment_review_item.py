from sqlalchemy.orm import Session

from app.models.appointment_review_item import AppointmentReviewItem
from app.repositories.appointment_review_item import AppointmentReviewItemRepository
from app.schemas.appointment_review_item import AppointmentReviewItemRead
from app.services.audit import create_audit_log


class AppointmentReviewItemService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = AppointmentReviewItemRepository(db)

    def create_item(
        self,
        *,
        patient_name: str,
        phone_number: str,
        doctor_id: int | None,
        doctor_name: str | None,
        doctor_phone_number: str | None,
        scheduled_start,
        scheduled_end,
        appointment_type: str,
        reason: str | None,
        source: str,
        review_reason: str,
        review_message: str,
        existing_appointment_id: int | None = None,
    ) -> AppointmentReviewItem:
        item = self.repository.create(
            AppointmentReviewItem(
                patient_name=patient_name,
                phone_number=phone_number,
                doctor_id=doctor_id,
                doctor_name=doctor_name,
                doctor_phone_number=doctor_phone_number,
                scheduled_start=scheduled_start,
                scheduled_end=scheduled_end,
                appointment_type=appointment_type,
                reason=reason,
                source=source,
                review_reason=review_reason,
                review_message=review_message,
                existing_appointment_id=existing_appointment_id,
            )
        )
        create_audit_log(
            self.db,
            action="create",
            entity_type="appointment_review_item",
            entity_id=str(item.id),
            after_data={"review_reason": item.review_reason, "review_status": item.review_status},
        )
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_items(self, *, review_status: str | None = "pending_review", limit: int = 100) -> list[AppointmentReviewItemRead]:
        return [AppointmentReviewItemRead.model_validate(item) for item in self.repository.list(review_status=review_status, limit=limit)]
