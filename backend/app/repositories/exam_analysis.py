from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exam_analysis import ExamAnalysis, ExamAnalysisEvent


class ExamAnalysisRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, analysis: ExamAnalysis) -> ExamAnalysis:
        self.db.add(analysis)
        self.db.flush()
        return analysis

    def get(self, analysis_id: int) -> ExamAnalysis | None:
        return self.db.get(ExamAnalysis, analysis_id)

    def list_by_attachment(self, attachment_id: int) -> list[ExamAnalysis]:
        return list(
            self.db.scalars(
                select(ExamAnalysis)
                .where(ExamAnalysis.attachment_id == attachment_id)
                .order_by(ExamAnalysis.created_at.desc(), ExamAnalysis.id.desc())
            )
        )

    def create_event(self, event: ExamAnalysisEvent) -> ExamAnalysisEvent:
        self.db.add(event)
        self.db.flush()
        return event

    def get_event(self, *, event_type: str, idempotency_key: str) -> ExamAnalysisEvent | None:
        return self.db.scalar(
            select(ExamAnalysisEvent).where(
                ExamAnalysisEvent.event_type == event_type,
                ExamAnalysisEvent.idempotency_key == idempotency_key,
            )
        )
