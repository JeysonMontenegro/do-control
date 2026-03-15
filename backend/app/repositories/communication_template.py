from typing import List

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

    def list(self) -> List[CommunicationTemplate]:
        return list(
            self.db.scalars(
                select(CommunicationTemplate).order_by(
                    CommunicationTemplate.doctor_id.nullsfirst(),
                    CommunicationTemplate.channel,
                    CommunicationTemplate.template_key,
                )
            )
        )

    def find_by_key(self, template_key: str, *, doctor_id: int | None = None) -> CommunicationTemplate | None:
        if doctor_id is not None:
            doctor_specific = self.db.scalar(
                select(CommunicationTemplate).where(
                    CommunicationTemplate.template_key == template_key,
                    CommunicationTemplate.doctor_id == doctor_id,
                    CommunicationTemplate.is_active.is_(True),
                )
            )
            if doctor_specific is not None:
                return doctor_specific

        return self.db.scalar(
            select(CommunicationTemplate).where(
                CommunicationTemplate.template_key == template_key,
                CommunicationTemplate.doctor_id.is_(None),
                CommunicationTemplate.is_active.is_(True),
            )
        )
