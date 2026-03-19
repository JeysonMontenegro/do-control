from typing import List

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.appointment import Appointment
from app.models.encounter import Encounter
from app.models.file_attachment import FileAttachment
from app.models.patient import Patient
from app.models.patient_phone_number import PatientPhoneNumber


class PatientRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, patient: Patient) -> Patient:
        self.db.add(patient)
        self.db.flush()
        return patient

    def get(self, patient_id: int) -> Patient | None:
        statement = (
            select(Patient)
            .options(selectinload(Patient.phone_numbers))
            .where(Patient.id == patient_id)
        )
        return self.db.scalar(statement)

    def list(self, query: str | None = None) -> List[Patient]:
        statement: Select[tuple[Patient]] = (
            select(Patient)
            .options(selectinload(Patient.phone_numbers))
            .outerjoin(PatientPhoneNumber, PatientPhoneNumber.patient_id == Patient.id)
            .order_by(Patient.last_name, Patient.first_name)
        )
        if query:
            search = f"%{query.lower()}%"
            statement = statement.where(
                or_(
                    func.lower(Patient.first_name).like(search),
                    func.lower(Patient.last_name).like(search),
                    func.lower(Patient.primary_phone).like(search),
                    func.lower(func.coalesce(PatientPhoneNumber.phone_number, "")).like(search),
                    func.lower(func.coalesce(Patient.national_id, "")).like(search),
                    func.lower(Patient.medical_record_number).like(search),
                ),
            )
        return list(self.db.scalars(statement.distinct()))

    def find_duplicate(self, patient: Patient) -> Patient | None:
        if patient.national_id:
            return self.db.scalar(select(Patient).where(Patient.national_id == patient.national_id))

        phone_match = self.db.scalar(
            select(Patient)
            .join(PatientPhoneNumber, PatientPhoneNumber.patient_id == Patient.id)
            .where(
                PatientPhoneNumber.phone_number == patient.primary_phone,
                PatientPhoneNumber.is_active.is_(True),
            )
        )
        if phone_match is not None:
            return phone_match

        return self.db.scalar(
            select(Patient).where(
                Patient.first_name == patient.first_name,
                Patient.last_name == patient.last_name,
                Patient.date_of_birth == patient.date_of_birth,
                Patient.primary_phone == patient.primary_phone,
            ),
        )

    def next_medical_record_number(self) -> str:
        next_id = (self.db.scalar(select(func.max(Patient.id))) or 0) + 1
        return f"EXP-{next_id:06d}"

    def list_appointments(self, patient_id: int) -> List[Appointment]:
        return list(
            self.db.scalars(
                select(Appointment)
                .where(Appointment.patient_id == patient_id)
                .order_by(Appointment.scheduled_start.desc()),
            )
        )

    def list_encounters(self, patient_id: int) -> List[Encounter]:
        return list(
            self.db.scalars(
                select(Encounter)
                .where(Encounter.patient_id == patient_id)
                .order_by(Encounter.encounter_date.desc()),
            )
        )

    def list_attachments(self, patient_id: int) -> List[FileAttachment]:
        return list(
            self.db.scalars(
                select(FileAttachment)
                .where(FileAttachment.patient_id == patient_id)
                .order_by(FileAttachment.created_at.desc()),
            )
        )

    def add_phone_number(self, phone_number: PatientPhoneNumber) -> PatientPhoneNumber:
        self.db.add(phone_number)
        self.db.flush()
        return phone_number

    def get_phone_number_for_patient(self, patient_id: int, phone_number: str) -> PatientPhoneNumber | None:
        return self.db.scalar(
            select(PatientPhoneNumber).where(
                PatientPhoneNumber.patient_id == patient_id,
                PatientPhoneNumber.phone_number == phone_number,
            )
        )

    def unset_primary_phone_numbers(self, patient_id: int) -> None:
        phone_numbers = list(
            self.db.scalars(
                select(PatientPhoneNumber).where(
                    PatientPhoneNumber.patient_id == patient_id,
                    PatientPhoneNumber.is_primary.is_(True),
                )
            )
        )
        for phone_number in phone_numbers:
            phone_number.is_primary = False

    def deactivate_primary_phone_numbers(self, patient_id: int) -> None:
        phone_numbers = list(
            self.db.scalars(
                select(PatientPhoneNumber).where(
                    PatientPhoneNumber.patient_id == patient_id,
                    PatientPhoneNumber.is_primary.is_(True),
                    PatientPhoneNumber.is_active.is_(True),
                )
            )
        )
        for phone_number in phone_numbers:
            phone_number.is_primary = False
            phone_number.is_active = False
