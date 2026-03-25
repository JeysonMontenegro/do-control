"use client";

import { ActiveFiltersBar } from "@/features/module1/components/active-filters-bar";
import { EmptyStatePanel } from "@/features/module1/components/empty-state-panel";
import { DateField, RequiredLabel, SearchableSelect } from "@/features/module1/components/form-fields";
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
  doctorFilter: string;
  diagnoses: Diagnosis[];
  downloadingAttachmentId: number | null;
  encounters: Encounter[];
  encounterForm: EncounterForm;
  examOrders: ExamOrder[];
  isAdmin: boolean;
  isReceptionist: boolean;
  prescriptionItems: PrescriptionItem[];
  patients: Patient[];
  selectedPatientId: string;
  selectedDoctor: Doctor | null;
  selectedSummary: PatientSummary | null;
  onEncounterDoctorFilterChange: (value: string) => void;
  onGoToAgendaAppointment: (appointmentId: number) => void;
  onGoToPatient: (patientId: number) => void;
  setAttachmentEncounterId: React.Dispatch<React.SetStateAction<string>>;
  setAttachmentFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAttachmentType: React.Dispatch<React.SetStateAction<string>>;
  setDiagnoses: React.Dispatch<React.SetStateAction<Diagnosis[]>>;
  setEncounterForm: React.Dispatch<React.SetStateAction<EncounterForm>>;
  setExamOrders: React.Dispatch<React.SetStateAction<ExamOrder[]>>;
  setPrescriptionItems: React.Dispatch<React.SetStateAction<PrescriptionItem[]>>;
  closeEncounter: (encounterId: number) => void;
  deleteAttachment: (attachmentId: number) => void;
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
  doctorFilter,
  diagnoses,
  downloadingAttachmentId,
  encounters,
  encounterForm,
  examOrders,
  isAdmin,
  isReceptionist,
  prescriptionItems,
  patients,
  selectedPatientId,
  selectedDoctor,
  selectedSummary,
  onEncounterDoctorFilterChange,
  onGoToAgendaAppointment,
  onGoToPatient,
  setAttachmentEncounterId,
  setAttachmentFile,
  setAttachmentType,
  setDiagnoses,
  setEncounterForm,
  setExamOrders,
  setPrescriptionItems,
  closeEncounter,
  deleteAttachment,
  openAttachment,
  submitAttachment,
  submitEncounter,
}: EncountersSectionProps) {
  const doctorOptions = availableDoctors.map((doctor) => ({
    value: String(doctor.id),
    label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
  }));
  const patientOptions = patients.map((patient) => ({
    value: String(patient.id),
    label: `${patient.first_name} ${patient.last_name}`,
    description: patient.medical_record_number,
    keywords: [patient.primary_phone ?? "", patient.national_id ?? ""],
  }));
  const selectedFilterDoctor = doctorFilter
    ? availableDoctors.find((doctor) => String(doctor.id) === doctorFilter) ?? null
    : null;

  const availableAppointments = appointments.filter((appointment) => {
    if (appointment.status === "cancelled" || appointment.confirmation_status === "cancelled") {
      return false;
    }
    if (encounterForm.patient_id && String(appointment.patient_id) !== encounterForm.patient_id) {
      return false;
    }
    if (encounterForm.doctor_id && String(appointment.doctor_id) !== encounterForm.doctor_id) {
      return false;
    }
    return true;
  });
  const appointmentOptions = availableAppointments.map((appointment) => ({
    value: String(appointment.id),
    label: appointment.patient_name ?? `Paciente ${appointment.patient_id}`,
    description: formatDateTime(appointment.scheduled_start),
  }));
  const attachmentEncounterOptions = (selectedSummary?.encounters ?? []).map((encounter) => ({
    value: String(encounter.id),
    label: encounterTypeLabel(encounter.encounter_type),
    description: formatDateTime(encounter.encounter_date),
  }));
  const attachmentPatientId = selectedPatientId || encounterForm.patient_id;

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
                <SearchableSelect
                  value={encounterForm.patient_id}
                  onChange={(value) => {
                    setEncounterForm((current) => ({ ...current, patient_id: value, appointment_id: "" }));
                  }}
                  options={patientOptions}
                  placeholder="Seleccionar paciente"
                  searchPlaceholder="Buscar paciente"
                  required
                />
              </label>
              {isAdmin || (canChooseAmongMultipleDoctors && availableDoctors.length > 1) ? (
                <label>
                  <RequiredLabel>Doctor</RequiredLabel>
                  <SearchableSelect
                    value={encounterForm.doctor_id}
                    onChange={(value) => setEncounterForm((current) => ({ ...current, doctor_id: value }))}
                    options={doctorOptions}
                    placeholder={isAdmin ? "Seleccionar doctor" : "Selecciona doctor"}
                    searchPlaceholder="Buscar doctor"
                    required
                  />
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
                <SearchableSelect
                  value={encounterForm.appointment_id}
                  onChange={(value) => setEncounterForm((current) => ({ ...current, appointment_id: value }))}
                  options={appointmentOptions}
                  placeholder="Sin cita"
                  clearLabel="Sin cita"
                  searchPlaceholder="Buscar cita"
                />
              </label>
              <label>
                <RequiredLabel>Tipo de consulta</RequiredLabel>
                <select
                  value={encounterForm.encounter_type}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, encounter_type: event.target.value }))}
                  required
                >
                  <option value="general_consultation">Consulta general</option>
                  <option value="first_consultation">Primera consulta</option>
                  <option value="follow_up">Seguimiento</option>
                  <option value="virtual_consultation">Consulta virtual</option>
                  <option value="emergency_consultation">Emergencia</option>
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
            <section className="clinical-form-section">
              <div className="clinical-form-section-header">
                <div>
                  <p className="eyebrow">Paso 1</p>
                  <h3>Motivo clínico</h3>
                </div>
                <span>Escribe lo esencial que te trajo a consulta.</span>
              </div>
              <label>
                <RequiredLabel>Motivo de consulta</RequiredLabel>
                <textarea
                  value={encounterForm.chief_complaint}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, chief_complaint: event.target.value }))}
                  required
                  placeholder="Ejemplo: dolor abdominal de 3 días, náusea, sin fiebre."
                />
              </label>
            </section>

            <section className="clinical-form-section">
              <div className="clinical-form-section-header">
                <div>
                  <p className="eyebrow">Paso 2</p>
                  <h3>Impresión diagnóstica</h3>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDiagnoses((current) => [...current, { diagnosis_text: "", diagnosis_code: null, is_primary: false, notes: null }])}
                >
                  Agregar diagnóstico
                </button>
              </div>
              <div className="clinical-entry-stack">
                {diagnoses.map((diagnosis, index) => (
                  <div className="clinical-entry-card" key={`diagnosis-${index}`}>
                    <div className="clinical-entry-card-header">
                      <strong>Diagnóstico {index + 1}</strong>
                      <div className="row-actions">
                        <label className="inline-check">
                          <input
                            type="checkbox"
                            checked={diagnosis.is_primary}
                            onChange={(event) =>
                              setDiagnoses((current) =>
                                current.map((item, itemIndex) => ({
                                  ...item,
                                  is_primary: itemIndex === index ? event.target.checked : false,
                                })),
                              )
                            }
                          />
                          <span>Principal</span>
                        </label>
                        {diagnoses.length > 1 ? (
                          <button
                            type="button"
                            className="ghost-button danger-text-button"
                            onClick={() =>
                              setDiagnoses((current) => {
                                const next = current.filter((_, itemIndex) => itemIndex !== index);
                                if (next.length && !next.some((item) => item.is_primary)) {
                                  next[0] = { ...next[0], is_primary: true };
                                }
                                return next;
                              })
                            }
                          >
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="stacked-fields">
                      <input
                        placeholder="Diagnóstico o impresión clínica"
                        value={diagnosis.diagnosis_text}
                        onChange={(event) =>
                          setDiagnoses((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, diagnosis_text: event.target.value } : item)),
                          )
                        }
                      />
                      <input
                        placeholder="Código CIE-10 opcional"
                        value={diagnosis.diagnosis_code ?? ""}
                        onChange={(event) =>
                          setDiagnoses((current) =>
                            current.map((item, itemIndex) => (itemIndex === index ? { ...item, diagnosis_code: event.target.value } : item)),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="clinical-form-section">
              <div className="clinical-form-section-header">
                <div>
                  <p className="eyebrow">Paso 3</p>
                  <h3>Plan terapéutico</h3>
                </div>
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
                  Agregar medicamento
                </button>
              </div>
              <div className="clinical-entry-stack">
                {prescriptionItems.map((item, index) => (
                  <div className="clinical-entry-card" key={`medication-${index}`}>
                    <div className="clinical-entry-card-header">
                      <strong>Medicamento {index + 1}</strong>
                      {prescriptionItems.length > 1 ? (
                        <button
                          type="button"
                          className="ghost-button danger-text-button"
                          onClick={() => setPrescriptionItems((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                    <div className="stacked-fields">
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
                  </div>
                ))}
              </div>
            </section>

            <section className="clinical-form-section">
              <div className="clinical-form-section-header">
                <div>
                  <p className="eyebrow">Paso 4</p>
                  <h3>Estudios y órdenes</h3>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setExamOrders((current) => [...current, { exam_name: "", exam_category: null, instructions: null }])}
                >
                  Agregar estudio
                </button>
              </div>
              <div className="clinical-entry-stack">
                {examOrders.map((item, index) => (
                  <div className="clinical-entry-card" key={`exam-${index}`}>
                    <div className="clinical-entry-card-header">
                      <strong>Estudio {index + 1}</strong>
                      {examOrders.length > 1 ? (
                        <button
                          type="button"
                          className="ghost-button danger-text-button"
                          onClick={() => setExamOrders((current) => current.filter((_, entryIndex) => entryIndex !== index))}
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                    <div className="stacked-fields">
                      <input
                        placeholder="Examen o estudio"
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
                  </div>
                ))}
              </div>
            </section>
            <div className="clinical-submit-row">
              <div className="detail-panel compact-panel">
                <strong>{encounterTypeLabel(encounterForm.encounter_type)}</strong>
                <span>Paciente, fecha, diagnóstico y plan quedan en una sola nota clínica.</span>
              </div>
              <button type="submit">Guardar consulta</button>
            </div>
          </form>
        ) : (
          <EmptyStatePanel
            body="Tu perfil conserva acceso de lectura al historial clinico, pero no puede crear consultas nuevas desde este tab."
            eyebrow="Permisos"
            title="Solo puedes revisar consultas"
            tone="warning"
          />
        )}
        <form className="form-card compact-form" onSubmit={submitAttachment}>
          <section className="clinical-form-section">
            <div className="clinical-form-section-header">
              <div>
                <p className="eyebrow">Paso 5</p>
                <h3>Documentos clínicos</h3>
              </div>
              <span>Carga resultados, imágenes o documentos de esta atención desde aquí.</span>
            </div>
            <div className="detail-panel compact-panel">
              <strong>Adjuntar documento</strong>
              <span>Usa el mismo paciente de la consulta. Solo elige el tipo, la consulta relacionada y el archivo.</span>
            </div>
            <div className="two-column-grid">
              <label>
                <span>Tipo</span>
                <select value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)}>
                  <option value="lab_result">Resultado de laboratorio</option>
                  <option value="ultrasound">Ultrasonido</option>
                  <option value="image">Imagen</option>
                  <option value="clinical_document">Documento clínico</option>
                </select>
              </label>
              <div />
            </div>
            {selectedSummary ? (
              <>
                <div className="two-column-grid">
                  <label>
                    <span>Consulta</span>
                    <SearchableSelect
                      value={attachmentEncounterId}
                      onChange={setAttachmentEncounterId}
                      options={attachmentEncounterOptions}
                      placeholder="Sin consulta"
                      clearLabel="Sin consulta"
                      searchPlaceholder="Buscar consulta"
                    />
                  </label>
                  <label>
                    <span>Archivo</span>
                    <input type="file" onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)} required />
                  </label>
                </div>
                <div className="clinical-submit-row">
                  <div className="detail-panel compact-panel">
                    <strong>Archivos del paciente</strong>
                    <span>Después de subirlos puedes abrirlos o quitarlos desde esta misma sección.</span>
                  </div>
                  <button type="submit">Adjuntar documento</button>
                </div>
              </>
            ) : (
              <EmptyStatePanel
                body="Selecciona un paciente en la parte superior del registro para ver sus consultas y gestionar documentos."
                eyebrow="Adjuntos"
                title="Primero elige el paciente para cargar o quitar archivos"
              />
            )}
            {selectedSummary ? (
              <div className="table-list">
                {selectedSummary.attachments.length ? (
                  selectedSummary.attachments.map((attachment) => (
                    <div className="simple-list-item" key={`attachment-${attachment.id}`}>
                      <strong>{attachment.file_name}</strong>
                      <span>{attachment.file_type}</span>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => openAttachment(attachment.id)}
                          disabled={downloadingAttachmentId === attachment.id}
                        >
                          {downloadingAttachmentId === attachment.id ? "Preparando..." : "Abrir"}
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => {
                            if (window.confirm("Se eliminará este archivo clínico. ¿Deseas continuar?")) {
                              deleteAttachment(attachment.id);
                            }
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyStatePanel
                    body="Este paciente aun no tiene adjuntos ligados a sus consultas. Puedes cargar resultados o documentos clinicos desde este mismo bloque."
                    eyebrow="Adjuntos"
                    title="Todavia no hay archivos para este paciente"
                  />
                )}
              </div>
            ) : null}
          </section>
        </form>
      </article>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Historial y documentos</p>
            <h2>Consultas recientes y adjuntos</h2>
          </div>
          {isAdmin || (isReceptionist && availableDoctors.length > 1) ? (
            <SearchableSelect
              value={doctorFilter}
              onChange={onEncounterDoctorFilterChange}
              options={doctorOptions}
              placeholder={isAdmin ? "Todos los doctores" : "Todos mis doctores"}
              clearLabel={isAdmin ? "Todos los doctores" : "Todos mis doctores"}
              searchPlaceholder="Buscar doctor"
            />
          ) : null}
        </div>
        <ActiveFiltersBar
          items={selectedFilterDoctor ? [{ label: "Doctor", value: `Dr. ${selectedFilterDoctor.first_name} ${selectedFilterDoctor.last_name}` }] : []}
          onClearAll={doctorFilter ? () => onEncounterDoctorFilterChange("") : undefined}
          resultsLabel="consultas visibles"
          resultsValue={encounters.length}
        />
        <div className="table-list">
          {encounters.length ? (
            encounters.map((encounter) => (
              <div className="simple-list-item" key={`encounter-${encounter.id}`}>
                <strong>{encounterTypeLabel(encounter.encounter_type)}</strong>
                <span>{formatDateTime(encounter.encounter_date)}</span>
                <span>{encounter.chief_complaint}</span>
                <div className="row-actions">
                  <button type="button" className="secondary-button" onClick={() => onGoToPatient(encounter.patient_id)}>
                    Ver paciente
                  </button>
                  {encounter.appointment_id ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onGoToAgendaAppointment(encounter.appointment_id as number)}
                    >
                      Ver cita
                    </button>
                  ) : null}
                  {encounter.status !== "closed" && canManageEncounters ? (
                    <button type="button" className="danger-button" onClick={() => closeEncounter(encounter.id)}>
                      Cerrar
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <EmptyStatePanel
              body="Cuando registres o recibas consultas dentro del contexto actual, apareceran aqui junto con sus adjuntos."
              eyebrow="Historial"
              title="Todavia no hay consultas visibles"
            />
          )}
        </div>
      </article>
    </section>
  );
}
