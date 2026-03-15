from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.encounter import Encounter


class EncounterRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, encounter: Encounter) -> Encounter:
        self.db.add(encounter)
        self.db.flush()
        return encounter

    def get(self, encounter_id: int) -> Encounter | None:
        return self.db.get(Encounter, encounter_id)

    def list(self) -> list[Encounter]:
        return list(self.db.scalars(select(Encounter).order_by(Encounter.encounter_date.desc())))
