from sqlalchemy.orm import Session

from app.models.reminder_rule import ReminderRule
from app.repositories.doctor import DoctorRepository
from app.repositories.reminder_rule import ReminderRuleRepository
from app.schemas.reminder_rule import ReminderRuleCreate, ReminderRuleUpdate
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError


class ReminderRuleService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ReminderRuleRepository(db)
        self.doctor_repository = DoctorRepository(db)

    def list_rules(self) -> list[ReminderRule]:
        return self.repository.list()

    def create_rule(self, payload: ReminderRuleCreate) -> ReminderRule:
        if payload.doctor_id is not None and self.doctor_repository.get(payload.doctor_id) is None:
            raise NotFoundError("Doctor not found.")

        rule = self.repository.create(ReminderRule(**payload.model_dump()))
        create_audit_log(
            self.db,
            action="create",
            entity_type="reminder_rule",
            entity_id=str(rule.id),
            after_data={"doctor_id": rule.doctor_id, "minutes_before": rule.minutes_before},
        )
        self.db.commit()
        self.db.refresh(rule)
        return rule

    def update_rule(self, reminder_rule_id: int, payload: ReminderRuleUpdate) -> ReminderRule:
        rule = self.repository.get(reminder_rule_id)
        if rule is None:
            raise NotFoundError("Reminder rule not found.")

        updates = payload.model_dump(exclude_unset=True)
        doctor_id = updates.get("doctor_id")
        if doctor_id is not None and self.doctor_repository.get(doctor_id) is None:
            raise NotFoundError("Doctor not found.")

        before = {
            "doctor_id": rule.doctor_id,
            "minutes_before": rule.minutes_before,
            "template_key": rule.template_key,
            "is_active": rule.is_active,
        }
        for field, value in updates.items():
            setattr(rule, field, value)

        create_audit_log(
            self.db,
            action="update",
            entity_type="reminder_rule",
            entity_id=str(rule.id),
            before_data=before,
            after_data={
                "doctor_id": rule.doctor_id,
                "minutes_before": rule.minutes_before,
                "template_key": rule.template_key,
                "is_active": rule.is_active,
            },
        )
        self.db.commit()
        self.db.refresh(rule)
        return rule
