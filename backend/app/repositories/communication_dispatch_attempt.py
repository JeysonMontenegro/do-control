from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.communication_dispatch_attempt import CommunicationDispatchAttempt


class CommunicationDispatchAttemptRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, attempt: CommunicationDispatchAttempt) -> CommunicationDispatchAttempt:
        self.db.add(attempt)
        self.db.flush()
        return attempt

    def list_for_dispatch(self, dispatch_id: int, *, limit: int = 50) -> List[CommunicationDispatchAttempt]:
        return list(
            self.db.scalars(
                select(CommunicationDispatchAttempt)
                .where(CommunicationDispatchAttempt.dispatch_id == dispatch_id)
                .order_by(CommunicationDispatchAttempt.attempted_at.desc(), CommunicationDispatchAttempt.id.desc())
                .limit(limit)
            )
        )
