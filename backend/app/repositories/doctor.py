from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.doctor import Doctor
from app.models.doctor_phone_number import DoctorPhoneNumber


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
            .options(selectinload(Doctor.phone_numbers))
            .where(Doctor.id == doctor_id)
        )
        return self.db.scalar(statement)

    def list(self, query: str | None = None) -> list[Doctor]:
        statement: Select[tuple[Doctor]] = (
            select(Doctor)
            .options(selectinload(Doctor.phone_numbers))
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
