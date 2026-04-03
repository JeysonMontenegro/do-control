from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class ExamAnalysisRequest(BaseModel):
    patient_id: int
    attachment_id: int
    encounter_id: int | None = None
    exam_order_id: int | None = None
    requested_by: str | None = None
    source: str = "appoint-me"


class ExamAnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    owner_doctor_id: int | None
    attachment_id: int
    encounter_id: int | None
    exam_order_id: int | None
    source: str
    provider_name: str
    provider_job_id: str | None
    status: str
    review_status: str
    summary: str | None
    anomalies: list[dict[str, Any]] | None
    structured_results: dict[str, Any] | list[Any] | None
    raw_provider_payload: dict[str, Any] | list[Any] | None
    error_message: str | None
    requested_by: str | None
    reviewed_by: str | None
    submitted_at: datetime | None
    completed_at: datetime | None
    reviewed_at: datetime | None
    last_callback_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ExamAnalysisCallbackRequest(BaseModel):
    analysis_id: int
    provider_job_id: str | None = None
    status: Literal["processing", "completed", "failed"]
    summary: str | None = None
    anomalies: list[dict[str, Any]] | None = None
    structured_results: dict[str, Any] | list[Any] | None = None
    error_message: str | None = None
    completed_at: datetime | None = None


class ExamAnalysisReviewUpdateRequest(BaseModel):
    review_status: Literal["pending_review", "reviewed"]
    reviewed_by: str | None = None
