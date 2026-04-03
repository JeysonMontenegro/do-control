from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, require_roles
from app.schemas.exam_analysis import AttachmentExamAnalysisRequest, ExamAnalysisRead, ExamAnalysisReviewUpdateRequest
from app.schemas.file_attachment import FileAttachmentDeleteRead, FileAttachmentDownloadRead, FileAttachmentRead
from app.services.doctor import DoctorService
from app.services.errors import ConflictError, NotFoundError, ValidationError
from app.services.exam_analysis import ExamAnalysisService
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


@router.get("/{attachment_id}/analyses", response_model=list[ExamAnalysisRead])
def list_attachment_analyses(
    attachment_id: int,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor", "receptionist")),
) -> list[ExamAnalysisRead]:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return ExamAnalysisService(db).list_attachment_analyses(
            attachment_id,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{attachment_id}/analyses", response_model=ExamAnalysisRead, status_code=status.HTTP_202_ACCEPTED)
def request_attachment_analysis(
    attachment_id: int,
    payload: AttachmentExamAnalysisRequest,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor")),
) -> ExamAnalysisRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return ExamAnalysisService(db).request_analysis_for_attachment(
            attachment_id=attachment_id,
            encounter_id=payload.encounter_id,
            exam_order_id=payload.exam_order_id,
            requested_by=payload.requested_by,
            source=payload.source,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{attachment_id}/analyses/{analysis_id}/review", response_model=ExamAnalysisRead)
def update_attachment_analysis_review(
    attachment_id: int,
    analysis_id: int,
    payload: ExamAnalysisReviewUpdateRequest,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor")),
) -> ExamAnalysisRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return ExamAnalysisService(db).update_review_status(
            attachment_id=attachment_id,
            analysis_id=analysis_id,
            review_status=payload.review_status,
            reviewed_by=payload.reviewed_by,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{attachment_id}", response_model=FileAttachmentDeleteRead)
def delete_attachment(
    attachment_id: int,
    deleted_by: str | None = None,
    db: Session = Depends(get_db_session),
    current_user=Depends(require_roles("admin", "doctor")),
) -> FileAttachmentDeleteRead:
    try:
        accessible_doctor_ids = DoctorService(db).accessible_doctor_ids(current_user)
        return FileAttachmentService(db).delete_attachment(
            attachment_id,
            deleted_by=deleted_by,
            accessible_doctor_ids=accessible_doctor_ids,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
