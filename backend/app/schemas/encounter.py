from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DiagnosisCreate(BaseModel):
    diagnosis_text: str
    diagnosis_code: str | None = None
    is_primary: bool = False
    notes: str | None = None


class PrescriptionItemCreate(BaseModel):
    medication_name: str
    dosage: str | None = None
    frequency: str | None = None
    duration: str | None = None
    instructions: str | None = None


class PrescriptionCreate(BaseModel):
    notes: str | None = None
    items: list[PrescriptionItemCreate] = []


class ExamOrderCreate(BaseModel):
    exam_name: str
    exam_category: str | None = None
    instructions: str | None = None


class EncounterCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: int | None = None
    encounter_date: datetime
    encounter_type: str
    chief_complaint: str
    present_illness: str | None = None
    relevant_history: str | None = None
    vital_signs: str | None = None
    physical_exam: str | None = None
    clinical_impression: str | None = None
    treatment_plan: str | None = None
    follow_up_notes: str | None = None
    created_by: str | None = None
    diagnoses: list[DiagnosisCreate] = []
    prescription: PrescriptionCreate | None = None
    exam_orders: list[ExamOrderCreate] = []


class EncounterUpdate(BaseModel):
    encounter_type: str | None = None
    chief_complaint: str | None = None
    present_illness: str | None = None
    relevant_history: str | None = None
    vital_signs: str | None = None
    physical_exam: str | None = None
    clinical_impression: str | None = None
    treatment_plan: str | None = None
    follow_up_notes: str | None = None


class EncounterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: int
    appointment_id: int | None
    encounter_date: datetime
    encounter_type: str
    chief_complaint: str
    status: str
    created_at: datetime
    updated_at: datetime


class EncounterCloseRequest(BaseModel):
    closed_by: str | None = None


class DiagnosisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    diagnosis_text: str
    diagnosis_code: str | None
    is_primary: bool
    notes: str | None


class PrescriptionItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medication_name: str
    dosage: str | None
    frequency: str | None
    duration: str | None
    instructions: str | None


class PrescriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    notes: str | None
    items: list[PrescriptionItemRead]


class ExamOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_name: str
    exam_category: str | None
    instructions: str | None
    status: str


class EncounterDetailRead(EncounterRead):
    diagnoses: list[DiagnosisRead]
    prescription: PrescriptionRead | None
    exam_orders: list[ExamOrderRead]
