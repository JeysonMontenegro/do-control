from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.appointment import Appointment
from app.models.communication_dispatch import CommunicationDispatch
from app.models.communication_template import CommunicationTemplate
from app.models.encounter import Encounter, ExamOrder
from app.repositories.appointment import AppointmentRepository
from app.repositories.communication_dispatch import CommunicationDispatchRepository
from app.repositories.communication_template import CommunicationTemplateRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.repositories.reminder_rule import ReminderRuleRepository
from app.schemas.communication_dispatch import CommunicationDispatchCreate, CommunicationDispatchUpdate
from app.schemas.communication_dispatch import CommunicationDispatchBatchRequeueRead, CommunicationDispatchSummaryRead
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError


class CommunicationDispatchService:
    MAX_RETRIES = 5

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = CommunicationDispatchRepository(db)
        self.patient_repository = PatientRepository(db)
        self.doctor_repository = DoctorRepository(db)
        self.appointment_repository = AppointmentRepository(db)
        self.reminder_rule_repository = ReminderRuleRepository(db)
        self.template_repository = CommunicationTemplateRepository(db)

    def _next_retry_datetime(self, retry_count: int, *, from_time: datetime) -> datetime:
        backoff_minutes = {
            1: 5,
            2: 15,
            3: 60,
            4: 180,
        }.get(retry_count, 720)
        return from_time + timedelta(minutes=backoff_minutes)

    def render_dispatch_message(self, dispatch: CommunicationDispatch) -> str | None:
        if dispatch.rendered_message:
            return dispatch.rendered_message
        if dispatch.template_id is None:
            return None

        template = self.template_repository.get(dispatch.template_id)
        if template is None:
            return None
        return self.render_template_message(template, dispatch)

    def render_template_message(self, template: CommunicationTemplate, dispatch: CommunicationDispatch) -> str:
        patient = self.patient_repository.get(dispatch.patient_id)
        if patient is None:
            return ""

        doctor_name = ""
        if dispatch.doctor_id is not None:
            doctor = self.doctor_repository.get(dispatch.doctor_id)
            if doctor is not None:
                doctor_name = f"{doctor.first_name} {doctor.last_name}".strip()

        appointment_date = ""
        appointment_time = ""
        if dispatch.appointment_id is not None:
            appointment = self.appointment_repository.get(dispatch.appointment_id)
            if appointment is not None:
                appointment_date = appointment.scheduled_start.strftime("%Y-%m-%d")
                appointment_time = appointment.scheduled_start.strftime("%H:%M UTC")

        return (
            template.body
            .replace("{patient_name}", f"{patient.first_name} {patient.last_name}".strip())
            .replace("{doctor_name}", doctor_name)
            .replace("{appointment_date}", appointment_date)
            .replace("{appointment_time}", appointment_time)
            .replace("{exam_name}", self._exam_name(dispatch.exam_order_id))
            .replace("{expected_date}", self._expected_date_text(dispatch.exam_order_id))
        )

    def _exam_name(self, exam_order_id: int | None) -> str:
        if exam_order_id is None:
            return ""
        exam_order = self.db.get(ExamOrder, exam_order_id)
        return exam_order.exam_name if exam_order is not None else ""

    def _expected_date_text(self, exam_order_id: int | None) -> str:
        if exam_order_id is None:
            return ""
        exam_order = self.db.get(ExamOrder, exam_order_id)
        if exam_order is None or exam_order.expected_date is None:
            return ""
        return exam_order.expected_date.isoformat()

    def generate_due_dispatches(self, *, now: datetime | None = None) -> int:
        current_time = now or datetime.now(timezone.utc)
        created_count = 0
        for rule in self.reminder_rule_repository.list_active():
            if rule.trigger_type == "before_appointment":
                created_count += self._generate_appointment_dispatches(rule.id, current_time)
            elif rule.trigger_type == "on_expected_exam_date":
                created_count += self._generate_exam_dispatches(rule.id, current_time)
        return created_count

    def _generate_appointment_dispatches(self, reminder_rule_id: int, current_time: datetime) -> int:
        rule = self.reminder_rule_repository.get(reminder_rule_id)
        if rule is None:
            return 0

        appointments = list(
            self.db.scalars(select(Appointment).options(selectinload(Appointment.patient)))
        )
        appointments = [
            appointment
            for appointment in appointments
            if appointment.status in {"scheduled", "confirmed"}
            and appointment.scheduled_start >= current_time
            and (rule.doctor_id is None or appointment.doctor_id == rule.doctor_id)
        ]
        appointments.sort(key=lambda appointment: appointment.scheduled_start)

        created = 0
        for appointment in appointments:
            due_datetime = appointment.scheduled_start - timedelta(minutes=rule.minutes_before)
            if due_datetime > current_time:
                continue
            if self.repository.exists_for_appointment_rule(appointment.id, rule.id):
                continue

            template = self.template_repository.find_by_key(rule.template_key, doctor_id=appointment.doctor_id)
            if template is None:
                continue

            dispatch = self.repository.create(
                CommunicationDispatch(
                    patient_id=appointment.patient_id,
                    doctor_id=appointment.doctor_id,
                    appointment_id=appointment.id,
                    reminder_rule_id=rule.id,
                    template_id=template.id,
                    channel=rule.channel,
                    recipient_phone=appointment.patient.primary_phone,
                    status="pending",
                    retry_count=0,
                    next_attempt_at=current_time,
                )
            )
            dispatch.rendered_message = self.render_dispatch_message(dispatch)
            create_audit_log(
                self.db,
                action="generate",
                entity_type="communication_dispatch",
                entity_id=str(dispatch.id),
                after_data={"trigger_type": rule.trigger_type, "appointment_id": appointment.id},
            )
            created += 1
        self.db.commit()
        return created

    def _generate_exam_dispatches(self, reminder_rule_id: int, current_time: datetime) -> int:
        rule = self.reminder_rule_repository.get(reminder_rule_id)
        if rule is None:
            return 0

        target_date = current_time.date()
        exam_orders = list(
            self.db.scalars(
                select(ExamOrder)
                .options(selectinload(ExamOrder.encounter).selectinload(Encounter.patient))
                .where(
                    ExamOrder.expected_date == target_date,
                    ExamOrder.status.in_(["ordered", "pending_result"]),
                )
                .order_by(ExamOrder.id.asc())
            )
        )

        created = 0
        for exam_order in exam_orders:
            encounter = exam_order.encounter
            if encounter is None:
                continue
            if rule.doctor_id is not None and encounter.doctor_id != rule.doctor_id:
                continue
            if self.repository.exists_for_exam_rule(exam_order.id, rule.id):
                continue

            template = self.template_repository.find_by_key(rule.template_key, doctor_id=encounter.doctor_id)
            if template is None:
                continue

            doctor = self.doctor_repository.get(encounter.doctor_id)
            doctor_phone = None
            if doctor is not None:
                doctor_phone = next(
                    (phone.phone_number for phone in doctor.phone_numbers if phone.is_primary and phone.is_active),
                    None,
                )
            if not doctor_phone:
                continue

            dispatch = self.repository.create(
                CommunicationDispatch(
                    patient_id=encounter.patient_id,
                    doctor_id=encounter.doctor_id,
                    exam_order_id=exam_order.id,
                    reminder_rule_id=rule.id,
                    template_id=template.id,
                    channel=rule.channel,
                    recipient_phone=doctor_phone,
                    status="pending",
                    retry_count=0,
                    next_attempt_at=current_time,
                )
            )
            dispatch.rendered_message = self.render_dispatch_message(dispatch)
            create_audit_log(
                self.db,
                action="generate",
                entity_type="communication_dispatch",
                entity_id=str(dispatch.id),
                after_data={"trigger_type": rule.trigger_type, "exam_order_id": exam_order.id},
            )
            created += 1
        self.db.commit()
        return created

    def list_dispatches(
        self,
        *,
        limit: int = 100,
        status: str | None = None,
        channel: str | None = None,
        query: str | None = None,
    ) -> list[CommunicationDispatch]:
        return self.repository.list(limit=limit, status=status, channel=channel, query=query)

    def get_summary(self) -> CommunicationDispatchSummaryRead:
        return CommunicationDispatchSummaryRead(**self.repository.summary())

    def list_pending_dispatches(self, *, limit: int = 100) -> list[CommunicationDispatch]:
        self.generate_due_dispatches()
        dispatches = self.repository.list_pending(limit=limit)
        valid_dispatches: list[CommunicationDispatch] = []
        for dispatch in dispatches:
            if dispatch.rendered_message is None:
                dispatch.rendered_message = self.render_dispatch_message(dispatch)
            if dispatch.rendered_message:
                valid_dispatches.append(dispatch)
        self.db.commit()
        return valid_dispatches

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
        if dispatch.rendered_message is None:
            dispatch.rendered_message = self.render_dispatch_message(dispatch)
        if dispatch.next_attempt_at is None and dispatch.status == "pending":
            dispatch.next_attempt_at = datetime.now(timezone.utc)
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
            "retry_count": dispatch.retry_count,
            "last_attempt_at": dispatch.last_attempt_at.isoformat() if dispatch.last_attempt_at else None,
            "next_attempt_at": dispatch.next_attempt_at.isoformat() if dispatch.next_attempt_at else None,
            "external_reference": dispatch.external_reference,
            "error_message": dispatch.error_message,
        }
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(dispatch, field, value)

        now = datetime.now(timezone.utc)
        requested_status = update_data.get("status")
        if requested_status in {"sent", "delivered", "failed"}:
            dispatch.last_attempt_at = now

        if requested_status == "failed":
            dispatch.retry_count += 1
            if dispatch.retry_count >= self.MAX_RETRIES:
                dispatch.next_attempt_at = None
            else:
                dispatch.status = "pending"
                dispatch.next_attempt_at = self._next_retry_datetime(dispatch.retry_count, from_time=now)
        elif requested_status in {"sent", "delivered"}:
            dispatch.next_attempt_at = None
        elif requested_status == "pending" and dispatch.next_attempt_at is None:
            dispatch.next_attempt_at = now

        create_audit_log(
            self.db,
            action="update",
            entity_type="communication_dispatch",
            entity_id=str(dispatch.id),
            before_data=before,
            after_data={
                "status": dispatch.status,
                "retry_count": dispatch.retry_count,
                "last_attempt_at": dispatch.last_attempt_at.isoformat() if dispatch.last_attempt_at else None,
                "next_attempt_at": dispatch.next_attempt_at.isoformat() if dispatch.next_attempt_at else None,
                "external_reference": dispatch.external_reference,
                "error_message": dispatch.error_message,
            },
        )
        self.db.commit()
        self.db.refresh(dispatch)
        return dispatch

    def requeue_dispatch(self, dispatch_id: int) -> CommunicationDispatch:
        dispatch = self.repository.get(dispatch_id)
        if dispatch is None:
            raise NotFoundError("Communication dispatch not found.")
        if dispatch.status != "failed":
            raise ValidationError("Only failed communication dispatches can be requeued.")

        before = {
            "status": dispatch.status,
            "retry_count": dispatch.retry_count,
            "external_reference": dispatch.external_reference,
            "error_message": dispatch.error_message,
        }
        dispatch.status = "pending"
        dispatch.retry_count = 0
        dispatch.external_reference = None
        dispatch.error_message = None
        dispatch.last_attempt_at = None
        dispatch.next_attempt_at = datetime.now(timezone.utc)
        if dispatch.rendered_message is None:
            dispatch.rendered_message = self.render_dispatch_message(dispatch)

        create_audit_log(
            self.db,
            action="requeue",
            entity_type="communication_dispatch",
            entity_id=str(dispatch.id),
            before_data=before,
            after_data={
                "status": dispatch.status,
                "retry_count": dispatch.retry_count,
                "external_reference": dispatch.external_reference,
                "error_message": dispatch.error_message,
            },
        )
        self.db.commit()
        self.db.refresh(dispatch)
        return dispatch

    def requeue_dispatches(self, dispatch_ids: list[int]) -> CommunicationDispatchBatchRequeueRead:
        requeued_count = 0
        for dispatch_id in dispatch_ids:
            dispatch = self.repository.get(dispatch_id)
            if dispatch is None or dispatch.status != "failed":
                continue
            self.requeue_dispatch(dispatch_id)
            requeued_count += 1
        return CommunicationDispatchBatchRequeueRead(requeued_count=requeued_count)
