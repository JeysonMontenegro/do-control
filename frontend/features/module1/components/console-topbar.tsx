"use client";

import type { Doctor } from "@/features/module1/types";

type ConsoleTopbarProps = {
  activeTabLabel: string;
  currentUserDisplay: string;
  doctorFilter: string;
  isReceptionist: boolean;
  onDoctorFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
  selectedDoctor: Doctor | null;
  visibleDoctors: Doctor[];
};

export function ConsoleTopbar({
  activeTabLabel,
  currentUserDisplay,
  doctorFilter,
  isReceptionist,
  onDoctorFilterChange,
  onSearchChange,
  searchValue,
  selectedDoctor,
  visibleDoctors,
}: ConsoleTopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-copy">
        <p className="eyebrow">Vista actual</p>
        <h2>{activeTabLabel}</h2>
        <span>{currentUserDisplay}</span>
      </div>

      <div className="topbar-actions">
        {selectedDoctor ? (
          <div className="context-pill context-pill-strong">
            Contexto: {selectedDoctor.first_name} {selectedDoctor.last_name}
          </div>
        ) : null}
        {isReceptionist && visibleDoctors.length > 1 ? (
          <select value={doctorFilter} onChange={(event) => onDoctorFilterChange(event.target.value)}>
            {visibleDoctors.map((doctor) => (
              <option key={`topbar-doctor-${doctor.id}`} value={doctor.id}>
                Gestionando pacientes de Dr. {doctor.first_name} {doctor.last_name}
              </option>
            ))}
          </select>
        ) : null}
        <label className="topbar-search-shell">
          <span className="topbar-search-label">Busqueda global</span>
          <input
            className="search-input topbar-search"
            placeholder="Paciente, expediente, telefono o motivo"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>
    </header>
  );
}
