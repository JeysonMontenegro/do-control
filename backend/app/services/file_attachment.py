from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.file_attachment import FileAttachment
from app.repositories.encounter import EncounterRepository
from app.repositories.file_attachment import FileAttachmentRepository
from app.repositories.patient import PatientRepository
from app.repositories.user import UserRepository
from app.schemas.file_attachment import FileAttachmentDeleteRead, FileAttachmentDownloadRead
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError
from app.services.service_utils import resolve_actor_user_id
from app.services.storage import StorageService


class FileAttachmentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = FileAttachmentRepository(db)
        self.patient_repository = PatientRepository(db)
        self.encounter_repository = EncounterRepository(db)
        self.storage = StorageService()
        self.user_repository = UserRepository(db)

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

    def upload_attachment(
        self,
        *,
        patient_id: int,
        encounter_id: int | None,
        file_type: str,
        file_name: str,
        content_type: str | None,
        content: bytes,
        uploaded_by: str | None,
        accessible_doctor_ids: set[int] | None = None,
    ) -> FileAttachment:
        normalized_file_type = self._normalize_required_text(file_type, field_label="File type")
        normalized_file_name = self._normalize_required_text(file_name, field_label="File name")
        normalized_content_type = self._normalize_optional_text(content_type)
        normalized_uploaded_by = self._normalize_optional_text(uploaded_by)
        if not content:
            raise ValidationError("Attachment content is required.")

        patient = self.patient_repository.get(patient_id)
        if patient is None:
            raise NotFoundError("Patient not found.")
        if accessible_doctor_ids is not None and patient.owner_doctor_id not in accessible_doctor_ids:
            raise NotFoundError("Patient not found.")

        owner_doctor_id = patient.owner_doctor_id
        if encounter_id is not None:
            encounter = self.encounter_repository.get(encounter_id)
            if encounter is None:
                raise NotFoundError("Encounter not found.")
            if encounter.patient_id != patient_id:
                raise ValidationError("Encounter does not belong to the selected patient.")
            if accessible_doctor_ids is not None and encounter.doctor_id not in accessible_doctor_ids:
                raise NotFoundError("Encounter not found.")
            owner_doctor_id = encounter.owner_doctor_id or encounter.doctor_id or owner_doctor_id

        suffix = Path(normalized_file_name).suffix
        key = f"patients/{patient_id}/{uuid4()}{suffix}"
        self.storage.ensure_bucket()
        self.storage.upload_bytes(key=key, content=content, content_type=normalized_content_type)

        attachment = self.repository.create(
            FileAttachment(
                patient_id=patient_id,
                owner_doctor_id=owner_doctor_id,
                encounter_id=encounter_id,
                file_type=normalized_file_type,
                file_name=normalized_file_name,
                storage_key=key,
                content_type=normalized_content_type,
                file_size=len(content),
                uploaded_by=normalized_uploaded_by,
                uploaded_by_user_id=resolve_actor_user_id(self.user_repository, normalized_uploaded_by),
            )
        )
        create_audit_log(
            self.db,
            action="upload",
            entity_type="file_attachment",
            entity_id=str(attachment.id),
            actor_id=normalized_uploaded_by,
            after_data={"patient_id": patient_id, "encounter_id": encounter_id, "file_type": normalized_file_type},
        )
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def get_download_url(
        self,
        attachment_id: int,
        *,
        requested_by: str | None = None,
        accessible_doctor_ids: set[int] | None = None,
    ) -> FileAttachmentDownloadRead:
        attachment = self.repository.get(attachment_id)
        if attachment is None:
            raise NotFoundError("Attachment not found.")
        if accessible_doctor_ids is not None and attachment.owner_doctor_id not in accessible_doctor_ids:
            raise NotFoundError("Attachment not found.")

        expires_in_seconds = 900
        download_url = self.storage.generate_presigned_download_url(
            key=attachment.storage_key,
            expires_in_seconds=expires_in_seconds,
        )
        create_audit_log(
            self.db,
            action="download_link_generated",
            entity_type="file_attachment",
            entity_id=str(attachment.id),
            actor_id=requested_by,
            after_data={"storage_key": attachment.storage_key},
        )
        self.db.commit()
        return FileAttachmentDownloadRead(
            attachment_id=attachment.id,
            file_name=attachment.file_name,
            download_url=download_url,
            expires_in_seconds=expires_in_seconds,
        )

    def get_attachment_content(
        self,
        attachment_id: int,
        *,
        requested_by: str | None = None,
        accessible_doctor_ids: set[int] | None = None,
    ) -> tuple[FileAttachment, object]:
        attachment = self.repository.get(attachment_id)
        if attachment is None:
            raise NotFoundError("Attachment not found.")
        if accessible_doctor_ids is not None and attachment.owner_doctor_id not in accessible_doctor_ids:
            raise NotFoundError("Attachment not found.")

        response = self.storage.get_object(key=attachment.storage_key)
        create_audit_log(
            self.db,
            action="download",
            entity_type="file_attachment",
            entity_id=str(attachment.id),
            actor_id=requested_by,
            after_data={"storage_key": attachment.storage_key},
        )
        self.db.commit()
        return attachment, response["Body"]

    def delete_attachment(
        self,
        attachment_id: int,
        *,
        deleted_by: str | None = None,
        accessible_doctor_ids: set[int] | None = None,
    ) -> FileAttachmentDeleteRead:
        attachment = self.repository.get(attachment_id)
        if attachment is None:
            raise NotFoundError("Attachment not found.")
        if accessible_doctor_ids is not None and attachment.owner_doctor_id not in accessible_doctor_ids:
            raise NotFoundError("Attachment not found.")

        self.storage.delete_object(key=attachment.storage_key)
        self.repository.delete(attachment)
        create_audit_log(
            self.db,
            action="delete",
            entity_type="file_attachment",
            entity_id=str(attachment_id),
            actor_id=deleted_by,
            before_data={
                "patient_id": attachment.patient_id,
                "encounter_id": attachment.encounter_id,
                "file_name": attachment.file_name,
                "storage_key": attachment.storage_key,
            },
        )
        self.db.commit()
        return FileAttachmentDeleteRead(attachment_id=attachment_id, status="deleted")
