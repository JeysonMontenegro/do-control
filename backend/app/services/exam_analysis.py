from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.encounter import Encounter, ExamOrder
from app.models.exam_analysis import ExamAnalysis
from app.repositories.exam_analysis import ExamAnalysisRepository
from app.repositories.file_attachment import FileAttachmentRepository
from app.repositories.patient import PatientRepository
from app.repositories.user import UserRepository
from app.schemas.exam_analysis import ExamAnalysisCallbackRequest, ExamAnalysisRead, ExamAnalysisRequest
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError
from app.services.service_utils import resolve_actor_user_id
from app.services.storage import StorageService


class ExamAnalysisService:
    CALLBACK_SIGNATURE_HEADER = "x-med-ia-signature"

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = ExamAnalysisRepository(db)
        self.attachment_repository = FileAttachmentRepository(db)
        self.patient_repository = PatientRepository(db)
        self.user_repository = UserRepository(db)
        self.storage = StorageService()

    @staticmethod
    def _normalize_optional_text(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @classmethod
    def _normalize_required_text(cls, value: str, *, field_label: str) -> str:
        normalized = cls._normalize_optional_text(value)
        if normalized is None:
            raise ValidationError(f"{field_label} is required.")
        return normalized

    @staticmethod
    def _is_pdf_attachment(attachment) -> bool:
        content_type = (attachment.content_type or "").strip().lower()
        suffix = Path(attachment.file_name or "").suffix.strip().lower()
        return content_type == "application/pdf" or suffix == ".pdf"

    @staticmethod
    def _utcnow() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _callback_url() -> str:
        return f"{settings.app_url.rstrip('/')}/api/integrations/exam-analyses/callback"

    @classmethod
    def _provider_ready(cls) -> bool:
        return bool(
            settings.med_ia_enabled
            and settings.med_ia_base_url
            and settings.med_ia_api_key
            and settings.med_ia_callback_secret
        )

    def _get_analysis(self, analysis_id: int) -> ExamAnalysis:
        analysis = self.repository.get(analysis_id)
        if analysis is None:
            raise NotFoundError("Exam analysis not found.")
        return analysis

    def _submission_payload(self, analysis: ExamAnalysis, patient: Any, attachment: Any, encounter: Any | None, exam_order: Any | None) -> dict[str, Any]:
        download_url = self.storage.generate_presigned_download_url(
            key=attachment.storage_key,
            expires_in_seconds=900,
        )
        patient_name = " ".join(part for part in [patient.first_name, patient.last_name] if part).strip()
        payload: dict[str, Any] = {
            "analysis_id": analysis.id,
            "patient_id": patient.id,
            "attachment_id": attachment.id,
            "source": analysis.source,
            "provider": analysis.provider_name,
            "file_name": attachment.file_name,
            "content_type": attachment.content_type,
            "file_type": attachment.file_type,
            "download_url": download_url,
            "callback_url": self._callback_url(),
            "callback_signature_header": self.CALLBACK_SIGNATURE_HEADER,
            "patient": {
                "patient_id": patient.id,
                "medical_record_number": patient.medical_record_number,
                "patient_name": patient_name,
                "display_name": patient.display_name,
            },
        }
        if encounter is not None:
            payload["encounter"] = {
                "encounter_id": encounter.id,
                "encounter_date": encounter.encounter_date.isoformat() if getattr(encounter, "encounter_date", None) else None,
            }
        if exam_order is not None:
            payload["exam_order"] = {
                "exam_order_id": exam_order.id,
                "exam_name": exam_order.exam_name,
                "exam_category": exam_order.exam_category,
                "expected_date": exam_order.expected_date.isoformat() if exam_order.expected_date is not None else None,
            }
        return payload

    def _submit_to_provider(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self._provider_ready():
            raise ValidationError("Exam analysis provider is not configured.")

        req = request.Request(
            f"{settings.med_ia_base_url.rstrip('/')}/api/exam-analyses",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-api-key": settings.med_ia_api_key or "",
            },
            method="POST",
        )
        with request.urlopen(req, timeout=settings.med_ia_timeout_seconds) as response:
            body = response.read().decode("utf-8").strip()
        return json.loads(body) if body else {}

    @classmethod
    def build_callback_signature(cls, raw_body: bytes) -> str:
        secret = settings.med_ia_callback_secret or ""
        digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        return f"sha256={digest}"

    @classmethod
    def verify_callback_signature(cls, raw_body: bytes, signature: str | None) -> bool:
        if not signature or not settings.med_ia_callback_secret:
            return False
        return hmac.compare_digest(cls.build_callback_signature(raw_body), signature.strip())

    def request_analysis(self, payload: ExamAnalysisRequest) -> ExamAnalysisRead:
        patient = self.patient_repository.get(payload.patient_id)
        if patient is None:
            raise NotFoundError("Patient not found.")

        attachment = self.attachment_repository.get(payload.attachment_id)
        if attachment is None:
            raise NotFoundError("Attachment not found.")
        if attachment.patient_id != patient.id:
            raise ValidationError("Attachment does not belong to the selected patient.")
        if not self._is_pdf_attachment(attachment):
            raise ValidationError("Only PDF attachments are supported for exam analysis.")

        encounter = None
        resolved_encounter_id = payload.encounter_id or attachment.encounter_id
        if resolved_encounter_id is not None:
            encounter = self.db.get(Encounter, resolved_encounter_id)
            if encounter is None:
                raise NotFoundError("Encounter not found.")
            if encounter.patient_id != patient.id:
                raise ValidationError("Encounter does not belong to the selected patient.")

        exam_order = None
        resolved_exam_order_id = payload.exam_order_id
        if resolved_exam_order_id is not None:
            exam_order = self.db.get(ExamOrder, resolved_exam_order_id)
            if exam_order is None:
                raise NotFoundError("Exam order not found.")
            if exam_order.encounter is None or exam_order.encounter.patient_id != patient.id:
                raise ValidationError("Exam order does not belong to the selected patient.")
            if resolved_encounter_id is not None and exam_order.encounter_id != resolved_encounter_id:
                raise ValidationError("Exam order does not belong to the selected encounter.")
            encounter = encounter or exam_order.encounter
            resolved_encounter_id = exam_order.encounter_id

        analysis = self.repository.create(
            ExamAnalysis(
                patient_id=patient.id,
                owner_doctor_id=attachment.owner_doctor_id,
                attachment_id=attachment.id,
                encounter_id=resolved_encounter_id,
                exam_order_id=resolved_exam_order_id,
                source=self._normalize_required_text(payload.source, field_label="Source"),
                provider_name="med-ia",
                status="pending_submission",
                review_status="not_ready",
                requested_by=self._normalize_optional_text(payload.requested_by),
                requested_by_user_id=resolve_actor_user_id(self.user_repository, self._normalize_optional_text(payload.requested_by)),
            )
        )
        create_audit_log(
            self.db,
            action="exam_analysis_requested",
            entity_type="exam_analysis",
            entity_id=str(analysis.id),
            actor_id=analysis.requested_by,
            after_data={
                "patient_id": analysis.patient_id,
                "attachment_id": analysis.attachment_id,
                "encounter_id": analysis.encounter_id,
                "exam_order_id": analysis.exam_order_id,
                "source": analysis.source,
            },
        )

        submission_payload = self._submission_payload(analysis, patient, attachment, encounter, exam_order)
        try:
            provider_response = self._submit_to_provider(submission_payload)
            analysis.provider_job_id = provider_response.get("provider_job_id") or provider_response.get("job_id")
            analysis.status = "submitted"
            analysis.submitted_at = self._utcnow()
            analysis.raw_provider_payload = provider_response or None
            analysis.error_message = None
            create_audit_log(
                self.db,
                action="exam_analysis_submitted",
                entity_type="exam_analysis",
                entity_id=str(analysis.id),
                actor_id=analysis.requested_by,
                after_data={
                    "provider_name": analysis.provider_name,
                    "provider_job_id": analysis.provider_job_id,
                    "status": analysis.status,
                },
            )
        except (ValidationError, error.HTTPError, Exception) as exc:  # noqa: BLE001
            message = str(exc)
            if isinstance(exc, error.HTTPError):
                message = exc.read().decode("utf-8") or str(exc)
            analysis.status = "failed"
            analysis.error_message = message
            create_audit_log(
                self.db,
                action="exam_analysis_submission_failed",
                entity_type="exam_analysis",
                entity_id=str(analysis.id),
                actor_id=analysis.requested_by,
                after_data={"status": analysis.status, "error_message": analysis.error_message},
            )

        self.db.commit()
        self.db.refresh(analysis)
        return ExamAnalysisRead.model_validate(analysis)

    def get_analysis(self, analysis_id: int) -> ExamAnalysisRead:
        return ExamAnalysisRead.model_validate(self._get_analysis(analysis_id))

    def list_attachment_analyses(
        self,
        attachment_id: int,
        *,
        accessible_doctor_ids: set[int] | None = None,
    ) -> list[ExamAnalysisRead]:
        attachment = self.attachment_repository.get(attachment_id)
        if attachment is None:
            raise NotFoundError("Attachment not found.")
        if accessible_doctor_ids is not None and attachment.owner_doctor_id not in accessible_doctor_ids:
            raise NotFoundError("Attachment not found.")
        return [ExamAnalysisRead.model_validate(item) for item in self.repository.list_by_attachment(attachment_id)]

    def update_review_status(
        self,
        *,
        attachment_id: int,
        analysis_id: int,
        review_status: str,
        reviewed_by: str | None,
        accessible_doctor_ids: set[int] | None = None,
    ) -> ExamAnalysisRead:
        attachment = self.attachment_repository.get(attachment_id)
        if attachment is None:
            raise NotFoundError("Attachment not found.")
        if accessible_doctor_ids is not None and attachment.owner_doctor_id not in accessible_doctor_ids:
            raise NotFoundError("Attachment not found.")

        analysis = self._get_analysis(analysis_id)
        if analysis.attachment_id != attachment.id:
            raise ValidationError("Exam analysis does not belong to the selected attachment.")
        if analysis.status != "completed":
            raise ValidationError("Only completed exam analyses can be reviewed.")

        normalized_reviewed_by = self._normalize_optional_text(reviewed_by)
        previous_review_status = analysis.review_status
        analysis.review_status = review_status
        analysis.reviewed_by = normalized_reviewed_by if review_status == "reviewed" else None
        analysis.reviewed_by_user_id = (
            resolve_actor_user_id(self.user_repository, normalized_reviewed_by)
            if review_status == "reviewed"
            else None
        )
        analysis.reviewed_at = self._utcnow() if review_status == "reviewed" else None

        create_audit_log(
            self.db,
            action="exam_analysis_review_updated",
            entity_type="exam_analysis",
            entity_id=str(analysis.id),
            actor_id=normalized_reviewed_by,
            before_data={"review_status": previous_review_status},
            after_data={"review_status": analysis.review_status, "reviewed_by": analysis.reviewed_by},
        )
        self.db.commit()
        self.db.refresh(analysis)
        return ExamAnalysisRead.model_validate(analysis)

    def handle_provider_callback(self, raw_body: bytes, *, signature: str | None) -> ExamAnalysisRead:
        if not self.verify_callback_signature(raw_body, signature):
            raise ValidationError("Invalid exam analysis signature.")

        try:
            payload = ExamAnalysisCallbackRequest.model_validate_json(raw_body)
        except PydanticValidationError as exc:
            raise ValidationError(str(exc)) from exc

        analysis = self._get_analysis(payload.analysis_id)
        analysis.provider_job_id = payload.provider_job_id or analysis.provider_job_id
        analysis.status = payload.status
        analysis.summary = payload.summary
        analysis.anomalies = payload.anomalies
        analysis.structured_results = payload.structured_results
        analysis.raw_provider_payload = json.loads(raw_body.decode("utf-8"))
        analysis.error_message = payload.error_message
        analysis.last_callback_at = self._utcnow()
        analysis.reviewed_by = None
        analysis.reviewed_by_user_id = None
        analysis.reviewed_at = None
        if payload.status == "completed":
            analysis.review_status = "pending_review"
            analysis.completed_at = payload.completed_at or self._utcnow()
        elif payload.status == "failed":
            analysis.review_status = "not_ready"
            analysis.completed_at = payload.completed_at or self._utcnow()
        else:
            analysis.review_status = "not_ready"

        create_audit_log(
            self.db,
            action="exam_analysis_callback_received",
            entity_type="exam_analysis",
            entity_id=str(analysis.id),
            after_data={
                "status": analysis.status,
                "review_status": analysis.review_status,
                "provider_job_id": analysis.provider_job_id,
            },
        )
        self.db.commit()
        self.db.refresh(analysis)
        return ExamAnalysisRead.model_validate(analysis)
