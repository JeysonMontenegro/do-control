from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.patient import PatientCreate, PatientRead, PatientSummaryRead, PatientUpdate
from app.services.errors import ConflictError, NotFoundError
from app.services.doctor import DoctorService
from app.services.patient import PatientService

router = APIRouter()


@router.get("", response_model=list[PatientRead])
def list_patients(
    query: str | None = Query(default=None),
    doctor_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[PatientRead]:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return PatientService(db).list_patients(query=query, accessible_doctor_ids=accessible_doctor_ids, doctor_id=doctor_id)
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(
    patient_id: int,
    doctor_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> PatientRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return PatientService(db).get_patient(patient_id, accessible_doctor_ids=accessible_doctor_ids, doctor_id=doctor_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{patient_id}/summary", response_model=PatientSummaryRead)
def get_patient_summary(
    patient_id: int,
    doctor_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> PatientSummaryRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return PatientService(db).get_patient_summary(patient_id, accessible_doctor_ids=accessible_doctor_ids, doctor_id=doctor_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> PatientRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return PatientService(db).create_patient(payload, accessible_doctor_ids=accessible_doctor_ids)
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.patch("/{patient_id}", response_model=PatientRead)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    doctor_id: int | None = Query(default=None),
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> PatientRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return PatientService(db).update_patient(
            patient_id,
            payload,
            accessible_doctor_ids=accessible_doctor_ids,
            doctor_id=doctor_id,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
