from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reminder_rule import ReminderRule


class ReminderRuleRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, reminder_rule: ReminderRule) -> ReminderRule:
        self.db.add(reminder_rule)
        self.db.flush()
        return reminder_rule

    def get(self, reminder_rule_id: int) -> ReminderRule | None:
        return self.db.get(ReminderRule, reminder_rule_id)

    def list(self, *, doctor_ids: set[int] | None = None) -> List[ReminderRule]:
        statement = select(ReminderRule)
        if doctor_ids is not None:
            if not doctor_ids:
                return []
            statement = statement.where(ReminderRule.doctor_id.in_(doctor_ids))
        statement = statement.order_by(ReminderRule.doctor_id.nullsfirst(), ReminderRule.minutes_before)
        return list(self.db.scalars(statement))

    def list_active(self) -> List[ReminderRule]:
        return list(
            self.db.scalars(
                select(ReminderRule)
                .where(ReminderRule.is_active.is_(True))
                .order_by(ReminderRule.doctor_id.nullsfirst(), ReminderRule.minutes_before)
            )
        )
