from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint("btrim(actor_type) <> ''", name="ck_audit_logs_actor_type_not_blank"),
        CheckConstraint("actor_id IS NULL OR btrim(actor_id) <> ''", name="ck_audit_logs_actor_id_not_blank"),
        CheckConstraint("btrim(action) <> ''", name="ck_audit_logs_action_not_blank"),
        CheckConstraint("btrim(entity_type) <> ''", name="ck_audit_logs_entity_type_not_blank"),
        CheckConstraint("btrim(entity_id) <> ''", name="ck_audit_logs_entity_id_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_type: Mapped[str] = mapped_column(String(30))
    actor_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    entity_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str] = mapped_column(String(100))
    before_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
