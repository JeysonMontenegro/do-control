"use client";

import type { Doctor, PatientSummary } from "@/features/module1/types";

type ConsoleContextBarProps = {
  appointmentFilter: string;
  currentUserDisplay: string;
  globalSearch: string;
  onClearAgendaFilter: () => void;
  onClearPatientFocus: () => void;
  onClearSearch: () => void;
  selectedDoctor: Doctor | null;
  selectedSummary: PatientSummary | null;
};

const appointmentFilterLabels: Record<string, string> = {
  all: "Agenda completa",
  confirmed: "Solo confirmadas",
  needs_attention: "Requieren atencion",
  pending_confirmation: "Pendientes por confirmar",
  ws: "Origen WhatsApp",
};

export function ConsoleContextBar({
  appointmentFilter,
  currentUserDisplay,
  globalSearch,
  onClearAgendaFilter,
  onClearPatientFocus,
  onClearSearch,
  selectedDoctor,
  selectedSummary,
}: ConsoleContextBarProps) {
  const patientName = selectedSummary
    ? [selectedSummary.patient.first_name, selectedSummary.patient.last_name].filter(Boolean).join(" ")
    : "";
  const hasAgendaFilter = appointmentFilter && appointmentFilter !== "all";
  const hasSearch = globalSearch.trim().length > 0;

  return (
    <section className="console-context-bar">
      <div className="console-context-summary">
        <p className="eyebrow">Contexto operativo</p>
        <h3>{selectedSummary ? "Vista enfocada en paciente" : "Vista operativa general"}</h3>
        <span>
          {selectedSummary
            ? `${patientName} · expediente ${selectedSummary.patient.medical_record_number}`
            : `Operando como ${currentUserDisplay}`}
        </span>
      </div>

      <div className="console-context-chips">
        {selectedDoctor ? (
          <span className="context-chip context-chip-strong">
            Doctor: {selectedDoctor.first_name} {selectedDoctor.last_name}
          </span>
        ) : (
          <span className="context-chip context-chip-muted">Sin filtro de doctor</span>
        )}

        {hasAgendaFilter ? (
          <button type="button" className="context-action-button" onClick={onClearAgendaFilter}>
            {appointmentFilterLabels[appointmentFilter] ?? "Filtro de agenda"} · limpiar
          </button>
        ) : (
          <span className="context-chip context-chip-muted">Agenda completa</span>
        )}

        {hasSearch ? (
          <button type="button" className="context-action-button" onClick={onClearSearch}>
            Busqueda: "{globalSearch.trim()}" · limpiar
          </button>
        ) : (
          <span className="context-chip context-chip-muted">Sin busqueda global</span>
        )}

        {selectedSummary ? (
          <button type="button" className="context-action-button" onClick={onClearPatientFocus}>
            Paciente: {patientName} · cerrar foco
          </button>
        ) : (
          <span className="context-chip context-chip-muted">Sin paciente enfocado</span>
        )}
      </div>
    </section>
  );
}
