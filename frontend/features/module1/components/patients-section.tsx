"use client";

import { EmptyStatePanel } from "@/features/module1/components/empty-state-panel";
import { PatientSummarySection } from "@/features/module1/components/patient-summary-section";
import { formatDateTime } from "@/features/module1/console-utils";
import type { Encounter, Patient, PatientSummary } from "@/features/module1/types";

type PatientsSectionProps = {
  canManagePatients: boolean;
  expandedEncounterId: number | null;
  isAdmin: boolean;
  patientSearch: string;
  patients: Patient[];
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  sortedPatientEncounters: Encounter[];
  onEditPatient: () => void;
  onGoToAgendaAppointment: (appointmentId: number) => void;
  onOpenAttachment: (attachmentId: number) => void;
  onPatientSearchChange: (value: string) => void;
  onSelectPatient: (patientId: string) => void;
  onShowCreatePatient: () => void;
  setExpandedEncounterId: React.Dispatch<React.SetStateAction<number | null>>;
};

export function PatientsSection({
  canManagePatients,
  expandedEncounterId,
  isAdmin,
  patientSearch,
  patients,
  selectedPatientId,
  selectedSummary,
  sortedPatientEncounters,
  onEditPatient,
  onGoToAgendaAppointment,
  onOpenAttachment,
  onPatientSearchChange,
  onSelectPatient,
  onShowCreatePatient,
  setExpandedEncounterId,
}: PatientsSectionProps) {
  return (
    <section className="tab-layout patients-layout">
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Pacientes</p>
            <h2>Listado</h2>
          </div>
          <div className="section-tools-panel">
            {canManagePatients ? (
              <button type="button" className="secondary-button" onClick={onShowCreatePatient}>
                Agregar paciente
              </button>
            ) : null}
            <input
              className="search-input"
              placeholder="Buscar por nombre, teléfono, DPI o expediente"
              value={patientSearch}
              onChange={(event) => onPatientSearchChange(event.target.value)}
            />
          </div>
        </div>
        <div className="table-wrap">
          {patients.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Expediente</th>
                  <th>Paciente</th>
                  <th>{isAdmin ? "Doctor(es)" : "Doctor"}</th>
                  <th>Teléfono</th>
                  <th>Creado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={`patient-${patient.id}`}
                    className={selectedPatientId === String(patient.id) ? "table-row-active" : ""}
                    onClick={() => onSelectPatient(String(patient.id))}
                  >
                    <td>{patient.medical_record_number}</td>
                    <td>
                      {patient.first_name} {patient.last_name}
                    </td>
                    <td>
                      {patient.assigned_doctors?.length
                        ? patient.assigned_doctors.map((doctor) => `${doctor.first_name} ${doctor.last_name}`).join(", ")
                        : "Sin asignación"}
                    </td>
                    <td>{patient.primary_phone}</td>
                    <td>{patient.created_at ? formatDateTime(patient.created_at) : "Sin fecha"}</td>
                    <td>{patient.is_active ? "Activo" : "Inactivo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyStatePanel
              actionLabel={patientSearch.trim() ? "Limpiar busqueda" : canManagePatients ? "Agregar paciente" : undefined}
              body={
                patientSearch.trim()
                  ? "No hubo coincidencias con el filtro actual. Limpia la busqueda o intenta con telefono, DPI o expediente."
                  : "Todavia no hay pacientes visibles en este contexto. Puedes registrar uno nuevo o cambiar el contexto operativo."
              }
              onAction={
                patientSearch.trim()
                  ? () => onPatientSearchChange("")
                  : canManagePatients
                    ? onShowCreatePatient
                    : undefined
              }
              title={patientSearch.trim() ? "No encontramos pacientes para ese filtro" : "Esta vista todavia no tiene pacientes"}
            />
          )}
        </div>
      </article>
      <PatientSummarySection
        canManagePatients={canManagePatients}
        expandedEncounterId={expandedEncounterId}
        onEditPatient={onEditPatient}
        onGoToAgendaAppointment={onGoToAgendaAppointment}
        onOpenAttachment={onOpenAttachment}
        selectedSummary={selectedSummary}
        setExpandedEncounterId={setExpandedEncounterId}
        sortedPatientEncounters={sortedPatientEncounters}
      />
    </section>
  );
}
