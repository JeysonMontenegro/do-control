import re

from sqlalchemy.orm import Session

from app.models.communication_dispatch import CommunicationDispatch
from app.models.communication_template import CommunicationTemplate
from app.models.encounter import ExamOrder
from app.repositories.appointment import AppointmentRepository
from app.repositories.communication_template import CommunicationTemplateRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.schemas.communication_template import (
    CommunicationTemplateCreate,
    CommunicationTemplatePreviewRead,
    CommunicationTemplatePreviewRequest,
    CommunicationTemplateUpdate,
)
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError
from app.services.communication_dispatch import CommunicationDispatchService


class CommunicationTemplateService:
    ALLOWED_VARIABLES = {
        "patient_name",
        "doctor_name",
        "appointment_date",
        "appointment_time",
        "exam_name",
        "expected_date",
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = CommunicationTemplateRepository(db)
        self.doctor_repository = DoctorRepository(db)
        self.patient_repository = PatientRepository(db)
        self.appointment_repository = AppointmentRepository(db)

    def _validate_template_body(self, body: str) -> None:
        variables = set(re.findall(r"\{([a-z_]+)\}", body))
        invalid_variables = sorted(variable for variable in variables if variable not in self.ALLOWED_VARIABLES)
        if invalid_variables:
            allowed = ", ".join(sorted(self.ALLOWED_VARIABLES))
            invalid = ", ".join(invalid_variables)
            raise ValidationError(
                f"Invalid template variables: {invalid}. Allowed variables: {allowed}."
            )

    def list_templates(self) -> list[CommunicationTemplate]:
        return self.repository.list()

    def create_template(self, payload: CommunicationTemplateCreate) -> CommunicationTemplate:
        if payload.doctor_id is not None and self.doctor_repository.get(payload.doctor_id) is None:
            raise NotFoundError("Doctor not found.")
        self._validate_template_body(payload.body)

        template = self.repository.create(CommunicationTemplate(**payload.model_dump(), owner_doctor_id=payload.doctor_id))
        create_audit_log(
            self.db,
            action="create",
            entity_type="communication_template",
            entity_id=str(template.id),
            after_data={"template_key": template.template_key, "channel": template.channel},
        )
        self.db.commit()
        self.db.refresh(template)
        return template

    def update_template(self, template_id: int, payload: CommunicationTemplateUpdate) -> CommunicationTemplate:
        template = self.repository.get(template_id)
        if template is None:
            raise NotFoundError("Communication template not found.")

        updates = payload.model_dump(exclude_unset=True)
        doctor_id = updates.get("doctor_id")
        if doctor_id is not None and self.doctor_repository.get(doctor_id) is None:
            raise NotFoundError("Doctor not found.")
        body = updates.get("body")
        if body is not None:
            self._validate_template_body(body)

        before = {
            "doctor_id": template.doctor_id,
            "template_key": template.template_key,
            "channel": template.channel,
            "is_active": template.is_active,
        }
        for field, value in updates.items():
            setattr(template, field, value)

        create_audit_log(
            self.db,
            action="update",
            entity_type="communication_template",
            entity_id=str(template.id),
            before_data=before,
            after_data={
                "doctor_id": template.doctor_id,
                "template_key": template.template_key,
                "channel": template.channel,
                "is_active": template.is_active,
            },
        )
        self.db.commit()
        self.db.refresh(template)
        return template

    def preview_template(self, payload: CommunicationTemplatePreviewRequest) -> CommunicationTemplatePreviewRead:
        self._validate_template_body(payload.body)

        patient_id = payload.patient_id
        doctor_id = payload.doctor_id

        if payload.appointment_id is not None:
            appointment = self.appointment_repository.get(payload.appointment_id)
            if appointment is None:
                raise NotFoundError("Appointment not found.")
            patient_id = patient_id or appointment.patient_id
            doctor_id = doctor_id or appointment.doctor_id

        if payload.exam_order_id is not None:
            exam_order = self.db.get(ExamOrder, payload.exam_order_id)
            if exam_order is None:
                raise NotFoundError("Exam order not found.")
            if exam_order.encounter is None:
                raise NotFoundError("Exam order encounter not found.")
            patient_id = patient_id or exam_order.encounter.patient_id
            doctor_id = doctor_id or exam_order.encounter.doctor_id

        if patient_id is not None and self.patient_repository.get(patient_id) is None:
            raise NotFoundError("Patient not found.")
        if doctor_id is not None and self.doctor_repository.get(doctor_id) is None:
            raise NotFoundError("Doctor not found.")

        preview_template = CommunicationTemplate(
            doctor_id=doctor_id,
            owner_doctor_id=doctor_id,
            channel=payload.channel,
            template_key=payload.template_key,
            title=payload.title,
            body=payload.body,
            is_active=True,
        )
        preview_dispatch = CommunicationDispatch(
            patient_id=patient_id or 0,
            doctor_id=doctor_id,
            appointment_id=payload.appointment_id,
            exam_order_id=payload.exam_order_id,
            template_id=None,
            reminder_rule_id=None,
            channel=payload.channel,
            recipient_phone="preview",
            status="pending",
            rendered_message=None,
        )
        rendered_message = CommunicationDispatchService(self.db).render_template_message(
            preview_template,
            preview_dispatch,
        )
        return CommunicationTemplatePreviewRead(
            rendered_message=rendered_message,
            patient_id=patient_id,
            doctor_id=doctor_id,
            appointment_id=payload.appointment_id,
            exam_order_id=payload.exam_order_id,
        )
