from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.patient_phone_number import PatientPhoneNumber
from app.repositories.patient import PatientRepository
from app.schemas.patient import PatientCreate, PatientSummaryRead, PatientUpdate
from app.services.audit import create_audit_log
from app.services.errors import ConflictError, NotFoundError


class PatientService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = PatientRepository(db)

    def create_patient(self, payload: PatientCreate) -> Patient:
        data = payload.model_dump()
        data["medical_record_number"] = data.get("medical_record_number") or self.repository.next_medical_record_number()
        patient = Patient(**data)
        duplicate = self.repository.find_duplicate(patient)
        if duplicate is not None:
            raise ConflictError("Patient already exists according to duplicate validation rules.")

        created = self.repository.create(patient)
        self.repository.add_phone_number(
            PatientPhoneNumber(
                patient_id=created.id,
                phone_number=created.primary_phone,
                is_primary=True,
                is_active=True,
            )
        )
        create_audit_log(
            self.db,
            action="create",
            entity_type="patient",
            entity_id=str(created.id),
            after_data={"medical_record_number": created.medical_record_number},
        )
        self.db.commit()
        self.db.refresh(created)
        return created

    def split_full_name(self, full_name: str) -> tuple[str, str]:
        normalized = " ".join(full_name.split())
        if not normalized:
            raise ConflictError("Patient name is required.")
        parts = normalized.split(" ")
        if len(parts) == 1:
            return parts[0], "Unknown"
        return " ".join(parts[:-1]), parts[-1]

    def list_patients(self, query: str | None = None) -> list[Patient]:
        return self.repository.list(query=query)

    def get_patient(self, patient_id: int) -> Patient:
        patient = self.repository.get(patient_id)
        if patient is None:
            raise NotFoundError("Patient not found.")
        return patient

    def update_patient(self, patient_id: int, payload: PatientUpdate) -> Patient:
        patient = self.get_patient(patient_id)
        before = {"is_active": patient.is_active, "primary_phone": patient.primary_phone}
        new_primary_phone = payload.model_dump(exclude_unset=True).get("primary_phone")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(patient, field, value)
        if new_primary_phone and new_primary_phone != before["primary_phone"]:
            self.repository.deactivate_primary_phone_numbers(patient.id)
            self.repository.add_phone_number(
                PatientPhoneNumber(
                    patient_id=patient.id,
                    phone_number=new_primary_phone,
                    is_primary=True,
                    is_active=True,
                )
            )
        create_audit_log(
            self.db,
            action="update",
            entity_type="patient",
            entity_id=str(patient.id),
            before_data=before,
            after_data={"is_active": patient.is_active, "primary_phone": patient.primary_phone},
        )
        self.db.commit()
        self.db.refresh(patient)
        return patient

    def get_patient_summary(self, patient_id: int) -> PatientSummaryRead:
        patient = self.get_patient(patient_id)
        appointments = self.repository.list_appointments(patient_id)
        encounters = self.repository.list_encounters(patient_id)
        attachments = self.repository.list_attachments(patient_id)
        return PatientSummaryRead(
            patient=patient,
            appointments=appointments,
            encounters=encounters,
            attachments=attachments,
        )
