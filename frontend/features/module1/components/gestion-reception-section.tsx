"use client";

import { useMemo } from "react";

import type { ICellRendererParams } from "ag-grid-community";

import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import { formatPhoneForDisplay } from "@/features/module1/phone-utils";
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
  const receptionistColumns = useMemo<ClinicalGridColumn<Receptionist>[]>(
    () => [
      {
        headerName: "Recepcionista",
        minWidth: 220,
        valueGetter: ({ data }) => (data ? `${data.first_name} ${data.last_name}` : ""),
        exportValue: (row) => `${row.first_name} ${row.last_name}`,
      },
      {
        headerName: "Teléfono",
        minWidth: 170,
        valueGetter: ({ data }) => formatPhoneForDisplay(data?.phone_number),
        exportValue: (row) => formatPhoneForDisplay(row.phone_number),
      },
      {
        headerName: "Correo",
        field: "email",
        minWidth: 240,
        exportValue: (row) => row.email,
      },
      {
        headerName: "Doctores asignados",
        minWidth: 170,
        valueGetter: ({ data }) => data?.assigned_doctors.length ?? 0,
        exportValue: (row) => row.assigned_doctors.length,
      },
      {
        headerName: "Estado",
        minWidth: 120,
        valueGetter: ({ data }) => (data?.is_active ? "Activa" : "Inactiva"),
        exportValue: (row) => (row.is_active ? "Activa" : "Inactiva"),
      },
      {
        headerName: "Acciones",
        minWidth: 220,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<Receptionist>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button type="button" className="secondary-button" onClick={() => onSelectReceptionist(data.id)}>
                Ver detalle
              </button>
              <button type="button" className="secondary-button" onClick={() => onEditReceptionist(data)}>
                Editar
              </button>
              <button
                type="button"
                className={data.is_active ? "danger-button" : "success-button"}
                onClick={() => toggleReceptionistActive(data)}
              >
                {data.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [onEditReceptionist, onSelectReceptionist, toggleReceptionistActive],
  );

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
        <ClinicalDataGrid<Receptionist>
          columns={receptionistColumns}
          emptyMessage="No hay recepcionistas activas registradas."
          exportFileName="recepcionistas-activas"
          quickFilter=""
          rowData={paginatedActiveReceptionists}
        />
      </article>

      {selectedReceptionist ? (
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Detalle</p>
            <h2>{`Recepción ${selectedReceptionist.first_name} ${selectedReceptionist.last_name}`}</h2>
          </div>
        </div>
          <div className="detail-stack">
            <div className="detail-panel compact-panel">
              <strong>Datos principales</strong>
              <span>Correo: {selectedReceptionist.email}</span>
              <span>Teléfono: {formatPhoneForDisplay(selectedReceptionist.phone_number)}</span>
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
      ) : null}
    </>
  );
}
