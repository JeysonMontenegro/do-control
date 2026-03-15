from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.communication_template import CommunicationTemplate


class CommunicationTemplateRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, template: CommunicationTemplate) -> CommunicationTemplate:
        self.db.add(template)
        self.db.flush()
        return template

    def get(self, template_id: int) -> CommunicationTemplate | None:
        return self.db.get(CommunicationTemplate, template_id)

    def list(self) -> list[CommunicationTemplate]:
        return list(
            self.db.scalars(
                select(CommunicationTemplate).order_by(
                    CommunicationTemplate.doctor_id.nullsfirst(),
                    CommunicationTemplate.channel,
                    CommunicationTemplate.template_key,
                )
            )
        )
