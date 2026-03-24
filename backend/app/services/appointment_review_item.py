from sqlalchemy.orm import Session

from app.models.appointment_review_item import AppointmentReviewItem
from app.models.user import User
from app.schemas.appointment import AppointmentCreate
from app.schemas.appointment_review_item import AppointmentReviewItemResolveRequest
from app.repositories.appointment_review_item import AppointmentReviewItemRepository
from app.services.appointment import AppointmentService
from app.schemas.appointment_review_item import AppointmentReviewItemRead
from app.services.audit import create_audit_log
from app.services.doctor_scope import scoped_doctor_ids_for_user
from app.services.errors import NotFoundError, ValidationError


class AppointmentReviewItemService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = AppointmentReviewItemRepository(db)
        self.appointment_service = AppointmentService(db)

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

    def list_items(
        self,
        *,
        current_user: User,
        review_status: str | None = "pending_review",
        limit: int = 100,
    ) -> list[AppointmentReviewItemRead]:
        doctor_ids = scoped_doctor_ids_for_user(current_user)
        return [
            AppointmentReviewItemRead.model_validate(item)
            for item in self.repository.list(review_status=review_status, limit=limit, doctor_ids=doctor_ids)
        ]

    def resolve_item(self, item_id: int, payload: AppointmentReviewItemResolveRequest, *, current_user: User) -> AppointmentReviewItemRead:
        item = self.repository.get(item_id)
        if item is None:
            raise NotFoundError("Appointment review item not found.")

        doctor_ids = scoped_doctor_ids_for_user(current_user)
        if doctor_ids is not None and (item.doctor_id is None or item.doctor_id not in doctor_ids):
            raise NotFoundError("Appointment review item not found.")

        if item.review_status != "pending_review":
            raise ValidationError("Appointment review item has already been resolved.")

        before = {
            "review_status": item.review_status,
            "existing_appointment_id": item.existing_appointment_id,
        }

        if payload.action == "reject":
            item.review_status = "rejected"
            item.review_message = payload.note or item.review_message
        elif payload.action == "link_existing":
            if payload.appointment_id is None:
                raise ValidationError("appointment_id is required to link an existing appointment.")
            if self.appointment_service.repository.get(payload.appointment_id) is None:
                raise NotFoundError("Appointment not found.")
            item.existing_appointment_id = payload.appointment_id
            item.review_status = "resolved"
            item.review_message = payload.note or "Linked to existing appointment."
        elif payload.action == "create_appointment":
            if payload.patient_id is None:
                raise ValidationError("patient_id is required to create an appointment from review item.")
            doctor_id = payload.doctor_id or item.doctor_id
            if doctor_id is None:
                raise ValidationError("doctor_id is required to create an appointment when the review item has no resolved doctor.")
            created = self.appointment_service.create_appointment(
                AppointmentCreate(
                    patient_id=payload.patient_id,
                    doctor_id=doctor_id,
                    scheduled_start=item.scheduled_start,
                    scheduled_end=item.scheduled_end,
                    appointment_type=item.appointment_type,
                    reason=item.reason,
                    source=item.source,
                    created_by=payload.changed_by or "manual-review",
                )
            )
            item.existing_appointment_id = created.id
            item.review_status = "resolved"
            item.review_message = payload.note or "Appointment created from manual review."
            item.doctor_id = doctor_id
        else:
            raise ValidationError("Unsupported review action.")

        create_audit_log(
            self.db,
            action="resolve",
            entity_type="appointment_review_item",
            entity_id=str(item.id),
            actor_id=payload.changed_by,
            before_data=before,
            after_data={"review_status": item.review_status, "existing_appointment_id": item.existing_appointment_id},
        )
        self.db.commit()
        self.db.refresh(item)
        return AppointmentReviewItemRead.model_validate(item)
