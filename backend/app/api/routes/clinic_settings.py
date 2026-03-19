from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.clinic_setting import ClinicSettingRead, ClinicSettingUpdate
from app.services.clinic_setting import ClinicSettingService

router = APIRouter()


@router.get("", response_model=ClinicSettingRead)
def get_clinic_settings(
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> ClinicSettingRead:
    return ClinicSettingService(db).get_settings()


@router.patch("", response_model=ClinicSettingRead)
def update_clinic_settings(
    payload: ClinicSettingUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> ClinicSettingRead:
    return ClinicSettingService(db).update_settings(payload)
