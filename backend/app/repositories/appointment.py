from datetime import date, datetime, timezone
from typing import List

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.appointment import Appointment, AppointmentHistory
from app.models.doctor import Doctor
from app.models.patient import Patient


class AppointmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, appointment: Appointment) -> Appointment:
        self.db.add(appointment)
        self.db.flush()
        return appointment

    def get(self, appointment_id: int) -> Appointment | None:
        statement = (
            select(Appointment)
            .options(
                selectinload(Appointment.patient),
                selectinload(Appointment.doctor),
                selectinload(Appointment.history_entries),
            )
            .where(Appointment.id == appointment_id)
        )
        return self.db.scalar(statement)

    def get_public_card(self, public_id: str) -> Appointment | None:
        statement = (
            select(Appointment)
            .options(
                selectinload(Appointment.doctor).selectinload(Doctor.linked_user),
                selectinload(Appointment.doctor).selectinload(Doctor.clinics),
            )
            .where(Appointment.public_id == public_id)
        )
        return self.db.scalar(statement)

    def list(self) -> List[Appointment]:
        statement = (
            select(Appointment)
            .options(
                selectinload(Appointment.patient),
                selectinload(Appointment.doctor),
            )
            .order_by(Appointment.scheduled_start.desc())
        )
        return list(self.db.scalars(statement))

    def find_overlap(self, doctor_id: int, start, end) -> Appointment | None:
        statement = (
            select(Appointment)
            .where(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_(["scheduled", "confirmed", "in_progress"]),
                and_(Appointment.scheduled_start < end, Appointment.scheduled_end > start),
            )
            .order_by(Appointment.scheduled_start.asc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def has_overlap(self, doctor_id: int, start, end) -> bool:
        return self.find_overlap(doctor_id, start, end) is not None

    def add_history(self, history: AppointmentHistory) -> None:
        self.db.add(history)

    def list_history(self, appointment_id: int) -> List[AppointmentHistory]:
        statement = (
            select(AppointmentHistory)
            .where(AppointmentHistory.appointment_id == appointment_id)
            .order_by(AppointmentHistory.created_at.desc(), AppointmentHistory.id.desc())
        )
        return list(self.db.scalars(statement))

    def list_for_doctor_date(self, doctor_id: int, target_date: date) -> List[Appointment]:
        statement = (
            select(Appointment)
            .options(selectinload(Appointment.patient))
            .where(
                Appointment.doctor_id == doctor_id,
                Appointment.status != "cancelled",
                func.date(Appointment.scheduled_start) == target_date,
            )
            .order_by(Appointment.scheduled_start.asc())
        )
        return list(self.db.scalars(statement))

    def get_pending_for_patient(self, patient_id: int) -> Appointment | None:
        statement = (
            select(Appointment)
            .where(
                Appointment.patient_id == patient_id,
                Appointment.status == "scheduled",
                Appointment.scheduled_start >= datetime.now(timezone.utc),
            )
            .order_by(Appointment.scheduled_start.asc())
            .limit(1)
        )
        return self.db.scalar(statement)

    def find_cancel_candidate(self, doctor_id: int, patient_name: str, target_date: date | None) -> Appointment | None:
        normalized_name = " ".join(patient_name.lower().split())
        statement = (
            select(Appointment)
            .join(Patient, Patient.id == Appointment.patient_id)
            .options(selectinload(Appointment.patient))
            .where(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_(["scheduled", "confirmed"]),
                func.lower(func.trim(Patient.first_name + " " + Patient.last_name)) == normalized_name,
            )
            .order_by(Appointment.scheduled_start.asc())
        )
        if target_date is not None:
            statement = statement.where(func.date(Appointment.scheduled_start) == target_date)
        else:
            statement = statement.where(Appointment.scheduled_start >= datetime.now(timezone.utc))
        return self.db.scalar(statement.limit(1))
