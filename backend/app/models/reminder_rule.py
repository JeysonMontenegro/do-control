from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.base import TimestampMixin


class ReminderRule(TimestampMixin, Base):
    __tablename__ = "reminder_rules"
    __table_args__ = (
        Index("ix_reminder_rules_doctor_minutes", "doctor_id", "minutes_before"),
        Index("ix_reminder_rules_active_doctor_minutes", "is_active", "doctor_id", "minutes_before"),
        Index(
            "uq_reminder_rules_global_trigger_channel_minutes",
            "trigger_type",
            "channel",
            "minutes_before",
            unique=True,
            postgresql_where=text("doctor_id IS NULL"),
        ),
        Index(
            "uq_reminder_rules_doctor_trigger_channel_minutes",
            "doctor_id",
            "trigger_type",
            "channel",
            "minutes_before",
            unique=True,
            postgresql_where=text("doctor_id IS NOT NULL"),
        ),
        CheckConstraint("channel IN ('whatsapp')", name="ck_reminder_rules_channel"),
        CheckConstraint("trigger_type IN ('before_appointment', 'on_expected_exam_date')", name="ck_reminder_rules_trigger_type"),
        CheckConstraint("btrim(template_key) <> ''", name="ck_reminder_rules_template_key_not_blank"),
        CheckConstraint("minutes_before > 0", name="ck_reminder_rules_minutes_before_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    owner_doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(30), default="whatsapp", server_default="whatsapp")
    trigger_type: Mapped[str] = mapped_column(String(30), default="before_appointment", server_default="before_appointment")
    minutes_before: Mapped[int] = mapped_column(Integer)
    template_key: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
