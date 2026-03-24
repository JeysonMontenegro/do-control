from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin


class UserPhoneNumber(TimestampMixin, Base):
    __tablename__ = "user_phone_numbers"
    __table_args__ = (
        UniqueConstraint("user_id", "phone_number", name="uq_user_phone_numbers_user_phone"),
        UniqueConstraint("phone_number", name="uq_user_phone_numbers_phone_number"),
        CheckConstraint("length(btrim(phone_number)) > 0", name="ck_user_phone_numbers_not_blank"),
        Index("ix_user_phone_numbers_phone_number", "phone_number"),
        Index("ix_user_phone_numbers_user_primary", "user_id", "is_primary"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(30))
    phone_type: Mapped[str] = mapped_column("type", String(30), default="mobile", server_default="mobile")
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    can_talk_to_bot: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    user = relationship("User", back_populates="phone_numbers")
