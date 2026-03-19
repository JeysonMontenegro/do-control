from typing import List

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.doctor import Doctor
from app.models.doctor_clinic import DoctorClinic
from app.models.doctor_phone_number import DoctorPhoneNumber
from app.models.user import ReceptionistDoctorAssignment, User


class DoctorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, doctor: Doctor) -> Doctor:
        self.db.add(doctor)
        self.db.flush()
        return doctor

    def get(self, doctor_id: int) -> Doctor | None:
        statement = (
            select(Doctor)
            .options(
                selectinload(Doctor.phone_numbers),
                selectinload(Doctor.clinics),
                selectinload(Doctor.linked_user),
                selectinload(Doctor.receptionist_assignments).selectinload(ReceptionistDoctorAssignment.user),
            )
            .where(Doctor.id == doctor_id)
        )
        return self.db.scalar(statement)

    def list(self, query: str | None = None) -> List[Doctor]:
        statement: Select[tuple[Doctor]] = (
            select(Doctor)
            .options(selectinload(Doctor.phone_numbers))
            .options(selectinload(Doctor.clinics))
            .options(selectinload(Doctor.linked_user))
            .options(selectinload(Doctor.receptionist_assignments).selectinload(ReceptionistDoctorAssignment.user))
            .outerjoin(DoctorPhoneNumber, DoctorPhoneNumber.doctor_id == Doctor.id)
            .order_by(Doctor.last_name, Doctor.first_name)
        )
        if query:
            search = f"%{query.lower()}%"
            statement = statement.where(
                or_(
                    func.lower(Doctor.first_name).like(search),
                    func.lower(Doctor.last_name).like(search),
                    func.lower(func.coalesce(Doctor.license_number, "")).like(search),
                    func.lower(func.coalesce(Doctor.specialty, "")).like(search),
                    func.lower(func.coalesce(DoctorPhoneNumber.phone_number, "")).like(search),
                )
            )
        return list(self.db.scalars(statement.distinct()))

    def add_phone_number(self, phone_number: DoctorPhoneNumber) -> DoctorPhoneNumber:
        self.db.add(phone_number)
        self.db.flush()
        return phone_number

    def list_for_linked_user(self, user_id: int) -> List[Doctor]:
        statement = (
            select(Doctor)
            .options(
                selectinload(Doctor.phone_numbers),
                selectinload(Doctor.clinics),
                selectinload(Doctor.linked_user),
                selectinload(Doctor.receptionist_assignments).selectinload(ReceptionistDoctorAssignment.user),
            )
            .where(Doctor.linked_user_id == user_id)
            .order_by(Doctor.last_name, Doctor.first_name)
        )
        return list(self.db.scalars(statement))

    def list_for_receptionist_user(self, user_id: int) -> List[Doctor]:
        statement = (
            select(Doctor)
            .join(ReceptionistDoctorAssignment, ReceptionistDoctorAssignment.doctor_id == Doctor.id)
            .options(
                selectinload(Doctor.phone_numbers),
                selectinload(Doctor.clinics),
                selectinload(Doctor.linked_user),
                selectinload(Doctor.receptionist_assignments).selectinload(ReceptionistDoctorAssignment.user),
            )
            .where(ReceptionistDoctorAssignment.user_id == user_id)
            .order_by(Doctor.last_name, Doctor.first_name)
        )
        return list(self.db.scalars(statement).unique())

    def deactivate_primary_phone_numbers(self, doctor_id: int) -> None:
        phone_numbers = list(
            self.db.scalars(
                select(DoctorPhoneNumber).where(
                    DoctorPhoneNumber.doctor_id == doctor_id,
                    DoctorPhoneNumber.is_primary.is_(True),
                    DoctorPhoneNumber.is_active.is_(True),
                )
            )
        )
        for phone_number in phone_numbers:
            phone_number.is_primary = False
            phone_number.is_active = False

    def replace_clinics(self, doctor: Doctor, clinics: List[DoctorClinic]) -> None:
        doctor.clinics.clear()
        self.db.flush()
        for clinic in clinics:
            doctor.clinics.append(clinic)
        self.db.flush()
