from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.reminder_rule import ReminderRuleCreate, ReminderRuleRead, ReminderRuleUpdate
from app.services.errors import NotFoundError
from app.services.reminder_rule import ReminderRuleService

router = APIRouter()


@router.get("", response_model=list[ReminderRuleRead])
def list_reminder_rules(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "receptionist")),
) -> list[ReminderRuleRead]:
    return ReminderRuleService(db).list_rules()


@router.post("", response_model=ReminderRuleRead, status_code=status.HTTP_201_CREATED)
def create_reminder_rule(
    payload: ReminderRuleCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> ReminderRuleRead:
    try:
        return ReminderRuleService(db).create_rule(payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{reminder_rule_id}", response_model=ReminderRuleRead)
def update_reminder_rule(
    reminder_rule_id: int,
    payload: ReminderRuleUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> ReminderRuleRead:
    try:
        return ReminderRuleService(db).update_rule(reminder_rule_id, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
