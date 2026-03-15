from typing import List

from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.communication_dispatch import CommunicationDispatch


class CommunicationDispatchRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, dispatch: CommunicationDispatch) -> CommunicationDispatch:
        self.db.add(dispatch)
        self.db.flush()
        return dispatch

    def get(self, dispatch_id: int) -> CommunicationDispatch | None:
        return self.db.get(CommunicationDispatch, dispatch_id)

    def list(self, *, limit: int = 100) -> List[CommunicationDispatch]:
        return list(
            self.db.scalars(
                select(CommunicationDispatch)
                .order_by(CommunicationDispatch.created_at.desc(), CommunicationDispatch.id.desc())
                .limit(limit)
            )
        )

    def list_pending(self, *, limit: int = 100, current_time: datetime | None = None) -> List[CommunicationDispatch]:
        now = current_time or datetime.now(timezone.utc)
        return list(
            self.db.scalars(
                select(CommunicationDispatch)
                .where(
                    CommunicationDispatch.status == "pending",
                    or_(
                        CommunicationDispatch.next_attempt_at.is_(None),
                        CommunicationDispatch.next_attempt_at <= now,
                    ),
                )
                .order_by(
                    CommunicationDispatch.next_attempt_at.asc().nullsfirst(),
                    CommunicationDispatch.created_at.asc(),
                    CommunicationDispatch.id.asc(),
                )
                .limit(limit)
            )
        )

    def exists_for_appointment_rule(self, appointment_id: int, reminder_rule_id: int) -> bool:
        statement = (
            select(CommunicationDispatch.id)
            .where(
                CommunicationDispatch.appointment_id == appointment_id,
                CommunicationDispatch.reminder_rule_id == reminder_rule_id,
            )
            .limit(1)
        )
        return self.db.scalar(statement) is not None

    def exists_for_exam_rule(self, exam_order_id: int, reminder_rule_id: int) -> bool:
        statement = (
            select(CommunicationDispatch.id)
            .where(
                CommunicationDispatch.exam_order_id == exam_order_id,
                CommunicationDispatch.reminder_rule_id == reminder_rule_id,
            )
            .limit(1)
        )
        return self.db.scalar(statement) is not None
