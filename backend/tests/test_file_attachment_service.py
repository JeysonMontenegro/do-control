import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from app.schemas.file_attachment import FileAttachmentDeleteRead
from app.services.file_attachment import FileAttachmentService


class DummySession:
    def commit(self) -> None:
        return None


class FileAttachmentServiceDeleteTests(unittest.TestCase):
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
