from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.patient_phone_number import PatientPhoneNumber
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.schemas.patient import PatientCreate, PatientSummaryRead, PatientUpdate
from app.services.audit import create_audit_log
from app.services.errors import ConflictError, NotFoundError, ValidationError


class PatientService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = PatientRepository(db)
        self.doctor_repository = DoctorRepository(db)

    @staticmethod
    def _normalize_optional_text(value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @classmethod
    def _normalize_required_text(cls, value: str, *, field_label: str) -> str:
        normalized = cls._normalize_optional_text(value)
        if normalized is None:
            raise ValidationError(f"{field_label} is required.")
        return normalized

    def _normalize_patient_payload(self, data: dict, *, partial: bool) -> dict:
        normalized = dict(data)
        required_fields = {
            "first_name": "First name",
            "last_name": "Last name",
            "primary_phone": "Primary phone",
        }
        optional_text_fields = (
            "middle_name",
            "second_last_name",
            "married_name",
            "sex",
            "national_id",
            "tax_id",
            "secondary_phone",
            "address",
            "emergency_contact_name",
            "emergency_contact_phone",
            "allergies",
            "chronic_conditions",
            "blood_type",
            "notes",
        )

        for field_name, label in required_fields.items():
            if field_name in normalized:
                normalized[field_name] = self._normalize_required_text(normalized[field_name], field_label=label)
            elif not partial:
                raise ValidationError(f"{label} is required.")

        for field_name in optional_text_fields:
            if field_name in normalized:
                normalized[field_name] = self._normalize_optional_text(normalized[field_name])

        return normalized

    @staticmethod
    def _resolve_scoped_doctor_id(accessible_doctor_ids: set[int] | None, requested_doctor_id: int | None) -> int | None:
        if accessible_doctor_ids is None:
            return requested_doctor_id
        if requested_doctor_id is not None:
            if requested_doctor_id not in accessible_doctor_ids:
                raise ConflictError("Doctor is outside your assigned scope.")
            return requested_doctor_id
        if len(accessible_doctor_ids) == 1:
            return next(iter(accessible_doctor_ids))
        raise ConflictError("Debe seleccionar el doctor que está gestionando.")

    def create_patient(self, payload: PatientCreate, *, accessible_doctor_ids: set[int] | None = None) -> Patient:
        data = self._normalize_patient_payload(payload.model_dump(), partial=False)
        scoped_doctor_id = self._resolve_scoped_doctor_id(accessible_doctor_ids, data.pop("doctor_id", None))
        if scoped_doctor_id is None:
            raise ConflictError("Debe seleccionar el doctor responsable del paciente.")
        doctor = self.doctor_repository.get(scoped_doctor_id)
        if doctor is None:
            raise NotFoundError("Doctor not found.")
        if not doctor.is_active:
            raise ValidationError("Cannot create patients for an inactive doctor.")
        data["medical_record_number"] = data.get("medical_record_number") or self.repository.next_medical_record_number()
        patient = Patient(**data, owner_doctor_id=scoped_doctor_id)
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
        self.repository.ensure_doctor_assignment(created.id, scoped_doctor_id)
        self.db.commit()
        refreshed = self.repository.get(created.id)
        if refreshed is None:
            raise NotFoundError("Patient not found.")
        return refreshed

    def split_full_name(self, full_name: str) -> tuple[str, str]:
        normalized = " ".join(full_name.split())
        if not normalized:
            raise ConflictError("Patient name is required.")
        parts = normalized.split(" ")
        if len(parts) == 1:
            return parts[0], "Unknown"
        return " ".join(parts[:-1]), parts[-1]

    def list_patients(
        self,
        query: str | None = None,
        *,
        accessible_doctor_ids: set[int] | None = None,
        doctor_id: int | None = None,
    ) -> list[Patient]:
        scoped_doctor_id = self._resolve_scoped_doctor_id(accessible_doctor_ids, doctor_id)
        if scoped_doctor_id is not None:
            return self.repository.list_for_doctor(scoped_doctor_id, query=query)
        return self.repository.list(query=query)

    def get_patient(
        self,
        patient_id: int,
        *,
        accessible_doctor_ids: set[int] | None = None,
        doctor_id: int | None = None,
    ) -> Patient:
        patient = self.repository.get(patient_id)
        if patient is None:
            raise NotFoundError("Patient not found.")
        scoped_doctor_id = self._resolve_scoped_doctor_id(accessible_doctor_ids, doctor_id)
        if scoped_doctor_id is not None and not self.repository.is_assigned_to_doctor(patient_id, scoped_doctor_id):
            raise NotFoundError("Patient not found.")
        return patient

    def update_patient(
        self,
        patient_id: int,
        payload: PatientUpdate,
        *,
        accessible_doctor_ids: set[int] | None = None,
        doctor_id: int | None = None,
    ) -> Patient:
        patient = self.get_patient(patient_id, accessible_doctor_ids=accessible_doctor_ids, doctor_id=doctor_id)
        before = {"is_active": patient.is_active, "primary_phone": patient.primary_phone}
        updates = self._normalize_patient_payload(payload.model_dump(exclude_unset=True), partial=True)
        new_primary_phone = updates.get("primary_phone")
        for field, value in updates.items():
            setattr(patient, field, value)
        if new_primary_phone and new_primary_phone != before["primary_phone"]:
            self._replace_primary_phone(patient, new_primary_phone)
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

    def update_primary_phone_with_history(self, patient_id: int, phone_number: str) -> tuple[Patient, str]:
        patient = self.get_patient(patient_id)
        previous_phone = patient.primary_phone
        if phone_number == previous_phone:
            return patient, previous_phone

        self._replace_primary_phone(patient, phone_number)
        create_audit_log(
            self.db,
            action="update_primary_phone",
            entity_type="patient",
            entity_id=str(patient.id),
            before_data={"primary_phone": previous_phone},
            after_data={"primary_phone": patient.primary_phone},
        )
        self.db.commit()
        self.db.refresh(patient)
        return patient, previous_phone

    def _replace_primary_phone(self, patient: Patient, phone_number: str) -> None:
        self.repository.unset_primary_phone_numbers(patient.id)
        existing_phone = self.repository.get_phone_number_for_patient(patient.id, phone_number)
        if existing_phone is not None:
            existing_phone.is_primary = True
            existing_phone.is_active = True
        else:
            self.repository.add_phone_number(
                PatientPhoneNumber(
                    patient_id=patient.id,
                    phone_number=phone_number,
                    is_primary=True,
                    is_active=True,
                )
            )
        patient.primary_phone = phone_number

    def get_patient_summary(
        self,
        patient_id: int,
        *,
        accessible_doctor_ids: set[int] | None = None,
        doctor_id: int | None = None,
    ) -> PatientSummaryRead:
        patient = self.get_patient(patient_id, accessible_doctor_ids=accessible_doctor_ids, doctor_id=doctor_id)
        appointments = self.repository.list_appointments(patient_id)
        encounters = self.repository.list_encounters(patient_id)
        attachments = self.repository.list_attachments(patient_id)
        return PatientSummaryRead(
            patient=patient,
            appointments=appointments,
            encounters=encounters,
            attachments=attachments,
        )
