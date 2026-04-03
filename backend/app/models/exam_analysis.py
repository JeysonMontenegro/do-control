from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class ExamAnalysis(TimestampMixin, Base):
    __tablename__ = "exam_analyses"
    __table_args__ = (
        Index("ix_exam_analyses_attachment_created", "attachment_id", "created_at", "id"),
        Index("ix_exam_analyses_patient_created", "patient_id", "created_at", "id"),
        Index("ix_exam_analyses_provider_job_id", "provider_job_id"),
        UniqueConstraint("request_idempotency_key", name="uq_exam_analyses_request_idempotency_key"),
        CheckConstraint(
            "status IN ('pending_submission', 'submitted', 'processing', 'completed', 'failed')",
            name="ck_exam_analyses_status",
        ),
        CheckConstraint(
            "review_status IN ('not_ready', 'pending_review', 'reviewed')",
            name="ck_exam_analyses_review_status",
        ),
        CheckConstraint("btrim(source) <> ''", name="ck_exam_analyses_source_not_blank"),
        CheckConstraint("btrim(provider_name) <> ''", name="ck_exam_analyses_provider_name_not_blank"),
        CheckConstraint("requested_by IS NULL OR btrim(requested_by) <> ''", name="ck_exam_analyses_requested_by_not_blank"),
        CheckConstraint(
            "request_idempotency_key IS NULL OR btrim(request_idempotency_key) <> ''",
            name="ck_exam_analyses_request_idempotency_key_not_blank",
        ),
        CheckConstraint("reviewed_by IS NULL OR btrim(reviewed_by) <> ''", name="ck_exam_analyses_reviewed_by_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    owner_doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    attachment_id: Mapped[int] = mapped_column(ForeignKey("file_attachments.id"))
    encounter_id: Mapped[int | None] = mapped_column(ForeignKey("encounters.id"), nullable=True)
    exam_order_id: Mapped[int | None] = mapped_column(ForeignKey("exam_orders.id"), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="integration", server_default="integration")
    provider_name: Mapped[str] = mapped_column(String(50), default="med-ia", server_default="med-ia")
    provider_job_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    request_idempotency_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending_submission", server_default="pending_submission")
    review_status: Mapped[str] = mapped_column(String(30), default="not_ready", server_default="not_ready")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    anomalies: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    structured_results: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    raw_provider_payload: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    requested_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reviewed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_callback_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient = relationship("Patient")
    attachment = relationship("FileAttachment")
    encounter = relationship("Encounter")
    exam_order = relationship("ExamOrder")


class ExamAnalysisEvent(Base):
    __tablename__ = "exam_analysis_events"
    __table_args__ = (
        UniqueConstraint("event_type", "idempotency_key", name="uq_exam_analysis_events_type_key"),
        Index("ix_exam_analysis_events_analysis_created", "analysis_id", "created_at", "id"),
        CheckConstraint("event_type IN ('request', 'callback')", name="ck_exam_analysis_events_event_type"),
        CheckConstraint("btrim(idempotency_key) <> ''", name="ck_exam_analysis_events_idempotency_key_not_blank"),
        CheckConstraint("btrim(payload_hash) <> ''", name="ck_exam_analysis_events_payload_hash_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int | None] = mapped_column(ForeignKey("exam_analyses.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(30))
    idempotency_key: Mapped[str] = mapped_column(String(255))
    payload_hash: Mapped[str] = mapped_column(String(64))
    signature_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    analysis = relationship("ExamAnalysis")
