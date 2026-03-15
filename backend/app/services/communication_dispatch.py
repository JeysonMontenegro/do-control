from sqlalchemy.orm import Session

from app.models.communication_dispatch import CommunicationDispatch
from app.repositories.appointment import AppointmentRepository
from app.repositories.communication_dispatch import CommunicationDispatchRepository
from app.repositories.communication_template import CommunicationTemplateRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.repositories.reminder_rule import ReminderRuleRepository
from app.schemas.communication_dispatch import CommunicationDispatchCreate, CommunicationDispatchUpdate
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError


class CommunicationDispatchService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = CommunicationDispatchRepository(db)
        self.patient_repository = PatientRepository(db)
        self.doctor_repository = DoctorRepository(db)
        self.appointment_repository = AppointmentRepository(db)
        self.reminder_rule_repository = ReminderRuleRepository(db)
        self.template_repository = CommunicationTemplateRepository(db)

    def list_dispatches(self, *, limit: int = 100) -> list[CommunicationDispatch]:
        return self.repository.list(limit=limit)

    def list_pending_dispatches(self, *, limit: int = 100) -> list[CommunicationDispatch]:
        return self.repository.list_pending(limit=limit)

    def create_dispatch(self, payload: CommunicationDispatchCreate) -> CommunicationDispatch:
        if self.patient_repository.get(payload.patient_id) is None:
            raise NotFoundError("Patient not found.")
        if payload.doctor_id is not None and self.doctor_repository.get(payload.doctor_id) is None:
            raise NotFoundError("Doctor not found.")
        if payload.appointment_id is not None and self.appointment_repository.get(payload.appointment_id) is None:
            raise NotFoundError("Appointment not found.")
        if payload.reminder_rule_id is not None and self.reminder_rule_repository.get(payload.reminder_rule_id) is None:
            raise NotFoundError("Reminder rule not found.")
        if payload.template_id is not None and self.template_repository.get(payload.template_id) is None:
            raise NotFoundError("Communication template not found.")

        dispatch = self.repository.create(CommunicationDispatch(**payload.model_dump()))
        create_audit_log(
            self.db,
            action="create",
            entity_type="communication_dispatch",
            entity_id=str(dispatch.id),
            after_data={"status": dispatch.status, "channel": dispatch.channel},
        )
        self.db.commit()
        self.db.refresh(dispatch)
        return dispatch

    def update_dispatch(self, dispatch_id: int, payload: CommunicationDispatchUpdate) -> CommunicationDispatch:
        dispatch = self.repository.get(dispatch_id)
        if dispatch is None:
            raise NotFoundError("Communication dispatch not found.")

        allowed_statuses = {"pending", "sent", "delivered", "failed"}
        new_status = payload.model_dump(exclude_unset=True).get("status")
        if new_status is not None and new_status not in allowed_statuses:
            raise ValidationError("Invalid communication dispatch status.")

        before = {
            "status": dispatch.status,
            "external_reference": dispatch.external_reference,
            "error_message": dispatch.error_message,
        }
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(dispatch, field, value)

        create_audit_log(
            self.db,
            action="update",
            entity_type="communication_dispatch",
            entity_id=str(dispatch.id),
            before_data=before,
            after_data={
                "status": dispatch.status,
                "external_reference": dispatch.external_reference,
                "error_message": dispatch.error_message,
            },
        )
        self.db.commit()
        self.db.refresh(dispatch)
        return dispatch
