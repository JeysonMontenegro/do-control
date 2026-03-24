from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.file_attachment import FileAttachmentDownloadRead, FileAttachmentRead
from app.services.doctor import DoctorService
from app.services.errors import NotFoundError, ValidationError
from app.services.file_attachment import FileAttachmentService

router = APIRouter()


@router.post("", response_model=FileAttachmentRead, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    patient_id: int = Form(...),
    encounter_id: int | None = Form(default=None),
    file_type: str = Form(...),
    uploaded_by: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor")),
) -> FileAttachmentRead:
    try:
        content = await file.read()
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return FileAttachmentService(db).upload_attachment(
            patient_id=patient_id,
            encounter_id=encounter_id,
            file_type=file_type,
            file_name=file.filename or "upload.bin",
            content_type=file.content_type,
            content=content,
            uploaded_by=uploaded_by,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{attachment_id}/download", response_model=FileAttachmentDownloadRead)
def get_attachment_download_url(
    attachment_id: int,
    requested_by: str | None = None,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> FileAttachmentDownloadRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return FileAttachmentService(db).get_download_url(
            attachment_id,
            requested_by=requested_by,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{attachment_id}/content")
def download_attachment_content(
    attachment_id: int,
    requested_by: str | None = None,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> StreamingResponse:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        attachment, stream = FileAttachmentService(db).get_attachment_content(
            attachment_id,
            requested_by=requested_by,
            accessible_doctor_ids=accessible_doctor_ids,
        )
        media_type = attachment.content_type or "application/octet-stream"
        headers = {
            "Content-Disposition": f'attachment; filename="{attachment.file_name}"',
        }
        return StreamingResponse(stream, media_type=media_type, headers=headers)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
