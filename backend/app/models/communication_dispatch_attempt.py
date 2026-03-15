from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class CommunicationDispatchAttempt(TimestampMixin, Base):
    __tablename__ = "communication_dispatch_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    dispatch_id: Mapped[int] = mapped_column(ForeignKey("communication_dispatches.id"))
    attempt_source: Mapped[str] = mapped_column(String(50), default="system", server_default="system")
    result_status: Mapped[str] = mapped_column(String(30))
    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    external_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    rendered_message: Mapped[str | None] = mapped_column(Text, nullable=True)
