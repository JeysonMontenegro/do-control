from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.doctor_onboarding import DoctorOnboardingCompleteRead, DoctorOnboardingCompleteRequest, DoctorOnboardingTokenRead
from app.services.doctor_onboarding import DoctorOnboardingService
from app.services.errors import NotFoundError, ValidationError

router = APIRouter()


@router.get("/validate", response_model=DoctorOnboardingTokenRead)
def validate_doctor_onboarding_token(
    token: str = Query(...),
    db: Session = Depends(get_db_session),
) -> DoctorOnboardingTokenRead:
    try:
        return DoctorOnboardingService(db).read_invitation(token)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/complete", response_model=DoctorOnboardingCompleteRead)
def complete_doctor_onboarding(
    payload: DoctorOnboardingCompleteRequest,
    db: Session = Depends(get_db_session),
) -> DoctorOnboardingCompleteRead:
    try:
        return DoctorOnboardingService(db).complete_onboarding(payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
