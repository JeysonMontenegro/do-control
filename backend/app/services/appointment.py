from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentHistory
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.patient import PatientRepository
from app.schemas.appointment import AppointmentCreate, AppointmentStatusUpdate
from app.services.audit import create_audit_log
from app.services.errors import ConflictError, NotFoundError, ValidationError


class AppointmentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = AppointmentRepository(db)
        self.doctor_repository = DoctorRepository(db)
        self.patient_repository = PatientRepository(db)

    def create_appointment(self, payload: AppointmentCreate) -> Appointment:
        if payload.scheduled_end <= payload.scheduled_start:
            raise ValidationError("Appointment end time must be after start time.")

        if self.patient_repository.get(payload.patient_id) is None:
            raise NotFoundError("Patient not found.")

        if self.doctor_repository.get(payload.doctor_id) is None:
            raise NotFoundError("Doctor not found.")

        if self.repository.has_overlap(payload.doctor_id, payload.scheduled_start, payload.scheduled_end):
            raise ConflictError("Doctor already has an appointment in that time range.")

        appointment = Appointment(**payload.model_dump())
        created = self.repository.create(appointment)
        self.repository.add_history(
            AppointmentHistory(
                appointment_id=created.id,
                old_status=None,
                new_status=created.status,
                change_reason="appointment created",
                changed_by=payload.created_by,
                created_at=datetime.now(timezone.utc),
            ),
        )
        create_audit_log(
            self.db,
            action="create",
            entity_type="appointment",
            entity_id=str(created.id),
            after_data={"status": created.status},
        )
        self.db.commit()
        self.db.refresh(created)
        return created

    def list_appointments(self) -> list[Appointment]:
        return self.repository.list()

    def confirm_appointment(self, appointment_id: int, *, changed_by: str | None = None) -> Appointment:
        appointment = self.repository.get(appointment_id)
        if appointment is None:
            raise NotFoundError("Appointment not found.")

        previous_confirmation = appointment.confirmation_status
        appointment.confirmation_status = "confirmed"
        create_audit_log(
            self.db,
            action="confirm",
            entity_type="appointment",
            entity_id=str(appointment.id),
            actor_id=changed_by,
            before_data={"confirmation_status": previous_confirmation},
            after_data={"confirmation_status": appointment.confirmation_status},
        )
        self.db.commit()
        self.db.refresh(appointment)
        return appointment

    def list_schedule_for_doctor_date(self, doctor_id: int, target_date: date) -> list[Appointment]:
        if self.doctor_repository.get(doctor_id) is None:
            raise NotFoundError("Doctor not found.")
        return self.repository.list_for_doctor_date(doctor_id, target_date)

    def get_pending_for_patient(self, patient_id: int) -> Appointment:
        if self.patient_repository.get(patient_id) is None:
            raise NotFoundError("Patient not found.")
        appointment = self.repository.get_pending_for_patient(patient_id)
        if appointment is None:
            raise NotFoundError("Pending appointment not found.")
        return appointment

    def cancel_for_doctor_patient_name(
        self,
        doctor_id: int,
        patient_name: str,
        *,
        target_date: date | None,
        changed_by: str | None = None,
    ) -> Appointment:
        if self.doctor_repository.get(doctor_id) is None:
            raise NotFoundError("Doctor not found.")

        appointment = self.repository.find_cancel_candidate(doctor_id, patient_name, target_date)
        if appointment is None:
            raise NotFoundError("Appointment not found.")

        old_status = appointment.status
        appointment.status = "cancelled"
        appointment.confirmation_status = "cancelled"
        self.repository.add_history(
            AppointmentHistory(
                appointment_id=appointment.id,
                old_status=old_status,
                new_status=appointment.status,
                change_reason="cancelled from integration flow",
                changed_by=changed_by,
                created_at=datetime.now(timezone.utc),
            ),
        )
        create_audit_log(
            self.db,
            action="cancel",
            entity_type="appointment",
            entity_id=str(appointment.id),
            actor_id=changed_by,
            before_data={"status": old_status},
            after_data={"status": appointment.status},
        )
        self.db.commit()
        self.db.refresh(appointment)
        return appointment

    def update_status(self, appointment_id: int, payload: AppointmentStatusUpdate) -> Appointment:
        appointment = self.repository.get(appointment_id)
        if appointment is None:
            raise NotFoundError("Appointment not found.")

        old_status = appointment.status
        appointment.status = payload.status
        self.repository.add_history(
            AppointmentHistory(
                appointment_id=appointment.id,
                old_status=old_status,
                new_status=payload.status,
                change_reason=payload.change_reason,
                changed_by=payload.changed_by,
                created_at=datetime.now(timezone.utc),
            ),
        )
        create_audit_log(
            self.db,
            action="update_status",
            entity_type="appointment",
            entity_id=str(appointment.id),
            before_data={"status": old_status},
            after_data={"status": appointment.status},
        )
        self.db.commit()
        self.db.refresh(appointment)
        return appointment
