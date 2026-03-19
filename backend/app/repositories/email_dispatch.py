from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.email_dispatch import EmailDispatch


class EmailDispatchRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, dispatch: EmailDispatch) -> EmailDispatch:
        self.db.add(dispatch)
        self.db.flush()
        return dispatch

    def get(self, dispatch_id: int) -> EmailDispatch | None:
        return self.db.get(EmailDispatch, dispatch_id)

    def list(self) -> list[EmailDispatch]:
        return list(self.db.scalars(select(EmailDispatch).order_by(EmailDispatch.created_at.desc(), EmailDispatch.id.desc())))
