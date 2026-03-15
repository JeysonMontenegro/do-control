from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.file_attachment import FileAttachment
from app.repositories.encounter import EncounterRepository
from app.repositories.file_attachment import FileAttachmentRepository
from app.repositories.patient import PatientRepository
from app.schemas.file_attachment import FileAttachmentDownloadRead
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError
from app.services.storage import StorageService


class FileAttachmentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = FileAttachmentRepository(db)
        self.patient_repository = PatientRepository(db)
        self.encounter_repository = EncounterRepository(db)
        self.storage = StorageService()

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
    ) -> FileAttachment:
        patient = self.patient_repository.get(patient_id)
        if patient is None:
            raise NotFoundError("Patient not found.")

        if encounter_id is not None:
            encounter = self.encounter_repository.get(encounter_id)
            if encounter is None:
                raise NotFoundError("Encounter not found.")
            if encounter.patient_id != patient_id:
                raise ValidationError("Encounter does not belong to the selected patient.")

        suffix = Path(file_name).suffix
        key = f"patients/{patient_id}/{uuid4()}{suffix}"
        self.storage.ensure_bucket()
        self.storage.upload_bytes(key=key, content=content, content_type=content_type)

        attachment = self.repository.create(
            FileAttachment(
                patient_id=patient_id,
                encounter_id=encounter_id,
                file_type=file_type,
                file_name=file_name,
                storage_key=key,
                content_type=content_type,
                file_size=len(content),
                uploaded_by=uploaded_by,
            )
        )
        create_audit_log(
            self.db,
            action="upload",
            entity_type="file_attachment",
            entity_id=str(attachment.id),
            actor_id=uploaded_by,
            after_data={"patient_id": patient_id, "encounter_id": encounter_id, "file_type": file_type},
        )
        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def get_download_url(self, attachment_id: int, *, requested_by: str | None = None) -> FileAttachmentDownloadRead:
        attachment = self.repository.get(attachment_id)
        if attachment is None:
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

    def get_attachment_content(self, attachment_id: int, *, requested_by: str | None = None) -> tuple[FileAttachment, object]:
        attachment = self.repository.get(attachment_id)
        if attachment is None:
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
