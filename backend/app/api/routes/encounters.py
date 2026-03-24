from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.encounter import EncounterCloseRequest, EncounterCreate, EncounterRead, EncounterUpdate
from app.services.encounter import EncounterService
from app.services.doctor import DoctorService
from app.services.errors import NotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=list[EncounterRead])
def list_encounters(
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[EncounterRead]:
    accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
    return EncounterService(db).list_encounters(accessible_doctor_ids=accessible_doctor_ids)


@router.post("", response_model=EncounterRead, status_code=status.HTTP_201_CREATED)
def create_encounter(
    payload: EncounterCreate,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor")),
) -> EncounterRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return EncounterService(db).create_encounter(payload, accessible_doctor_ids=accessible_doctor_ids)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{encounter_id}", response_model=EncounterRead)
def update_encounter(
    encounter_id: int,
    payload: EncounterUpdate,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor")),
) -> EncounterRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return EncounterService(db).update_encounter(
            encounter_id,
            payload,
            updated_by="api",
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{encounter_id}/close", response_model=EncounterRead)
def close_encounter(
    encounter_id: int,
    payload: EncounterCloseRequest,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor")),
) -> EncounterRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return EncounterService(db).close_encounter(
            encounter_id,
            closed_by=payload.closed_by,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
