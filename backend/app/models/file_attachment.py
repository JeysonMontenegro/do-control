from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class FileAttachment(TimestampMixin, Base):
    __tablename__ = "file_attachments"
    __table_args__ = (
        Index("ix_file_attachments_patient_created", "patient_id", "created_at", "id"),
        Index("ix_file_attachments_encounter_id", "encounter_id"),
        CheckConstraint("uploaded_by IS NULL OR btrim(uploaded_by) <> ''", name="ck_file_attachments_uploaded_by_not_blank"),
        CheckConstraint("btrim(file_type) <> ''", name="ck_file_attachments_file_type_not_blank"),
        CheckConstraint("btrim(file_name) <> ''", name="ck_file_attachments_file_name_not_blank"),
        CheckConstraint("btrim(storage_key) <> ''", name="ck_file_attachments_storage_key_not_blank"),
        CheckConstraint("content_type IS NULL OR btrim(content_type) <> ''", name="ck_file_attachments_content_type_not_blank"),
        CheckConstraint("file_size IS NULL OR file_size > 0", name="ck_file_attachments_file_size_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    owner_doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=False)
    encounter_id: Mapped[int | None] = mapped_column(ForeignKey("encounters.id"), nullable=True)
    file_type: Mapped[str] = mapped_column(String(50))
    file_name: Mapped[str] = mapped_column(String(255))
    storage_key: Mapped[str] = mapped_column(String(500), unique=True)
    content_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    uploaded_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    uploaded_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    patient = relationship("Patient")
    encounter = relationship("Encounter")
