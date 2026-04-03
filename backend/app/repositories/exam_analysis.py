from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exam_analysis import ExamAnalysis


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
