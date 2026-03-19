from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session
from app.api.deps import require_roles
from app.schemas.auth import AuthProfileRead, AuthProfileUpdate, LoginRequest, LoginResponse
from app.schemas.auth_email import AdminInviteRequest, AuthEmailActionRead, PasswordResetConfirmRequest, PasswordResetRequest
from app.services.auth import AuthService
from app.services.email_service import EmailService
from app.services.errors import ValidationError

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db_session)) -> LoginResponse:
    try:
        return AuthService(db).login(payload.email, payload.password)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get("/me", response_model=AuthProfileRead)
def read_current_profile(
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
) -> AuthProfileRead:
    try:
        return AuthService(db).read_profile(current_user.id)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.patch("/me", response_model=AuthProfileRead)
def update_current_profile(
    payload: AuthProfileUpdate,
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
) -> AuthProfileRead:
    try:
        return AuthService(db).update_profile(current_user.id, payload)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/me/photo", response_model=AuthProfileRead)
async def upload_current_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
    current_user=Depends(get_current_user),
) -> AuthProfileRead:
    try:
        content = await file.read()
        return AuthService(db).upload_profile_photo(
            user_id=current_user.id,
            file_name=file.filename or "profile-image.bin",
            content_type=file.content_type,
            content=content,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/password-reset/request", response_model=AuthEmailActionRead)
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db_session)) -> AuthEmailActionRead:
    EmailService(db).request_password_reset(str(payload.email))
    return AuthEmailActionRead(status="accepted", message="Si el correo existe, se enviará un enlace de recuperación.")


@router.post("/password-reset/confirm", response_model=AuthEmailActionRead)
def confirm_password_reset(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db_session)) -> AuthEmailActionRead:
    try:
        EmailService(db).confirm_password_reset(token=payload.token, new_password=payload.new_password)
        return AuthEmailActionRead(status="updated", message="La contraseña fue actualizada.")
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/admin-invites", response_model=AuthEmailActionRead)
def create_admin_invite(
    payload: AdminInviteRequest,
    db: Session = Depends(get_db_session),
    _current_user=Depends(require_roles("admin")),
) -> AuthEmailActionRead:
    EmailService(db).send_admin_invite_email(payload)
    return AuthEmailActionRead(status="sent", message="La invitación de administrador fue enviada.")
