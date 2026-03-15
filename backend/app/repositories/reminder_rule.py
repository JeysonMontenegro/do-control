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

    def list(self) -> list[ReminderRule]:
        return list(
            self.db.scalars(
                select(ReminderRule).order_by(ReminderRule.doctor_id.nullsfirst(), ReminderRule.minutes_before)
            )
        )
