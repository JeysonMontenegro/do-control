from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.doctor import DoctorCreate, DoctorRead, DoctorUpdate
from app.services.doctor import DoctorService
from app.services.errors import NotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=list[DoctorRead])
def list_doctors(
    query: str | None = None,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[DoctorRead]:
    service = DoctorService(db)
    return [service.serialize_doctor(doctor) for doctor in service.list_doctors(query=query, current_user=current_user)]


@router.get("/{doctor_id}", response_model=DoctorRead)
def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> DoctorRead:
    try:
        service = DoctorService(db)
        return service.serialize_doctor(service.get_doctor(doctor_id, current_user=current_user))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: DoctorCreate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> DoctorRead:
    service = DoctorService(db)
    return service.serialize_doctor(service.create_doctor(payload))


@router.patch("/{doctor_id}", response_model=DoctorRead)
def update_doctor(
    doctor_id: int,
    payload: DoctorUpdate,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> DoctorRead:
    try:
        service = DoctorService(db)
        return service.serialize_doctor(service.update_doctor(doctor_id, payload))
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
