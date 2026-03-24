"use client";

import { EmptyStatePanel } from "@/features/module1/components/empty-state-panel";
import { PatientWorkspaceShortcuts } from "@/features/module1/components/patient-workspace-shortcuts";
import {
  appointmentStatusLabel,
  appointmentTypeLabel,
  dispatchStatusLabel,
  encounterTypeLabel,
  formatDateTime,
} from "@/features/module1/console-utils";
import type { Encounter, PatientSummary } from "@/features/module1/types";

type PatientSummarySectionProps = {
  canManagePatients: boolean;
  expandedEncounterId: number | null;
  onEditPatient: () => void;
  onGoToAgenda: () => void;
  onGoToAgendaAppointment: (appointmentId: number) => void;
  onGoToEncounters: () => void;
  onGoToMessages: () => void;
  onOpenAttachment: (attachmentId: number) => void;
  selectedSummary: PatientSummary | null;
  setExpandedEncounterId: React.Dispatch<React.SetStateAction<number | null>>;
  sortedPatientEncounters: Encounter[];
};

export function PatientSummarySection({
  canManagePatients,
  expandedEncounterId,
  onEditPatient,
  onGoToAgenda,
  onGoToAgendaAppointment,
  onGoToEncounters,
  onGoToMessages,
  onOpenAttachment,
  selectedSummary,
  setExpandedEncounterId,
  sortedPatientEncounters,
}: PatientSummarySectionProps) {
  const selectedPatient = selectedSummary?.patient ?? null;

  return (
    <article className="card section-card span-two">
      <div className="subsection-header">
        <div>
          <p className="eyebrow">Ficha del paciente</p>
          <h2>{selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : "Selecciona un paciente"}</h2>
        </div>
        {canManagePatients ? (
          <div className="section-action-panel">
            <button
              type="button"
              className="secondary-button"
              onClick={onEditPatient}
              disabled={!selectedSummary}
            >
              Editar datos paciente
            </button>
          </div>
        ) : null}
      </div>
      {selectedSummary ? (
        <div className="detail-stack">
          <div className="summary-grid">
            <div className="metric-card">
              <strong>{selectedSummary.patient.medical_record_number}</strong>
              <span>Expediente</span>
            </div>
            <div className="metric-card">
              <strong>{selectedSummary.appointments.length}</strong>
              <span>Citas</span>
            </div>
            <div className="metric-card">
              <strong>{selectedSummary.encounters.length}</strong>
              <span>Consultas</span>
            </div>
          </div>
          <PatientWorkspaceShortcuts
            appointmentsCount={selectedSummary.appointments.length}
            encountersCount={selectedSummary.encounters.length}
            messagesCount={selectedSummary.attachments.length}
            onGoToAgenda={() =>
              selectedSummary.appointments.length ? onGoToAgendaAppointment(selectedSummary.appointments[0].id) : onGoToAgenda()
            }
            onGoToEncounters={onGoToEncounters}
            onGoToMessages={onGoToMessages}
          />
          <div className="detail-panel compact-panel">
            <strong>Datos principales</strong>
            <div className="two-column-grid">
              <span>Nombre: {selectedSummary.patient.first_name} {selectedSummary.patient.last_name}</span>
              <span>Teléfono: {selectedSummary.patient.primary_phone}</span>
              <span>
                Doctor(es):{" "}
                {selectedSummary.patient.assigned_doctors?.length
                  ? selectedSummary.patient.assigned_doctors.map((doctor) => `${doctor.first_name} ${doctor.last_name}`).join(", ")
                  : "Sin asignación"}
              </span>
              <span>DPI: {selectedSummary.patient.national_id ?? "Sin registro"}</span>
              <span>Estado: {selectedSummary.patient.is_active ? "Activo" : "Inactivo"}</span>
            </div>
          </div>
          <div className="two-column-grid">
            <div className="detail-panel">
              <strong>Próximas citas</strong>
              {(selectedSummary.appointments ?? []).length ? (
                selectedSummary.appointments.map((appointment) => (
                  <button
                    type="button"
                    className="simple-list-item"
                    key={`summary-appointment-${appointment.id}`}
                    onClick={() => onGoToAgendaAppointment(appointment.id)}
                  >
                    <strong>{formatDateTime(appointment.scheduled_start)}</strong>
                    <span>{appointment.doctor_name ?? `Doctor ${appointment.doctor_id}`}</span>
                    <span>
                      {appointmentTypeLabel(appointment.appointment_type)} · {appointmentStatusLabel(appointment.status)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="empty-state">Sin citas registradas.</p>
              )}
            </div>
            <div className="detail-panel">
              <strong>Consultas</strong>
              {sortedPatientEncounters.length ? (
                sortedPatientEncounters.map((encounter) => {
                  const encounterAttachments = selectedSummary.attachments.filter(
                    (attachment) => attachment.encounter_id === encounter.id,
                  );
                  const isExpanded = expandedEncounterId === encounter.id;

                  return (
                    <div key={`summary-encounter-${encounter.id}`}>
                      <button
                        type="button"
                        className="simple-list-item"
                        onClick={() => setExpandedEncounterId((current) => (current === encounter.id ? null : encounter.id))}
                      >
                        <strong>{encounterTypeLabel(encounter.encounter_type)}</strong>
                        <span>{formatDateTime(encounter.encounter_date)}</span>
                        <span>{encounter.chief_complaint}</span>
                        <span>{isExpanded ? "Ocultar detalle" : "Ver detalle clínico"}</span>
                      </button>
                      {isExpanded ? (
                        <div className="encounter-history-card">
                          <div className="encounter-history-grid">
                            <div className="timeline-item">
                              <strong>Motivo</strong>
                              <span>{encounter.chief_complaint}</span>
                            </div>
                            <div className="timeline-item">
                              <strong>Estado</strong>
                              <span>{appointmentStatusLabel(encounter.status)}</span>
                            </div>
                          </div>
                          <div className="encounter-history-grid">
                            <div className="timeline-item">
                              <strong>Diagnósticos</strong>
                              {(encounter.diagnoses ?? []).length ? (
                                (encounter.diagnoses ?? []).map((diagnosis) => (
                                  <span key={`diagnosis-read-${diagnosis.id ?? diagnosis.diagnosis_text}`}>
                                    {diagnosis.diagnosis_text}
                                    {diagnosis.diagnosis_code ? ` · ${diagnosis.diagnosis_code}` : ""}
                                  </span>
                                ))
                              ) : (
                                <span>Sin diagnósticos registrados.</span>
                              )}
                            </div>
                            <div className="timeline-item">
                              <strong>Órdenes de examen</strong>
                              {(encounter.exam_orders ?? []).length ? (
                                (encounter.exam_orders ?? []).map((exam) => (
                                  <span key={`exam-read-${exam.id ?? exam.exam_name}`}>
                                    {exam.exam_name}
                                    {exam.status ? ` · ${dispatchStatusLabel(exam.status)}` : ""}
                                  </span>
                                ))
                              ) : (
                                <span>Sin exámenes registrados.</span>
                              )}
                            </div>
                          </div>
                          <div className="encounter-history-grid">
                            <div className="timeline-item">
                              <strong>Receta</strong>
                              {encounter.prescription?.items?.length ? (
                                encounter.prescription.items.map((item) => (
                                  <span key={`prescription-read-${item.id ?? item.medication_name}`}>
                                    {item.medication_name}
                                    {item.dosage ? ` · ${item.dosage}` : ""}
                                    {item.frequency ? ` · ${item.frequency}` : ""}
                                  </span>
                                ))
                              ) : (
                                <span>Sin receta registrada.</span>
                              )}
                            </div>
                            <div className="timeline-item">
                              <strong>Adjuntos</strong>
                              {encounterAttachments.length ? (
                                encounterAttachments.map((attachment) => (
                                  <button
                                    type="button"
                                    key={`encounter-attachment-${attachment.id}`}
                                    className="secondary-button align-start"
                                    onClick={() => onOpenAttachment(attachment.id)}
                                  >
                                    {attachment.file_name}
                                  </button>
                                ))
                              ) : (
                                <span>Sin adjuntos en esta consulta.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="empty-state">Sin consultas registradas.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <EmptyStatePanel
          body="Abre un paciente desde el listado para ver citas, consultas, adjuntos y acciones clínicas relacionadas."
          eyebrow="Expediente"
          title="Todavia no hay un paciente enfocado"
        />
      )}
    </article>
  );
}
