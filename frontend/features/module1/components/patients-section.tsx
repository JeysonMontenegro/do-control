"use client";

import { ActiveFiltersBar } from "@/features/module1/components/active-filters-bar";
import { EmptyStatePanel } from "@/features/module1/components/empty-state-panel";
import { SearchableSelect } from "@/features/module1/components/form-fields";
import { PatientSummarySection } from "@/features/module1/components/patient-summary-section";
import { formatDateTime } from "@/features/module1/console-utils";
import { formatPhoneForDisplay } from "@/features/module1/phone-utils";
import type { Doctor, Encounter, Patient, PatientSummary } from "@/features/module1/types";

type PatientsSectionProps = {
  availableDoctors: Doctor[];
  canManagePatients: boolean;
  doctorFilter: string;
  expandedEncounterId: number | null;
  isAdmin: boolean;
  isReceptionist: boolean;
  patientSearch: string;
  patients: Patient[];
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  sortedPatientEncounters: Encounter[];
  onEditPatient: () => void;
  onGoToAgenda: () => void;
  onGoToAgendaAppointment: (appointmentId: number) => void;
  onGoToEncounters: () => void;
  onGoToMessages: () => void;
  onPatientDoctorFilterChange: (value: string) => void;
  onOpenAttachment: (attachmentId: number) => void;
  onPatientSearchChange: (value: string) => void;
  onSelectPatient: (patientId: string) => void;
  onShowCreatePatient: () => void;
  onTogglePatientActive: () => void;
  setExpandedEncounterId: React.Dispatch<React.SetStateAction<number | null>>;
};

export function PatientsSection({
  availableDoctors,
  canManagePatients,
  doctorFilter,
  expandedEncounterId,
  isAdmin,
  isReceptionist,
  patientSearch,
  patients,
  selectedPatientId,
  selectedSummary,
  sortedPatientEncounters,
  onEditPatient,
  onGoToAgenda,
  onGoToAgendaAppointment,
  onGoToEncounters,
  onGoToMessages,
  onPatientDoctorFilterChange,
  onOpenAttachment,
  onPatientSearchChange,
  onSelectPatient,
  onShowCreatePatient,
  onTogglePatientActive,
  setExpandedEncounterId,
}: PatientsSectionProps) {
  const patientLabel = (patient: Patient) => patient.display_name?.trim() || `${patient.first_name} ${patient.last_name}`;
  const doctorOptions = availableDoctors.map((doctor) => ({
    value: String(doctor.id),
    label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
  }));
  const selectedDoctorLabel = doctorFilter
    ? availableDoctors.find((doctor) => String(doctor.id) === doctorFilter)
    : null;

  return (
    <section className="tab-layout patients-layout">
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Pacientes</p>
            <h2>Listado</h2>
          </div>
          <div className="section-tools-panel">
            {isAdmin || (isReceptionist && availableDoctors.length > 1) ? (
              <SearchableSelect
                value={doctorFilter}
                onChange={onPatientDoctorFilterChange}
                options={doctorOptions}
                placeholder={isAdmin ? "Todos los doctores" : "Todos mis doctores"}
                clearLabel={isAdmin ? "Todos los doctores" : "Todos mis doctores"}
                searchPlaceholder="Buscar doctor"
              />
            ) : null}
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
        <ActiveFiltersBar
          items={[
            ...(selectedDoctorLabel
              ? [{ label: "Doctor", value: `Dr. ${selectedDoctorLabel.first_name} ${selectedDoctorLabel.last_name}` }]
              : []),
            ...(patientSearch.trim() ? [{ label: "Busqueda", value: patientSearch.trim() }] : []),
          ]}
          onClearAll={
            doctorFilter || patientSearch.trim()
              ? () => {
                  onPatientDoctorFilterChange("");
                  onPatientSearchChange("");
                }
              : undefined
          }
          resultsLabel="pacientes visibles"
          resultsValue={patients.length}
        />
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
                    <td>{patientLabel(patient)}</td>
                    <td>
                      {patient.assigned_doctors?.length
                        ? patient.assigned_doctors.map((doctor) => `${doctor.first_name} ${doctor.last_name}`).join(", ")
                        : "Sin asignación"}
                    </td>
                    <td>{formatPhoneForDisplay(patient.primary_phone)}</td>
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
        onGoToAgenda={onGoToAgenda}
        onGoToAgendaAppointment={onGoToAgendaAppointment}
        onGoToEncounters={onGoToEncounters}
        onGoToMessages={onGoToMessages}
        onOpenAttachment={onOpenAttachment}
        onTogglePatientActive={onTogglePatientActive}
        selectedSummary={selectedSummary}
        setExpandedEncounterId={setExpandedEncounterId}
        sortedPatientEncounters={sortedPatientEncounters}
      />
    </section>
  );
}
