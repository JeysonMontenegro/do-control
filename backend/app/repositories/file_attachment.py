from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.file_attachment import FileAttachment


class FileAttachmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, attachment: FileAttachment) -> FileAttachment:
        self.db.add(attachment)
        self.db.flush()
        return attachment

    def get(self, attachment_id: int) -> FileAttachment | None:
        return self.db.get(FileAttachment, attachment_id)

    def list_by_patient(self, patient_id: int) -> list[FileAttachment]:
        return list(
            self.db.scalars(
                select(FileAttachment)
                .where(FileAttachment.patient_id == patient_id)
                .order_by(FileAttachment.created_at.desc()),
            )
        )

    def delete(self, attachment: FileAttachment) -> None:
        self.db.delete(attachment)
        self.db.flush()
