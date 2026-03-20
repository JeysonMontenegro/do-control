"use client";

import { DateField, RequiredLabel } from "@/features/module1/components/form-fields";
import { encounterTypeLabel, formatDateTime } from "@/features/module1/console-utils";
import type {
  Appointment,
  Diagnosis,
  Doctor,
  Encounter,
  ExamOrder,
  Patient,
  PatientSummary,
  PrescriptionItem,
} from "@/features/module1/types";

type EncounterForm = {
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  encounter_date: string;
  encounter_time: string;
  encounter_type: string;
  chief_complaint: string;
  created_by: string;
};

type EncountersSectionProps = {
  appointments: Appointment[];
  attachmentEncounterId: string;
  attachmentType: string;
  availableDoctors: Doctor[];
  canChooseAmongMultipleDoctors: boolean;
  canManageEncounters: boolean;
  diagnoses: Diagnosis[];
  downloadingAttachmentId: number | null;
  encounters: Encounter[];
  encounterForm: EncounterForm;
  examOrders: ExamOrder[];
  isAdmin: boolean;
  prescriptionItems: PrescriptionItem[];
  patients: Patient[];
  selectedDoctor: Doctor | null;
  selectedSummary: PatientSummary | null;
  setAttachmentEncounterId: React.Dispatch<React.SetStateAction<string>>;
  setAttachmentFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAttachmentType: React.Dispatch<React.SetStateAction<string>>;
  setDiagnoses: React.Dispatch<React.SetStateAction<Diagnosis[]>>;
  setEncounterForm: React.Dispatch<React.SetStateAction<EncounterForm>>;
  setExamOrders: React.Dispatch<React.SetStateAction<ExamOrder[]>>;
  setPrescriptionItems: React.Dispatch<React.SetStateAction<PrescriptionItem[]>>;
  closeEncounter: (encounterId: number) => void;
  openAttachment: (attachmentId: number) => void;
  submitAttachment: (event: React.FormEvent<HTMLFormElement>) => void;
  submitEncounter: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function EncountersSection({
  appointments,
  attachmentEncounterId,
  attachmentType,
  availableDoctors,
  canChooseAmongMultipleDoctors,
  canManageEncounters,
  diagnoses,
  downloadingAttachmentId,
  encounters,
  encounterForm,
  examOrders,
  isAdmin,
  prescriptionItems,
  patients,
  selectedDoctor,
  selectedSummary,
  setAttachmentEncounterId,
  setAttachmentFile,
  setAttachmentType,
  setDiagnoses,
  setEncounterForm,
  setExamOrders,
  setPrescriptionItems,
  closeEncounter,
  openAttachment,
  submitAttachment,
  submitEncounter,
}: EncountersSectionProps) {
  return (
    <section className="tab-layout">
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Consultas</p>
            <h2>Registro clínico</h2>
          </div>
        </div>
        {canManageEncounters ? (
          <form className="form-card" onSubmit={submitEncounter}>
            <div className="two-column-grid">
              <label>
                <RequiredLabel>Paciente</RequiredLabel>
                <select
                  value={encounterForm.patient_id}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, patient_id: event.target.value }))}
                  required
                >
                  <option value="">Seleccionar</option>
                  {patients.map((patient) => (
                    <option key={`encounter-patient-${patient.id}`} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </label>
              {isAdmin || (canChooseAmongMultipleDoctors && availableDoctors.length > 1) ? (
                <label>
                  <RequiredLabel>Doctor</RequiredLabel>
                  <select
                    value={encounterForm.doctor_id}
                    onChange={(event) => setEncounterForm((current) => ({ ...current, doctor_id: event.target.value }))}
                    required
                  >
                    <option value="">{isAdmin ? "Seleccionar" : "Selecciona doctor"}</option>
                    {availableDoctors.map((doctor) => (
                      <option key={`encounter-doctor-${doctor.id}`} value={doctor.id}>
                        {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : !isAdmin && availableDoctors.length > 1 ? (
                <p className="empty-state">No puedes elegir entre varios doctores hasta que administración habilite esa visibilidad.</p>
              ) : selectedDoctor ? (
                <label>
                  <span>Doctor</span>
                  <input value={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`} readOnly />
                </label>
              ) : null}
              <label>
                <span>Cita relacionada</span>
                <select
                  value={encounterForm.appointment_id}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, appointment_id: event.target.value }))}
                >
                  <option value="">Sin cita</option>
                  {appointments.map((appointment) => (
                    <option key={`encounter-appointment-${appointment.id}`} value={appointment.id}>
                      {appointment.patient_name ?? `Paciente ${appointment.patient_id}`} · {formatDateTime(appointment.scheduled_start)}
                    </option>
                  ))}
                </select>
              </label>
              <DateField
                label="Fecha"
                value={encounterForm.encounter_date}
                onChange={(nextValue) => setEncounterForm((current) => ({ ...current, encounter_date: nextValue }))}
                required
              />
              <label>
                <RequiredLabel>Hora</RequiredLabel>
                <input
                  type="time"
                  value={encounterForm.encounter_time}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, encounter_time: event.target.value }))}
                  required
                />
              </label>
            </div>
            <label>
              <RequiredLabel>Motivo de consulta</RequiredLabel>
              <textarea
                value={encounterForm.chief_complaint}
                onChange={(event) => setEncounterForm((current) => ({ ...current, chief_complaint: event.target.value }))}
                required
              />
            </label>
            <div className="subsection">
              <div className="subsection-header">
                <h3>Diagnósticos</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDiagnoses((current) => [...current, { diagnosis_text: "", diagnosis_code: null, is_primary: false, notes: null }])}
                >
                  Agregar
                </button>
              </div>
              {diagnoses.map((diagnosis, index) => (
                <div className="stacked-fields" key={`diagnosis-${index}`}>
                  <input
                    placeholder="Diagnóstico"
                    value={diagnosis.diagnosis_text}
                    onChange={(event) =>
                      setDiagnoses((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, diagnosis_text: event.target.value } : item)),
                      )
                    }
                  />
                  <input
                    placeholder="Código"
                    value={diagnosis.diagnosis_code ?? ""}
                    onChange={(event) =>
                      setDiagnoses((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, diagnosis_code: event.target.value } : item)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="subsection">
              <div className="subsection-header">
                <h3>Receta</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setPrescriptionItems((current) => [
                      ...current,
                      { medication_name: "", dosage: null, frequency: null, duration: null, instructions: null },
                    ])
                  }
                >
                  Agregar
                </button>
              </div>
              {prescriptionItems.map((item, index) => (
                <div className="stacked-fields" key={`medication-${index}`}>
                  <input
                    placeholder="Medicamento"
                    value={item.medication_name}
                    onChange={(event) =>
                      setPrescriptionItems((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, medication_name: event.target.value } : entry)),
                      )
                    }
                  />
                  <input
                    placeholder="Dosis"
                    value={item.dosage ?? ""}
                    onChange={(event) =>
                      setPrescriptionItems((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, dosage: event.target.value } : entry)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="subsection">
              <div className="subsection-header">
                <h3>Órdenes de examen</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setExamOrders((current) => [...current, { exam_name: "", exam_category: null, instructions: null }])}
                >
                  Agregar
                </button>
              </div>
              {examOrders.map((item, index) => (
                <div className="stacked-fields" key={`exam-${index}`}>
                  <input
                    placeholder="Examen"
                    value={item.exam_name}
                    onChange={(event) =>
                      setExamOrders((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, exam_name: event.target.value } : entry)),
                      )
                    }
                  />
                  <input
                    placeholder="Categoría"
                    value={item.exam_category ?? ""}
                    onChange={(event) =>
                      setExamOrders((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, exam_category: event.target.value } : entry)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <button type="submit">Guardar consulta</button>
          </form>
        ) : (
          <p className="empty-state">Tu perfil puede revisar consultas, pero no registrar nuevas.</p>
        )}
      </article>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Historial</p>
            <h2>Consultas recientes</h2>
          </div>
        </div>
        <div className="table-list">
          {encounters.map((encounter) => (
            <div className="simple-list-item" key={`encounter-${encounter.id}`}>
              <strong>{encounterTypeLabel(encounter.encounter_type)}</strong>
              <span>{formatDateTime(encounter.encounter_date)}</span>
              <span>{encounter.chief_complaint}</span>
              {encounter.status !== "closed" && canManageEncounters ? (
                <div className="row-actions">
                  <button type="button" className="danger-button" onClick={() => closeEncounter(encounter.id)}>
                    Cerrar
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {selectedSummary ? (
          <form className="form-card compact-form" onSubmit={submitAttachment}>
            <h3>Adjuntar documento</h3>
            <label>
              <span>Tipo</span>
              <select value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)}>
                <option value="lab_result">Resultado de laboratorio</option>
                <option value="ultrasound">Ultrasonido</option>
                <option value="image">Imagen</option>
                <option value="clinical_document">Documento clínico</option>
              </select>
            </label>
            <label>
              <span>Consulta</span>
              <select value={attachmentEncounterId} onChange={(event) => setAttachmentEncounterId(event.target.value)}>
                <option value="">Sin consulta</option>
                {selectedSummary.encounters.map((encounter) => (
                  <option key={`attachment-encounter-${encounter.id}`} value={encounter.id}>
                    {encounterTypeLabel(encounter.encounter_type)} · {formatDateTime(encounter.encounter_date)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Archivo</span>
              <input type="file" onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)} required />
            </label>
            <button type="submit">Adjuntar</button>
            <div className="table-list">
              {selectedSummary.attachments.map((attachment) => (
                <div className="simple-list-item" key={`attachment-${attachment.id}`}>
                  <strong>{attachment.file_name}</strong>
                  <span>{attachment.file_type}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openAttachment(attachment.id)}
                    disabled={downloadingAttachmentId === attachment.id}
                  >
                    {downloadingAttachmentId === attachment.id ? "Preparando..." : "Abrir"}
                  </button>
                </div>
              ))}
            </div>
          </form>
        ) : null}
      </article>
    </section>
  );
}
