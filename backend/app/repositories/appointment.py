from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentHistory


class AppointmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, appointment: Appointment) -> Appointment:
        self.db.add(appointment)
        self.db.flush()
        return appointment

    def get(self, appointment_id: int) -> Appointment | None:
        return self.db.get(Appointment, appointment_id)

    def list(self) -> list[Appointment]:
        return list(self.db.scalars(select(Appointment).order_by(Appointment.scheduled_start.desc())))

    def has_overlap(self, doctor_id: int, start, end) -> bool:
        overlapping = self.db.scalar(
            select(Appointment.id).where(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_(["scheduled", "confirmed", "in_progress"]),
                and_(Appointment.scheduled_start < end, Appointment.scheduled_end > start),
            ).limit(1),
        )
        return overlapping is not None

    def add_history(self, history: AppointmentHistory) -> None:
        self.db.add(history)
