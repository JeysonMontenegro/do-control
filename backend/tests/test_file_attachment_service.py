import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.schemas.file_attachment import FileAttachmentDeleteRead
from app.services.errors import ValidationError
from app.services.file_attachment import FileAttachmentService


class DummySession:
    def refresh(self, _value) -> None:
        return None

    def commit(self) -> None:
        return None


class FileAttachmentServiceTests(unittest.TestCase):
    @patch("app.services.file_attachment.create_audit_log")
    def test_upload_attachment_falls_back_to_patient_owner_doctor(self, _audit_log) -> None:
        service = FileAttachmentService(DummySession())
        patient = SimpleNamespace(id=3, owner_doctor_id=5)
        created_items = []

        def create_attachment(attachment):
            attachment.id = 17
            attachment.created_at = datetime(2026, 4, 3, 15, 0, tzinfo=timezone.utc)
            attachment.updated_at = datetime(2026, 4, 3, 15, 0, tzinfo=timezone.utc)
            created_items.append(attachment)
            return attachment

        service.patient_repository = SimpleNamespace(get=Mock(return_value=patient))
        service.encounter_repository = SimpleNamespace(get=Mock())
        service.repository = SimpleNamespace(create=create_attachment)
        service.storage = SimpleNamespace(ensure_bucket=Mock(), upload_bytes=Mock())
        service.user_repository = SimpleNamespace(get_by_email=lambda _email: None)

        result = service.upload_attachment(
            patient_id=3,
            encounter_id=None,
            file_type="lab_result",
            file_name="laboratorio.pdf",
            content_type="application/pdf",
            content=b"demo-pdf",
            uploaded_by="frontend-demo",
            accessible_doctor_ids={5},
        )

        self.assertEqual(result.owner_doctor_id, 5)
        self.assertEqual(created_items[0].owner_doctor_id, 5)

    @patch("app.services.file_attachment.create_audit_log")
    def test_upload_attachment_rejects_when_owner_doctor_cannot_be_resolved(self, _audit_log) -> None:
        service = FileAttachmentService(DummySession())
        patient = SimpleNamespace(id=3, owner_doctor_id=None)

        service.patient_repository = SimpleNamespace(get=Mock(return_value=patient))
        service.encounter_repository = SimpleNamespace(get=Mock())

        with self.assertRaises(ValidationError) as exc:
            service.upload_attachment(
                patient_id=3,
                encounter_id=None,
                file_type="lab_result",
                file_name="laboratorio.pdf",
                content_type="application/pdf",
                content=b"demo-pdf",
                uploaded_by="frontend-demo",
                accessible_doctor_ids=None,
            )

        self.assertEqual(str(exc.exception), "File attachment must be linked to an owning doctor.")

    @patch("app.services.file_attachment.create_audit_log")
    def test_delete_attachment_removes_storage_object_and_row(self, _audit_log) -> None:
        service = FileAttachmentService(DummySession())
        attachment = SimpleNamespace(
            id=7,
            patient_id=3,
            encounter_id=11,
            owner_doctor_id=5,
            file_name="laboratorio.pdf",
            storage_key="patients/3/demo.pdf",
        )
        repository = SimpleNamespace(get=Mock(return_value=attachment), delete=Mock())
        storage = SimpleNamespace(delete_object=Mock())

        service.repository = repository
        service.storage = storage

        result = service.delete_attachment(7, deleted_by="frontend-demo", accessible_doctor_ids={5})

        self.assertEqual(result, FileAttachmentDeleteRead(attachment_id=7, status="deleted"))
        storage.delete_object.assert_called_once_with(key="patients/3/demo.pdf")
        repository.delete.assert_called_once_with(attachment)


if __name__ == "__main__":
    unittest.main()
