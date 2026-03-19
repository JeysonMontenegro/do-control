from app.models.email_template import EmailTemplate
from app.repositories.email_template import EmailTemplateRepository
from app.schemas.email_template import (
    EmailTemplateCreate,
    EmailTemplatePreviewRead,
    EmailTemplatePreviewRequest,
    EmailTemplateUpdate,
)
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError


ALLOWED_EMAIL_VARIABLES = {
    "app_name",
    "recipient_name",
    "first_name",
    "last_name",
    "email",
    "temporary_password",
    "reset_link",
    "invite_link",
    "expires_in_minutes",
}


class EmailTemplateService:
    def __init__(self, db) -> None:
        self.db = db
        self.repository = EmailTemplateRepository(db)

    def list_templates(self) -> list[EmailTemplate]:
        return self.repository.list()

    def _validate_text(self, value: str) -> None:
        segments = value.split("{")
        invalid: set[str] = set()
        for segment in segments[1:]:
            if "}" not in segment:
                continue
            variable = segment.split("}", 1)[0].strip()
            if variable and variable not in ALLOWED_EMAIL_VARIABLES:
                invalid.add(variable)
        if invalid:
            raise ValidationError(
                f"Invalid email template variables: {sorted(invalid)}. Allowed variables: {sorted(ALLOWED_EMAIL_VARIABLES)}."
            )

    def create_template(self, payload: EmailTemplateCreate) -> EmailTemplate:
        if self.repository.get_by_key(payload.template_key) is not None:
            raise ValidationError("An email template with that key already exists.")
        self._validate_text(payload.subject)
        self._validate_text(payload.html_body)
        if payload.text_body:
            self._validate_text(payload.text_body)
        template = self.repository.create(EmailTemplate(**payload.model_dump()))
        create_audit_log(
            self.db,
            action="create",
            entity_type="email_template",
            entity_id=str(template.id),
            after_data={"template_key": template.template_key},
        )
        self.db.commit()
        self.db.refresh(template)
        return template

    def update_template(self, template_id: int, payload: EmailTemplateUpdate) -> EmailTemplate:
        template = self.repository.get(template_id)
        if template is None:
            raise NotFoundError("Email template not found.")
        updates = payload.model_dump(exclude_unset=True)
        if "subject" in updates:
            self._validate_text(updates["subject"])
        if "html_body" in updates:
            self._validate_text(updates["html_body"])
        if updates.get("text_body"):
            self._validate_text(updates["text_body"])
        for field, value in updates.items():
            setattr(template, field, value)
        create_audit_log(
            self.db,
            action="update",
            entity_type="email_template",
            entity_id=str(template.id),
            after_data={"template_key": template.template_key},
        )
        self.db.commit()
        self.db.refresh(template)
        return template

    @staticmethod
    def render_text(value: str | None, variables: dict[str, object]) -> str | None:
        if value is None:
            return None
        rendered = value
        for key, raw_value in variables.items():
            rendered = rendered.replace(f"{{{key}}}", "" if raw_value is None else str(raw_value))
        return rendered

    def preview_template(self, payload: EmailTemplatePreviewRequest) -> EmailTemplatePreviewRead:
        self._validate_text(payload.subject)
        self._validate_text(payload.html_body)
        if payload.text_body:
            self._validate_text(payload.text_body)
        variables = {key: value or "" for key, value in payload.variables.items()}
        return EmailTemplatePreviewRead(
            rendered_subject=self.render_text(payload.subject, variables) or "",
            rendered_html_body=self.render_text(payload.html_body, variables) or "",
            rendered_text_body=self.render_text(payload.text_body, variables),
        )
