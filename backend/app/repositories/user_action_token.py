from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user_action_token import UserActionToken


class UserActionTokenRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, token: UserActionToken) -> UserActionToken:
        self.db.add(token)
        self.db.flush()
        return token

    def get_active_by_hash(self, token_hash: str, *, action_type: str) -> UserActionToken | None:
        return self.db.scalar(
            select(UserActionToken).where(
                UserActionToken.token_hash == token_hash,
                UserActionToken.action_type == action_type,
                UserActionToken.used_at.is_(None),
                UserActionToken.expires_at > datetime.now(timezone.utc),
            )
        )

    def list_active(self, *, action_type: str) -> list[UserActionToken]:
        return list(
            self.db.scalars(
                select(UserActionToken).where(
                    UserActionToken.action_type == action_type,
                    UserActionToken.used_at.is_(None),
                    UserActionToken.expires_at > datetime.now(timezone.utc),
                )
            )
        )
