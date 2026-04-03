import json
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

from app.core.config import settings
from app.models.exam_analysis import ExamAnalysis
from app.schemas.exam_analysis import ExamAnalysisRequest
from app.services.errors import ValidationError
from app.services.exam_analysis import ExamAnalysisService


class DummySession:
    def __init__(self) -> None:
        self._encounters: dict[int, object] = {}
        self._exam_orders: dict[int, object] = {}

    def add(self, _value) -> None:
        return None

    def flush(self) -> None:
        return None

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None

    def refresh(self, _value) -> None:
        return None

    def get(self, model, identifier: int):
        model_name = getattr(model, "__name__", "")
        if model_name == "Encounter":
            return self._encounters.get(identifier)
        if model_name == "ExamOrder":
            return self._exam_orders.get(identifier)
        return None


class ExamAnalysisServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.db = DummySession()
        self.service = ExamAnalysisService(self.db)

    @patch("app.services.exam_analysis.create_audit_log")
    def test_request_analysis_submits_to_provider_and_returns_submitted(self, _audit_log) -> None:
        patient = SimpleNamespace(
            id=7,
            owner_doctor_id=3,
            first_name="Ana",
            last_name="Lopez",
            medical_record_number="EXP-000007",
            display_name="Anita",
        )
        attachment = SimpleNamespace(
            id=9,
            patient_id=7,
            owner_doctor_id=3,
            encounter_id=12,
            file_name="labs.pdf",
            content_type="application/pdf",
            file_type="lab_result",
            storage_key="patients/7/labs.pdf",
        )
        encounter = SimpleNamespace(
            id=12,
            patient_id=7,
            encounter_date=datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc),
        )
        self.db._encounters[12] = encounter
        self.service.patient_repository = SimpleNamespace(get=lambda _patient_id: patient)
        self.service.attachment_repository = SimpleNamespace(get=lambda _attachment_id: attachment)
        self.service.user_repository = SimpleNamespace(get_by_email=lambda _email: None)
        self.service.storage = SimpleNamespace(
            generate_presigned_download_url=lambda **_kwargs: "https://signed.example/labs.pdf"
        )

        created_items: list[ExamAnalysis] = []

        def create_analysis(analysis: ExamAnalysis) -> ExamAnalysis:
            analysis.id = 22
            analysis.created_at = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
            analysis.updated_at = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
            created_items.append(analysis)
            return analysis

        captured_payload: dict[str, object] = {}

        def submit_to_provider(payload: dict[str, object]) -> dict[str, object]:
            captured_payload.update(payload)
            return {"job_id": "job-123"}

        self.service.repository = SimpleNamespace(
            create=create_analysis,
            get=lambda _analysis_id: None,
            get_event=lambda **_kwargs: None,
            create_event=lambda _event: None,
        )
        self.service._submit_to_provider = submit_to_provider  # type: ignore[method-assign]

        result = self.service.request_analysis(
            ExamAnalysisRequest(
                patient_id=7,
                attachment_id=9,
                encounter_id=12,
                requested_by="agent@appoint.me",
                source="appoint-me",
            ),
            idempotency_key="req-1",
        )

        self.assertEqual(result.id, 22)
        self.assertEqual(result.status, "submitted")
        self.assertEqual(result.review_status, "not_ready")
        self.assertEqual(result.provider_job_id, "job-123")
        self.assertEqual(result.request_idempotency_key, "req-1")
        self.assertEqual(result.source, "appoint-me")
        self.assertEqual(result.owner_doctor_id, 3)
        self.assertEqual(captured_payload["analysis_id"], 22)
        self.assertEqual(captured_payload["request_idempotency_key"], "req-1")
        self.assertEqual(captured_payload["download_url"], "https://signed.example/labs.pdf")
        self.assertEqual(captured_payload["callback_signature_header"], self.service.CALLBACK_SIGNATURE_HEADER)
        self.assertEqual(captured_payload["callback_timestamp_header"], self.service.CALLBACK_TIMESTAMP_HEADER)
        self.assertEqual(captured_payload["callback_idempotency_header"], self.service.IDEMPOTENCY_KEY_HEADER)
        self.assertEqual(created_items[0].requested_by, "agent@appoint.me")

    @patch("app.services.exam_analysis.create_audit_log")
    def test_request_analysis_rejects_non_pdf_attachment(self, _audit_log) -> None:
        patient = SimpleNamespace(id=7, owner_doctor_id=3)
        attachment = SimpleNamespace(
            id=9,
            patient_id=7,
            owner_doctor_id=3,
            encounter_id=None,
            file_name="photo.png",
            content_type="image/png",
            file_type="image",
            storage_key="patients/7/photo.png",
        )
        self.service.patient_repository = SimpleNamespace(get=lambda _patient_id: patient)
        self.service.attachment_repository = SimpleNamespace(get=lambda _attachment_id: attachment)
        self.service.repository = SimpleNamespace(get_event=lambda **_kwargs: None)

        with self.assertRaises(ValidationError) as exc:
            self.service.request_analysis(
                ExamAnalysisRequest(
                    patient_id=7,
                    attachment_id=9,
                    source="appoint-me",
                ),
                idempotency_key="req-2",
            )

        self.assertEqual(str(exc.exception), "Only PDF attachments are supported for exam analysis.")

    @patch("app.services.exam_analysis.create_audit_log")
    def test_request_analysis_falls_back_to_patient_owner_doctor(self, _audit_log) -> None:
        patient = SimpleNamespace(
            id=7,
            owner_doctor_id=11,
            first_name="Ana",
            last_name="Lopez",
            medical_record_number="EXP-000007",
            display_name=None,
        )
        attachment = SimpleNamespace(
            id=9,
            patient_id=7,
            owner_doctor_id=None,
            encounter_id=None,
            file_name="labs.pdf",
            content_type="application/pdf",
            file_type="lab_result",
            storage_key="patients/7/labs.pdf",
        )
        self.service.patient_repository = SimpleNamespace(get=lambda _patient_id: patient)
        self.service.attachment_repository = SimpleNamespace(get=lambda _attachment_id: attachment)
        self.service.user_repository = SimpleNamespace(get_by_email=lambda _email: None)
        self.service.storage = SimpleNamespace(
            generate_presigned_download_url=lambda **_kwargs: "https://signed.example/labs.pdf"
        )

        created_items: list[ExamAnalysis] = []

        def create_analysis(analysis: ExamAnalysis) -> ExamAnalysis:
            analysis.id = 44
            analysis.created_at = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
            analysis.updated_at = datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc)
            created_items.append(analysis)
            return analysis

        self.service.repository = SimpleNamespace(
            create=create_analysis,
            get=lambda _analysis_id: None,
            get_event=lambda **_kwargs: None,
            create_event=lambda _event: None,
        )
        self.service._submit_to_provider = lambda _payload: {"job_id": "job-444"}  # type: ignore[method-assign]

        result = self.service.request_analysis(
            ExamAnalysisRequest(
                patient_id=7,
                attachment_id=9,
                source="appoint-me",
            ),
            idempotency_key="req-fallback-owner",
        )

        self.assertEqual(result.owner_doctor_id, 11)
        self.assertEqual(created_items[0].owner_doctor_id, 11)

    @patch("app.services.exam_analysis.create_audit_log")
    def test_request_analysis_rejects_when_owner_doctor_cannot_be_resolved(self, _audit_log) -> None:
        patient = SimpleNamespace(
            id=7,
            owner_doctor_id=None,
            first_name="Ana",
            last_name="Lopez",
            medical_record_number="EXP-000007",
            display_name=None,
        )
        attachment = SimpleNamespace(
            id=9,
            patient_id=7,
            owner_doctor_id=None,
            encounter_id=None,
            file_name="labs.pdf",
            content_type="application/pdf",
            file_type="lab_result",
            storage_key="patients/7/labs.pdf",
        )
        self.service.patient_repository = SimpleNamespace(get=lambda _patient_id: patient)
        self.service.attachment_repository = SimpleNamespace(get=lambda _attachment_id: attachment)
        self.service.repository = SimpleNamespace(get_event=lambda **_kwargs: None)

        with self.assertRaises(ValidationError) as exc:
            self.service.request_analysis(
                ExamAnalysisRequest(
                    patient_id=7,
                    attachment_id=9,
                    source="appoint-me",
                ),
                idempotency_key="req-no-owner",
            )

        self.assertEqual(str(exc.exception), "Exam analysis must be linked to an owning doctor.")

    @patch("app.services.exam_analysis.create_audit_log")
    def test_request_analysis_returns_existing_for_idempotent_replay(self, _audit_log) -> None:
        analysis = ExamAnalysis(
            id=31,
            patient_id=7,
            owner_doctor_id=3,
            attachment_id=9,
            encounter_id=12,
            exam_order_id=None,
            source="appoint-me",
            provider_name="med-ia",
            request_idempotency_key="req-replay",
            status="submitted",
            review_status="not_ready",
            created_at=datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 31, 12, 5, tzinfo=timezone.utc),
        )
        request_payload = ExamAnalysisRequest(patient_id=7, attachment_id=9, source="appoint-me")
        existing_event = SimpleNamespace(
            analysis_id=31,
            payload_hash=self.service._payload_hash_from_request(request_payload),
        )
        self.service.repository = SimpleNamespace(
            get_event=lambda **_kwargs: existing_event,
            get=lambda _analysis_id: analysis,
        )

        result = self.service.request_analysis(request_payload, idempotency_key="req-replay")

        self.assertEqual(result.id, 31)
        self.assertEqual(result.request_idempotency_key, "req-replay")

    @patch("app.services.exam_analysis.create_audit_log")
    def test_callback_marks_completed_analysis_pending_review(self, _audit_log) -> None:
        analysis = ExamAnalysis(
            id=30,
            patient_id=7,
            owner_doctor_id=3,
            attachment_id=9,
            encounter_id=12,
            exam_order_id=None,
            source="appoint-me",
            provider_name="med-ia",
            request_idempotency_key="req-30",
            status="submitted",
            review_status="not_ready",
            created_at=datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 31, 12, 5, tzinfo=timezone.utc),
        )
        self.service.repository = SimpleNamespace(
            get=lambda _analysis_id: analysis,
            get_event=lambda **_kwargs: None,
            create_event=lambda _event: None,
        )
        raw_body = json.dumps(
            {
                "analysis_id": 30,
                "provider_job_id": "job-777",
                "status": "completed",
                "summary": "Hemograma sin anemia.",
                "anomalies": [{"code": "wbc_high", "severity": "medium"}],
                "structured_results": {"hemoglobin": {"value": 13.2, "unit": "g/dL"}},
            }
        ).encode("utf-8")
        callback_now = datetime(2026, 4, 3, 4, 45, tzinfo=timezone.utc)
        callback_timestamp = str(int(callback_now.timestamp()))

        with (
            patch.object(settings, "med_ia_callback_secret", "test-secret"),
            patch.object(ExamAnalysisService, "_utcnow", return_value=callback_now),
        ):
            signature = self.service.build_callback_signature(raw_body, timestamp=callback_timestamp)
            result = self.service.handle_provider_callback(
                raw_body,
                signature=signature,
                timestamp=callback_timestamp,
                idempotency_key="cb-1",
            )

        self.assertEqual(result.status, "completed")
        self.assertEqual(result.review_status, "pending_review")
        self.assertEqual(result.provider_job_id, "job-777")
        self.assertEqual(result.summary, "Hemograma sin anemia.")
        self.assertEqual(result.anomalies, [{"code": "wbc_high", "severity": "medium"}])
        self.assertEqual(result.structured_results, {"hemoglobin": {"value": 13.2, "unit": "g/dL"}})

    @patch("app.services.exam_analysis.create_audit_log")
    def test_callback_rejects_invalid_signature(self, _audit_log) -> None:
        raw_body = json.dumps({"analysis_id": 30, "status": "processing"}).encode("utf-8")
        callback_now = datetime(2026, 4, 3, 4, 45, tzinfo=timezone.utc)
        callback_timestamp = str(int(callback_now.timestamp()))
        self.service.repository = SimpleNamespace(get_event=lambda **_kwargs: None)

        with (
            patch.object(settings, "med_ia_callback_secret", "test-secret"),
            patch.object(ExamAnalysisService, "_utcnow", return_value=callback_now),
        ):
            with self.assertRaises(ValidationError) as exc:
                self.service.handle_provider_callback(
                    raw_body,
                    signature="sha256=wrong",
                    timestamp=callback_timestamp,
                    idempotency_key="cb-2",
                )

        self.assertEqual(str(exc.exception), "Invalid exam analysis signature.")

    @patch("app.services.exam_analysis.create_audit_log")
    def test_callback_rejects_expired_timestamp(self, _audit_log) -> None:
        raw_body = json.dumps({"analysis_id": 30, "status": "processing"}).encode("utf-8")
        callback_now = datetime(2026, 4, 3, 4, 45, tzinfo=timezone.utc)
        expired_timestamp = str(int(datetime(2026, 4, 3, 4, 30, tzinfo=timezone.utc).timestamp()))
        self.service.repository = SimpleNamespace(get_event=lambda **_kwargs: None)

        with (
            patch.object(settings, "med_ia_callback_secret", "test-secret"),
            patch.object(settings, "med_ia_callback_tolerance_seconds", 60),
            patch.object(ExamAnalysisService, "_utcnow", return_value=callback_now),
        ):
            signature = self.service.build_callback_signature(raw_body, timestamp=expired_timestamp)
            with self.assertRaises(ValidationError) as exc:
                self.service.handle_provider_callback(
                    raw_body,
                    signature=signature,
                    timestamp=expired_timestamp,
                    idempotency_key="cb-3",
                )

        self.assertEqual(str(exc.exception), "Callback timestamp is expired or outside the allowed tolerance.")

    @patch("app.services.exam_analysis.create_audit_log")
    def test_callback_returns_existing_for_idempotent_replay(self, _audit_log) -> None:
        analysis = ExamAnalysis(
            id=40,
            patient_id=7,
            owner_doctor_id=3,
            attachment_id=9,
            encounter_id=12,
            exam_order_id=None,
            source="appoint-me",
            provider_name="med-ia",
            request_idempotency_key="req-40",
            provider_job_id="job-40",
            status="completed",
            review_status="pending_review",
            created_at=datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 31, 12, 5, tzinfo=timezone.utc),
        )
        raw_body = json.dumps({"analysis_id": 40, "status": "completed"}).encode("utf-8")
        existing_event = SimpleNamespace(
            analysis_id=40,
            payload_hash=self.service._payload_hash_from_bytes(raw_body),
        )
        self.service.repository = SimpleNamespace(
            get=lambda _analysis_id: analysis,
            get_event=lambda **_kwargs: existing_event,
        )
        callback_now = datetime(2026, 4, 3, 4, 45, tzinfo=timezone.utc)
        callback_timestamp = str(int(callback_now.timestamp()))

        with (
            patch.object(settings, "med_ia_callback_secret", "test-secret"),
            patch.object(ExamAnalysisService, "_utcnow", return_value=callback_now),
        ):
            signature = self.service.build_callback_signature(raw_body, timestamp=callback_timestamp)
            result = self.service.handle_provider_callback(
                raw_body,
                signature=signature,
                timestamp=callback_timestamp,
                idempotency_key="cb-replay",
            )

        self.assertEqual(result.id, 40)
        self.assertEqual(result.status, "completed")


if __name__ == "__main__":
    unittest.main()
