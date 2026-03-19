from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.email_template import EmailTemplate


class EmailTemplateRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self) -> list[EmailTemplate]:
        return list(self.db.scalars(select(EmailTemplate).order_by(EmailTemplate.template_key)))

    def get(self, template_id: int) -> EmailTemplate | None:
        return self.db.get(EmailTemplate, template_id)

    def get_by_key(self, template_key: str) -> EmailTemplate | None:
        return self.db.scalar(select(EmailTemplate).where(EmailTemplate.template_key == template_key))

    def create(self, template: EmailTemplate) -> EmailTemplate:
        self.db.add(template)
        self.db.flush()
        return template
