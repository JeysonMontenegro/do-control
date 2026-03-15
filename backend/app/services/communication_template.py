import re

from sqlalchemy.orm import Session

from app.models.communication_template import CommunicationTemplate
from app.repositories.communication_template import CommunicationTemplateRepository
from app.repositories.doctor import DoctorRepository
from app.schemas.communication_template import CommunicationTemplateCreate, CommunicationTemplateUpdate
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError


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

        template = self.repository.create(CommunicationTemplate(**payload.model_dump()))
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
