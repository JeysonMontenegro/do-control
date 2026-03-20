"use client";

import type { Receptionist } from "@/features/module1/types";

type GestionReceptionSectionProps = {
  activeReceptionists: Receptionist[];
  activeReceptionistsPager: React.ReactNode;
  inactiveReceptionists: Receptionist[];
  inactiveReceptionistsPager: React.ReactNode;
  onAddReceptionist: () => void;
  onEditReceptionist: (receptionist: Receptionist) => void;
  onSelectReceptionist: (receptionistId: number) => void;
  paginatedActiveReceptionists: Receptionist[];
  paginatedInactiveReceptionists: Receptionist[];
  selectedReceptionist: Receptionist | null;
  toggleReceptionistActive: (receptionist: Receptionist) => void;
};

export function GestionReceptionSection({
  activeReceptionists,
  activeReceptionistsPager,
  inactiveReceptionists,
  inactiveReceptionistsPager,
  onAddReceptionist,
  onEditReceptionist,
  onSelectReceptionist,
  paginatedActiveReceptionists,
  paginatedInactiveReceptionists,
  selectedReceptionist,
  toggleReceptionistActive,
}: GestionReceptionSectionProps) {
  return (
    <>
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Equipo clínico</p>
            <h2>Recepción</h2>
          </div>
          <button type="button" className="success-button" onClick={onAddReceptionist}>
            Agregar recepcionista
          </button>
        </div>
        <p className="empty-state">
          Cada recepcionista indica claramente qué doctores atiende. Usa editar para cambiar asignaciones o datos de acceso.
        </p>
      </article>

      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Equipo clínico</p>
            <h2>Recepcionistas</h2>
          </div>
        </div>
        <div className="table-list">
          {paginatedActiveReceptionists.map((receptionist) => (
            <button
              type="button"
              className={`simple-list-item ${selectedReceptionist?.id === receptionist.id ? "table-row-active" : ""}`}
              key={`receptionist-team-${receptionist.id}`}
              onClick={() => onSelectReceptionist(receptionist.id)}
            >
              <strong>Recepción: {receptionist.first_name} {receptionist.last_name}</strong>
              <span>{receptionist.phone_number ?? "Sin teléfono"}</span>
              <span>{receptionist.email}</span>
              <span>{receptionist.assigned_doctors.length} doctor(es) asignado(s)</span>
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={() => onEditReceptionist(receptionist)}>
                  Editar
                </button>
                <button
                  type="button"
                  className={receptionist.is_active ? "danger-button" : "success-button"}
                  onClick={() => toggleReceptionistActive(receptionist)}
                >
                  {receptionist.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </button>
          ))}
          {!activeReceptionists.length ? <p className="empty-state">No hay recepcionistas activas registradas.</p> : null}
        </div>
        {activeReceptionistsPager}
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Detalle</p>
            <h2>{selectedReceptionist ? `Recepción ${selectedReceptionist.first_name} ${selectedReceptionist.last_name}` : "Selecciona una recepcionista"}</h2>
          </div>
        </div>
        {selectedReceptionist ? (
          <div className="detail-stack">
            <div className="detail-panel compact-panel">
              <strong>Datos principales</strong>
              <span>Correo: {selectedReceptionist.email}</span>
              <span>Teléfono: {selectedReceptionist.phone_number ?? "Sin teléfono"}</span>
              <span>Estado: {selectedReceptionist.is_active ? "Activa" : "Inactiva"}</span>
            </div>
            <div className="detail-panel compact-panel">
              <strong>Doctores asignados</strong>
              {selectedReceptionist.assigned_doctors.length ? (
                selectedReceptionist.assigned_doctors.map((doctor) => (
                  <div className="timeline-item" key={`selected-receptionist-doctor-${doctor.id}`}>
                    <strong>Dr. {doctor.first_name} {doctor.last_name}</strong>
                    <span>{doctor.specialty ?? "Sin especialidad"}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">Esta recepcionista no tiene doctores asignados.</p>
              )}
            </div>
            <div className="row-actions">
              <button type="button" className="secondary-button" onClick={() => onEditReceptionist(selectedReceptionist)}>
                Editar recepcionista
              </button>
              <button
                type="button"
                className={selectedReceptionist.is_active ? "danger-button" : "success-button"}
                onClick={() => toggleReceptionistActive(selectedReceptionist)}
              >
                {selectedReceptionist.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ) : (
          <p className="empty-state">Selecciona una recepcionista del listado para ver sus doctores asignados.</p>
        )}
        {inactiveReceptionists.length ? (
          <>
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Histórico</p>
                <h2>Recepcionistas inactivas</h2>
              </div>
            </div>
            <div className="table-list">
              {paginatedInactiveReceptionists.map((receptionist) => (
                <button
                  type="button"
                  className="simple-list-item"
                  key={`receptionist-team-inactive-${receptionist.id}`}
                  onClick={() => onSelectReceptionist(receptionist.id)}
                >
                  <strong>Recepción: {receptionist.first_name} {receptionist.last_name}</strong>
                  <span>{receptionist.email}</span>
                  <span>{receptionist.assigned_doctors.length} doctor(es) asignado(s)</span>
                </button>
              ))}
            </div>
            {inactiveReceptionistsPager}
          </>
        ) : null}
      </article>
    </>
  );
}
