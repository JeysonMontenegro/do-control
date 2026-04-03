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

        self.service.repository = SimpleNamespace(create=create_analysis, get=lambda _analysis_id: None)
        self.service._submit_to_provider = submit_to_provider  # type: ignore[method-assign]

        result = self.service.request_analysis(
            ExamAnalysisRequest(
                patient_id=7,
                attachment_id=9,
                encounter_id=12,
                requested_by="agent@appoint.me",
                source="appoint-me",
            )
        )

        self.assertEqual(result.id, 22)
        self.assertEqual(result.status, "submitted")
        self.assertEqual(result.review_status, "not_ready")
        self.assertEqual(result.provider_job_id, "job-123")
        self.assertEqual(result.source, "appoint-me")
        self.assertEqual(captured_payload["analysis_id"], 22)
        self.assertEqual(captured_payload["download_url"], "https://signed.example/labs.pdf")
        self.assertEqual(captured_payload["callback_signature_header"], self.service.CALLBACK_SIGNATURE_HEADER)
        self.assertEqual(created_items[0].requested_by, "agent@appoint.me")

    @patch("app.services.exam_analysis.create_audit_log")
    def test_request_analysis_rejects_non_pdf_attachment(self, _audit_log) -> None:
        patient = SimpleNamespace(id=7)
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

        with self.assertRaises(ValidationError) as exc:
            self.service.request_analysis(
                ExamAnalysisRequest(
                    patient_id=7,
                    attachment_id=9,
                    source="appoint-me",
                )
            )

        self.assertEqual(str(exc.exception), "Only PDF attachments are supported for exam analysis.")

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
            status="submitted",
            review_status="not_ready",
            created_at=datetime(2026, 3, 31, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 31, 12, 5, tzinfo=timezone.utc),
        )
        self.service.repository = SimpleNamespace(get=lambda _analysis_id: analysis)
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

        with patch.object(settings, "med_ia_callback_secret", "test-secret"):
            signature = self.service.build_callback_signature(raw_body)
            result = self.service.handle_provider_callback(raw_body, signature=signature)

        self.assertEqual(result.status, "completed")
        self.assertEqual(result.review_status, "pending_review")
        self.assertEqual(result.provider_job_id, "job-777")
        self.assertEqual(result.summary, "Hemograma sin anemia.")
        self.assertEqual(result.anomalies, [{"code": "wbc_high", "severity": "medium"}])
        self.assertEqual(result.structured_results, {"hemoglobin": {"value": 13.2, "unit": "g/dL"}})

    @patch("app.services.exam_analysis.create_audit_log")
    def test_callback_rejects_invalid_signature(self, _audit_log) -> None:
        raw_body = json.dumps({"analysis_id": 30, "status": "processing"}).encode("utf-8")

        with patch.object(settings, "med_ia_callback_secret", "test-secret"):
            with self.assertRaises(ValidationError) as exc:
                self.service.handle_provider_callback(raw_body, signature="sha256=wrong")

        self.assertEqual(str(exc.exception), "Invalid exam analysis signature.")


if __name__ == "__main__":
    unittest.main()
