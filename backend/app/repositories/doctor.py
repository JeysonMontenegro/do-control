from typing import List

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.doctor import Doctor
from app.models.doctor_clinic import DoctorClinic
from app.models.doctor_phone_number import DoctorPhoneNumber
from app.models.doctor_staff_assignment import DoctorStaffAssignment
from app.models.user import User
from app.services.phone_number import phone_number_candidates


class DoctorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _base_options(self):
        return (
            selectinload(Doctor.phone_numbers),
            selectinload(Doctor.clinics),
            selectinload(Doctor.linked_user).selectinload(User.phone_numbers),
            selectinload(Doctor.staff_assignments).selectinload(DoctorStaffAssignment.staff_user).selectinload(User.phone_numbers),
        )

    def create(self, doctor: Doctor) -> Doctor:
        self.db.add(doctor)
        self.db.flush()
        return doctor

    def get(self, doctor_id: int) -> Doctor | None:
        statement = select(Doctor).options(*self._base_options()).where(Doctor.id == doctor_id)
        return self.db.scalar(statement)

    def list(self, query: str | None = None) -> List[Doctor]:
        statement: Select[tuple[Doctor]] = (
            select(Doctor)
            .join(User, User.id == Doctor.linked_user_id)
            .options(*self._base_options())
            .outerjoin(DoctorPhoneNumber, DoctorPhoneNumber.doctor_id == Doctor.id)
            .order_by(User.last_name, User.first_name)
        )
        if query:
            search = f"%{query.lower()}%"
            statement = statement.where(
                or_(
                    func.lower(User.first_name).like(search),
                    func.lower(User.last_name).like(search),
                    func.lower(func.coalesce(Doctor.license_number, "")).like(search),
                    func.lower(func.coalesce(Doctor.specialty, "")).like(search),
                    func.lower(func.coalesce(DoctorPhoneNumber.phone_number, "")).like(search),
                )
            )
        return list(self.db.scalars(statement).unique())

    def add_phone_number(self, phone_number: DoctorPhoneNumber) -> DoctorPhoneNumber:
        self.db.add(phone_number)
        self.db.flush()
        return phone_number

    def list_for_linked_user(self, user_id: int) -> List[Doctor]:
        statement = (
            select(Doctor)
            .join(User, User.id == Doctor.linked_user_id)
            .options(*self._base_options())
            .where(Doctor.linked_user_id == user_id)
            .order_by(User.last_name, User.first_name)
        )
        return list(self.db.scalars(statement))

    def list_for_staff_user(self, user_id: int, *, assignment_type: str | None = None) -> List[Doctor]:
        statement = (
            select(Doctor)
            .join(DoctorStaffAssignment, DoctorStaffAssignment.doctor_id == Doctor.id)
            .join(User, User.id == Doctor.linked_user_id)
            .options(*self._base_options())
            .where(
                DoctorStaffAssignment.staff_user_id == user_id,
                DoctorStaffAssignment.is_active.is_(True),
            )
            .order_by(User.last_name, User.first_name)
        )
        if assignment_type is not None:
            statement = statement.where(DoctorStaffAssignment.assignment_type == assignment_type)
        return list(self.db.scalars(statement).unique())

    def list_for_receptionist_user(self, user_id: int) -> List[Doctor]:
        return self.list_for_staff_user(user_id, assignment_type="receptionist")

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

    def phone_number_in_use(self, phone_number: str, *, exclude_linked_user_id: int | None = None) -> bool:
        candidates = phone_number_candidates(phone_number)
        if not candidates:
            return False
        statement = (
            select(DoctorPhoneNumber.id)
            .select_from(DoctorPhoneNumber)
            .join(Doctor, Doctor.id == DoctorPhoneNumber.doctor_id)
            .where(or_(*(DoctorPhoneNumber.phone_number == candidate for candidate in candidates)))
        )
        if exclude_linked_user_id is not None:
            statement = statement.where(Doctor.linked_user_id != exclude_linked_user_id)
        return self.db.scalar(statement.limit(1)) is not None
