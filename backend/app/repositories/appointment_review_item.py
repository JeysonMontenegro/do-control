from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment_review_item import AppointmentReviewItem


class AppointmentReviewItemRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, item: AppointmentReviewItem) -> AppointmentReviewItem:
        self.db.add(item)
        self.db.flush()
        return item

    def list(self, *, review_status: str | None = None, limit: int = 100) -> list[AppointmentReviewItem]:
        statement = select(AppointmentReviewItem)
        if review_status:
            statement = statement.where(AppointmentReviewItem.review_status == review_status)
        statement = statement.order_by(AppointmentReviewItem.created_at.desc(), AppointmentReviewItem.id.desc()).limit(limit)
        return list(self.db.scalars(statement))
