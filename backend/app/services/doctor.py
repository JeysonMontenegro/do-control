from sqlalchemy.orm import Session

from app.models.doctor import Doctor
from app.models.doctor_phone_number import DoctorPhoneNumber
from app.repositories.doctor import DoctorRepository
from app.schemas.doctor import DoctorCreate
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError


class DoctorService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = DoctorRepository(db)

    def list_doctors(self, query: str | None = None) -> list[Doctor]:
        return self.repository.list(query=query)

    def get_doctor(self, doctor_id: int) -> Doctor:
        doctor = self.repository.get(doctor_id)
        if doctor is None:
            raise NotFoundError("Doctor not found.")
        return doctor

    def create_doctor(self, payload: DoctorCreate) -> Doctor:
        data = payload.model_dump()
        primary_phone = data.pop("primary_phone", None)
        phone_channel_type = data.pop("phone_channel_type", "whatsapp")
        doctor = self.repository.create(Doctor(**data))
        if primary_phone:
            self.repository.add_phone_number(
                DoctorPhoneNumber(
                    doctor_id=doctor.id,
                    phone_number=primary_phone,
                    is_primary=True,
                    is_active=True,
                    channel_type=phone_channel_type,
                )
            )
        create_audit_log(
            self.db,
            action="create",
            entity_type="doctor",
            entity_id=str(doctor.id),
            after_data={"name": f"{doctor.first_name} {doctor.last_name}"},
        )
        self.db.commit()
        self.db.refresh(doctor)
        return doctor
