from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.repositories.audit import AuditRepository


def create_audit_log(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: str,
    actor_id: str | None = None,
    before_data: dict | None = None,
    after_data: dict | None = None,
    metadata: dict | None = None,
) -> None:
    repository = AuditRepository(db)
    repository.create(
        AuditLog(
            actor_type="user",
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_data=before_data,
            after_data=after_data,
            metadata_json=metadata,
            created_at=datetime.now(timezone.utc),
        ),
    )
