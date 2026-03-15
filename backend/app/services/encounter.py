from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.encounter import Diagnosis, Encounter, ExamOrder, Prescription, PrescriptionItem
from app.repositories.appointment import AppointmentRepository
from app.repositories.doctor import DoctorRepository
from app.repositories.encounter import EncounterRepository
from app.repositories.patient import PatientRepository
from app.schemas.encounter import EncounterCreate, EncounterUpdate
from app.services.audit import create_audit_log
from app.services.errors import NotFoundError, ValidationError


class EncounterService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = EncounterRepository(db)
        self.doctor_repository = DoctorRepository(db)
        self.patient_repository = PatientRepository(db)
        self.appointment_repository = AppointmentRepository(db)

    def create_encounter(self, payload: EncounterCreate) -> Encounter:
        if self.patient_repository.get(payload.patient_id) is None:
            raise NotFoundError("Patient not found.")

        if self.doctor_repository.get(payload.doctor_id) is None:
            raise NotFoundError("Doctor not found.")

        if payload.appointment_id is not None:
            appointment = self.appointment_repository.get(payload.appointment_id)
            if appointment is None:
                raise NotFoundError("Appointment not found.")
            if appointment.patient_id != payload.patient_id:
                raise ValidationError("Appointment does not belong to the selected patient.")

        encounter = Encounter(
            patient_id=payload.patient_id,
            doctor_id=payload.doctor_id,
            appointment_id=payload.appointment_id,
            encounter_date=payload.encounter_date,
            encounter_type=payload.encounter_type,
            chief_complaint=payload.chief_complaint,
            present_illness=payload.present_illness,
            relevant_history=payload.relevant_history,
            vital_signs=payload.vital_signs,
            physical_exam=payload.physical_exam,
            clinical_impression=payload.clinical_impression,
            treatment_plan=payload.treatment_plan,
            follow_up_notes=payload.follow_up_notes,
            created_by=payload.created_by,
        )

        encounter.diagnoses = [
            Diagnosis(
                diagnosis_text=item.diagnosis_text,
                diagnosis_code=item.diagnosis_code,
                is_primary=item.is_primary,
                notes=item.notes,
                created_at=datetime.now(timezone.utc),
            )
            for item in payload.diagnoses
        ]
        encounter.exam_orders = [
            ExamOrder(
                exam_name=item.exam_name,
                exam_category=item.exam_category,
                instructions=item.instructions,
                ordered_at=datetime.now(timezone.utc),
            )
            for item in payload.exam_orders
        ]
        if payload.prescription is not None:
            encounter.prescription = Prescription(
                notes=payload.prescription.notes,
                created_at=datetime.now(timezone.utc),
                items=[
                    PrescriptionItem(
                        medication_name=item.medication_name,
                        dosage=item.dosage,
                        frequency=item.frequency,
                        duration=item.duration,
                        instructions=item.instructions,
                        created_at=datetime.now(timezone.utc),
                    )
                    for item in payload.prescription.items
                ],
            )

        created = self.repository.create(encounter)
        create_audit_log(
            self.db,
            action="create",
            entity_type="encounter",
            entity_id=str(created.id),
            after_data={"status": created.status, "patient_id": created.patient_id},
        )
        self.db.commit()
        self.db.refresh(created)
        return created

    def list_encounters(self) -> list[Encounter]:
        return self.repository.list()

    def update_encounter(self, encounter_id: int, payload: EncounterUpdate, *, updated_by: str | None = None) -> Encounter:
        encounter = self.repository.get(encounter_id)
        if encounter is None:
            raise NotFoundError("Encounter not found.")

        if encounter.status == "closed":
            raise ValidationError("Closed encounters cannot be edited.")

        before_data = {
            "encounter_type": encounter.encounter_type,
            "chief_complaint": encounter.chief_complaint,
            "treatment_plan": encounter.treatment_plan,
        }
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(encounter, field, value)
        create_audit_log(
            self.db,
            action="update",
            entity_type="encounter",
            entity_id=str(encounter.id),
            actor_id=updated_by,
            before_data=before_data,
            after_data={
                "encounter_type": encounter.encounter_type,
                "chief_complaint": encounter.chief_complaint,
                "treatment_plan": encounter.treatment_plan,
            },
        )
        self.db.commit()
        self.db.refresh(encounter)
        return encounter

    def close_encounter(self, encounter_id: int, *, closed_by: str | None = None) -> Encounter:
        encounter = self.repository.get(encounter_id)
        if encounter is None:
            raise NotFoundError("Encounter not found.")

        if encounter.status == "closed":
            raise ValidationError("Encounter is already closed.")

        previous_status = encounter.status
        encounter.status = "closed"
        encounter.closed_at = datetime.now(timezone.utc)
        create_audit_log(
            self.db,
            action="close",
            entity_type="encounter",
            entity_id=str(encounter.id),
            actor_id=closed_by,
            before_data={"status": previous_status},
            after_data={"status": "closed"},
        )
        self.db.commit()
        self.db.refresh(encounter)
        return encounter
