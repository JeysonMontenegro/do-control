from sqlalchemy.orm import Session

from app.models.reminder_rule import ReminderRule
from app.models.user import User
from app.repositories.doctor import DoctorRepository
from app.repositories.reminder_rule import ReminderRuleRepository
from app.schemas.reminder_rule import ReminderRuleCreate, ReminderRuleUpdate
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError


class ReminderRuleService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ReminderRuleRepository(db)
        self.doctor_repository = DoctorRepository(db)

    def _scoped_doctor_ids(self, current_user: User) -> set[int] | None:
        roles = {user_role.role.name for user_role in current_user.roles}
        if "admin" in roles:
            return None
        if "doctor" in roles:
            if current_user.doctor_profile is None:
                return set()
            return {current_user.doctor_profile.id}
        if "receptionist" in roles:
            return {assignment.doctor_id for assignment in current_user.receptionist_assignments}
        return set()

    def list_rules(self, *, current_user: User) -> list[ReminderRule]:
        return self.repository.list(doctor_ids=self._scoped_doctor_ids(current_user))

    def create_rule(self, payload: ReminderRuleCreate, *, current_user: User) -> ReminderRule:
        scoped_doctor_ids = self._scoped_doctor_ids(current_user)
        if scoped_doctor_ids is not None:
            if payload.doctor_id is None or payload.doctor_id not in scoped_doctor_ids:
                raise ValidationError("You can only create reminder rules for your own doctor scope.")
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

    def update_rule(self, reminder_rule_id: int, payload: ReminderRuleUpdate, *, current_user: User) -> ReminderRule:
        rule = self.repository.get(reminder_rule_id)
        if rule is None:
            raise NotFoundError("Reminder rule not found.")
        scoped_doctor_ids = self._scoped_doctor_ids(current_user)
        if scoped_doctor_ids is not None and rule.doctor_id not in scoped_doctor_ids:
            raise NotFoundError("Reminder rule not found.")

        updates = payload.model_dump(exclude_unset=True)
        doctor_id = updates.get("doctor_id")
        if scoped_doctor_ids is not None and doctor_id is not None and doctor_id not in scoped_doctor_ids:
            raise ValidationError("You can only assign reminder rules inside your own doctor scope.")
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
