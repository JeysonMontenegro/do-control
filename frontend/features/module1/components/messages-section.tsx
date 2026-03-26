"use client";

import { useMemo } from "react";

import type { ICellRendererParams } from "ag-grid-community";

import { ActiveFiltersBar } from "@/features/module1/components/active-filters-bar";
import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import { EmptyStatePanel } from "@/features/module1/components/empty-state-panel";
import { SearchableSelect } from "@/features/module1/components/form-fields";
import type { ConsoleTab } from "@/features/module1/console-config";
import {
  appointmentTypeLabel,
  communicationKindLabel,
  confirmationLabel,
  dispatchStatusLabel,
  formatDateTime,
} from "@/features/module1/console-utils";
import { formatPhoneForDisplay } from "@/features/module1/phone-utils";
import type {
  Appointment,
  CommunicationDispatch,
  CommunicationDispatchAttempt,
  CommunicationDispatchSummary,
  Patient,
  PatientSummary,
} from "@/features/module1/types";

type MessagesSubtab = "paciente" | "citas" | "operacion";

type AppointmentEventRow = Appointment & {
  relatedDispatchCount: number;
};

type MessagesSectionProps = {
  canViewGlobalCommunications: boolean;
  communicationDispatchSummary: CommunicationDispatchSummary | null;
  communicationDispatches: CommunicationDispatch[];
  data: {
    patients: Patient[];
  };
  dispatchAttempts: Record<number, CommunicationDispatchAttempt[]>;
  dispatchFilters: {
    status_filter: string;
    channel: string;
    query: string;
  };
  expandedDispatchId: number | null;
  generateDispatchesNow: () => void;
  isAdmin: boolean;
  messagesSubtab: MessagesSubtab;
  previewActionsDisabled?: boolean;
  requeueDispatch: (dispatchId: number) => void;
  requeueVisibleFailedDispatches: () => void;
  selectedPatientDispatches: CommunicationDispatch[];
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  setActiveTab: React.Dispatch<React.SetStateAction<ConsoleTab>>;
  setDispatchFilters: React.Dispatch<
    React.SetStateAction<{
      status_filter: string;
      channel: string;
      query: string;
    }>
  >;
  setMessagesSubtab: (tab: MessagesSubtab) => void;
  setSelectedPatientId: (value: string) => void;
  toggleAppointmentHistory: (appointmentId: number) => void;
  toggleDispatchAttempts: (dispatchId: number) => void;
  updateDispatchStatus: (dispatchId: number, status: "sent" | "delivered" | "failed") => void;
};

export function MessagesSection({
  canViewGlobalCommunications,
  communicationDispatchSummary,
  communicationDispatches,
  data,
  dispatchAttempts,
  dispatchFilters,
  expandedDispatchId,
  generateDispatchesNow,
  isAdmin,
  messagesSubtab,
  requeueDispatch,
  requeueVisibleFailedDispatches,
  selectedPatientDispatches,
  selectedPatientId,
  selectedSummary,
  setActiveTab,
  setDispatchFilters,
  setMessagesSubtab,
  setSelectedPatientId,
  toggleAppointmentHistory,
  toggleDispatchAttempts,
  updateDispatchStatus,
}: MessagesSectionProps) {
  const patientOptions = data.patients.map((patient) => ({
    value: String(patient.id),
    label: `${patient.first_name} ${patient.last_name}`,
    description: patient.medical_record_number,
    keywords: [patient.primary_phone ?? "", patient.national_id ?? ""],
  }));
  const activeDispatchFilters = [
    dispatchFilters.status_filter ? { label: "Estado", value: dispatchStatusLabel(dispatchFilters.status_filter) } : null,
    dispatchFilters.channel ? { label: "Canal", value: dispatchFilters.channel } : null,
    dispatchFilters.query.trim() ? { label: "Busqueda", value: dispatchFilters.query.trim() } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const patientDispatchColumns = useMemo<ClinicalGridColumn<CommunicationDispatch>[]>(
    () => [
      {
        headerName: "Tipo",
        minWidth: 170,
        valueGetter: ({ data }) => (data ? communicationKindLabel(data) : ""),
        exportValue: (row) => communicationKindLabel(row),
      },
      {
        headerName: "Estado",
        minWidth: 130,
        valueGetter: ({ data }) => (data ? dispatchStatusLabel(data.status) : ""),
        exportValue: (row) => dispatchStatusLabel(row.status),
      },
      {
        headerName: "Doctor / template",
        minWidth: 240,
        valueGetter: ({ data }) => (data ? `${data.template_title ?? "Mensaje clínico"}${data.doctor_name ? ` · ${data.doctor_name}` : ""}` : ""),
        exportValue: (row) => `${row.template_title ?? "Mensaje clínico"}${row.doctor_name ? ` · ${row.doctor_name}` : ""}`,
      },
      {
        headerName: "Fecha",
        minWidth: 180,
        valueGetter: ({ data }) =>
          data ? (data.appointment_scheduled_start ? formatDateTime(data.appointment_scheduled_start) : formatDateTime(data.created_at)) : "",
        exportValue: (row) => (row.appointment_scheduled_start ? formatDateTime(row.appointment_scheduled_start) : formatDateTime(row.created_at)),
      },
      {
        headerName: "Contenido",
        minWidth: 340,
        flex: 1.6,
        valueGetter: ({ data }) => data?.rendered_message ?? data?.error_message ?? "Sin texto generado.",
        exportValue: (row) => row.rendered_message ?? row.error_message ?? "Sin texto generado.",
      },
      {
        headerName: "Acciones",
        minWidth: 220,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<CommunicationDispatch>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button type="button" className="secondary-button" onClick={() => setActiveTab("pacientes")}>
                Ver expediente
              </button>
              {data.appointment_id ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setActiveTab("agenda");
                    toggleAppointmentHistory(data.appointment_id as number);
                  }}
                >
                  Ver cita
                </button>
              ) : null}
            </div>
          ) : null;
        },
      },
    ],
    [setActiveTab, toggleAppointmentHistory],
  );
  const appointmentEventRows = useMemo<AppointmentEventRow[]>(
    () =>
      (selectedSummary?.appointments ?? []).map((appointment) => ({
        ...appointment,
        relatedDispatchCount: selectedPatientDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id).length,
      })),
    [selectedPatientDispatches, selectedSummary?.appointments],
  );
  const appointmentEventColumns = useMemo<ClinicalGridColumn<AppointmentEventRow>[]>(
    () => [
      {
        headerName: "Fecha",
        minWidth: 180,
        valueGetter: ({ data }) => (data ? formatDateTime(data.scheduled_start) : ""),
        exportValue: (row) => formatDateTime(row.scheduled_start),
      },
      {
        headerName: "Tipo",
        minWidth: 160,
        valueGetter: ({ data }) => (data ? appointmentTypeLabel(data.appointment_type) : ""),
        exportValue: (row) => appointmentTypeLabel(row.appointment_type),
      },
      {
        headerName: "Confirmación",
        minWidth: 150,
        valueGetter: ({ data }) => (data ? confirmationLabel(data.confirmation_status) : ""),
        exportValue: (row) => confirmationLabel(row.confirmation_status),
      },
      {
        headerName: "Mensajes ligados",
        minWidth: 160,
        valueGetter: ({ data }) => data?.relatedDispatchCount ?? 0,
        exportValue: (row) => row.relatedDispatchCount,
      },
      {
        headerName: "Acción",
        minWidth: 140,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<AppointmentEventRow>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setActiveTab("agenda");
                  toggleAppointmentHistory(data.id);
                }}
              >
                Ver cita
              </button>
            </div>
          ) : null;
        },
      },
    ],
    [setActiveTab, toggleAppointmentHistory],
  );
  const operationalDispatchColumns = useMemo<ClinicalGridColumn<CommunicationDispatch>[]>(
    () => [
      {
        headerName: "Paciente / tipo",
        minWidth: 260,
        valueGetter: ({ data }) => (data ? `${data.patient_name ?? `Paciente ${data.patient_id}`} · ${communicationKindLabel(data)}` : ""),
        exportValue: (row) => `${row.patient_name ?? `Paciente ${row.patient_id}`} · ${communicationKindLabel(row)}`,
      },
      {
        headerName: "Doctor / fecha",
        minWidth: 260,
        valueGetter: ({ data }) => (data ? `${data.doctor_name ?? "Sin doctor"} · ${formatDateTime(data.created_at)}` : ""),
        exportValue: (row) => `${row.doctor_name ?? "Sin doctor"} · ${formatDateTime(row.created_at)}`,
      },
      {
        headerName: "Estado / destino",
        minWidth: 220,
        valueGetter: ({ data }) => (data ? `${dispatchStatusLabel(data.status)} · ${formatPhoneForDisplay(data.recipient_phone)}` : ""),
        exportValue: (row) => `${dispatchStatusLabel(row.status)} · ${formatPhoneForDisplay(row.recipient_phone)}`,
      },
      {
        headerName: "Observación",
        minWidth: 340,
        flex: 1.6,
        valueGetter: ({ data }) => data?.error_message ?? data?.rendered_message ?? "Sin observación.",
        exportValue: (row) => row.error_message ?? row.rendered_message ?? "Sin observación.",
      },
      {
        headerName: "Acciones",
        minWidth: 360,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<CommunicationDispatch>) => {
          const data = params.data;
          return data ? (
            <div className="ag-actions-cell">
              {data.patient_id ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSelectedPatientId(String(data.patient_id));
                    setActiveTab("pacientes");
                  }}
                >
                  Ver paciente
                </button>
              ) : null}
              {data.appointment_id ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setActiveTab("agenda");
                    toggleAppointmentHistory(data.appointment_id as number);
                  }}
                >
                  Ver cita
                </button>
              ) : null}
              <button type="button" className="secondary-button" onClick={() => toggleDispatchAttempts(data.id)}>
                {expandedDispatchId === data.id ? "Ocultar intentos" : "Ver intentos"}
              </button>
              {isAdmin && data.status !== "delivered" ? (
                <button type="button" className="success-button" onClick={() => updateDispatchStatus(data.id, "delivered")}>
                  Marcar entregado
                </button>
              ) : null}
              {isAdmin && data.status !== "failed" ? (
                <button type="button" className="danger-button" onClick={() => updateDispatchStatus(data.id, "failed")}>
                  Marcar fallido
                </button>
              ) : null}
              {isAdmin && data.status === "failed" ? (
                <button type="button" className="success-button" onClick={() => requeueDispatch(data.id)}>
                  Reenviar
                </button>
              ) : null}
            </div>
          ) : null;
        },
      },
    ],
    [expandedDispatchId, isAdmin, requeueDispatch, setActiveTab, setSelectedPatientId, toggleAppointmentHistory, toggleDispatchAttempts, updateDispatchStatus],
  );

  return (
    <section className="tab-layout">
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Mensajes</p>
            <h2>Centro de comunicaciones</h2>
          </div>
        </div>
        <div className="chip-row">
          <button
            type="button"
            className={`filter-chip ${messagesSubtab === "paciente" ? "filter-chip-active" : ""}`}
            onClick={() => setMessagesSubtab("paciente")}
          >
            Paciente
          </button>
          <button
            type="button"
            className={`filter-chip ${messagesSubtab === "citas" ? "filter-chip-active" : ""}`}
            onClick={() => setMessagesSubtab("citas")}
          >
            Citas
          </button>
          {canViewGlobalCommunications ? (
            <button
              type="button"
              className={`filter-chip ${messagesSubtab === "operacion" ? "filter-chip-active" : ""}`}
              onClick={() => setMessagesSubtab("operacion")}
            >
              Operación
            </button>
          ) : null}
        </div>
        <p className="empty-state">
          Organiza las comunicaciones por paciente, por citas relacionadas o como seguimiento operativo global.
        </p>
      </article>

      {messagesSubtab === "paciente" ? (
        <article className="card section-card span-three">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Mensajes</p>
              <h2>Timeline del paciente</h2>
            </div>
          </div>
          <div className="toolbar-row">
            <label className="toolbar-search-shell">
              <span>Paciente seleccionado</span>
              <SearchableSelect
                id="messages-patient-filter"
                name="messages_patient_filter"
                value={selectedPatientId}
                onChange={setSelectedPatientId}
                options={patientOptions}
                placeholder="Seleccionar paciente"
                clearLabel="Seleccionar paciente"
                searchPlaceholder="Buscar paciente"
              />
            </label>
          </div>
          {selectedSummary ? (
            <>
              <div className="detail-panel compact-panel">
                <strong>
                  {selectedSummary.patient.first_name} {selectedSummary.patient.last_name}
                </strong>
                <span>{selectedSummary.patient.medical_record_number}</span>
                <span>{formatPhoneForDisplay(selectedSummary.patient.primary_phone)}</span>
              </div>
              {selectedPatientDispatches.length ? (
                <ClinicalDataGrid<CommunicationDispatch>
                  columns={patientDispatchColumns}
                  emptyMessage="Este paciente todavía no tiene comunicaciones."
                  exportFileName="timeline-paciente"
                  quickFilter=""
                  rowData={selectedPatientDispatches}
                />
              ) : (
                <EmptyStatePanel
                  body="Cuando este paciente tenga recordatorios, confirmaciones o seguimientos enviados, apareceran aqui."
                  eyebrow="Timeline"
                  title="Este paciente todavia no tiene comunicaciones"
                />
              )}
            </>
          ) : (
            <EmptyStatePanel
              actionLabel="Ir a Pacientes"
              body="Necesitas enfocar un paciente para revisar su timeline y sus mensajes relacionados."
              eyebrow="Paciente"
              onAction={() => setActiveTab("pacientes")}
              title="Selecciona un paciente para ver su timeline"
            />
          )}
        </article>
      ) : null}

      {messagesSubtab === "citas" ? (
        <article className="card section-card span-three">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Citas</p>
              <h2>Eventos de cita</h2>
            </div>
          </div>
          {selectedSummary ? (
            appointmentEventRows.length ? (
              <ClinicalDataGrid<AppointmentEventRow>
                columns={appointmentEventColumns}
                emptyMessage="Este paciente no tiene citas registradas."
                exportFileName="eventos-de-cita"
                quickFilter=""
                rowData={appointmentEventRows}
              />
            ) : (
                <EmptyStatePanel
                  body="Todavia no hay citas ligadas a este paciente, por lo que no hay mensajes que relacionar contra agenda."
                  eyebrow="Citas"
                  title="Este paciente no tiene citas registradas"
                />
              )
          ) : (
            <EmptyStatePanel
              actionLabel="Ir a Pacientes"
              body="Primero enfoca un paciente para poder cruzar sus mensajes con citas y confirmaciones."
              eyebrow="Relacion"
              onAction={() => setActiveTab("pacientes")}
              title="Selecciona un paciente para relacionar mensajes con citas"
            />
          )}
        </article>
      ) : null}

      {messagesSubtab === "operacion" && canViewGlobalCommunications ? (
        <article className="card section-card span-three">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Seguimiento operativo</p>
              <h2>Comunicaciones recientes</h2>
            </div>
            {isAdmin ? (
              <div className="row-actions">
                <button type="button" className="success-button" onClick={generateDispatchesNow}>
                  Generar ahora
                </button>
                <button type="button" className="success-button" onClick={requeueVisibleFailedDispatches}>
                  Reenviar fallidos
                </button>
              </div>
            ) : null}
          </div>
          {communicationDispatchSummary ? (
            <div className="summary-grid">
              <div className="metric-card"><strong>{communicationDispatchSummary.total}</strong><span>Total</span></div>
              <div className="metric-card"><strong>{communicationDispatchSummary.pending}</strong><span>Pendientes</span></div>
              <div className="metric-card"><strong>{communicationDispatchSummary.failed}</strong><span>Fallidos</span></div>
            </div>
          ) : null}
          <div className="toolbar-row">
            <div className="toolbar-inline">
              <select
                value={dispatchFilters.status_filter}
                onChange={(event) => setDispatchFilters((current) => ({ ...current, status_filter: event.target.value }))}
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="sent">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="failed">Fallido</option>
              </select>
              <select
                value={dispatchFilters.channel}
                onChange={(event) => setDispatchFilters((current) => ({ ...current, channel: event.target.value }))}
              >
                <option value="">Todos los canales</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Correo</option>
              </select>
            </div>
            <input
              className="search-input compact-input"
              value={dispatchFilters.query}
              onChange={(event) => setDispatchFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Buscar por teléfono, referencia o error"
            />
          </div>
          <ActiveFiltersBar
            clearLabel="Limpiar filtros operativos"
            items={activeDispatchFilters}
            onClearAll={
              activeDispatchFilters.length
                ? () => setDispatchFilters({ status_filter: "", channel: "", query: "" })
                : undefined
            }
            resultsLabel="comunicaciones visibles"
            resultsValue={communicationDispatches.length}
          />
          {communicationDispatches.length ? (
            <>
              <ClinicalDataGrid<CommunicationDispatch>
                columns={operationalDispatchColumns}
                emptyMessage="No hay comunicaciones para esta vista."
                exportFileName="comunicaciones-recientes"
                quickFilter={dispatchFilters.query}
                rowData={communicationDispatches}
              />
              {expandedDispatchId !== null ? (
                <div className="detail-panel">
                  <strong>Intentos del dispatch {expandedDispatchId}</strong>
                  <div className="attempt-list">
                    {dispatchAttempts[expandedDispatchId]?.length ? (
                      dispatchAttempts[expandedDispatchId].map((attempt) => (
                        <div className="timeline-item" key={`dispatch-attempt-${attempt.id}`}>
                          <strong>{dispatchStatusLabel(attempt.result_status)}</strong>
                          <span>{formatDateTime(attempt.attempted_at)}</span>
                          <span>{attempt.error_message ?? "Sin error"}</span>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">Sin intentos registrados.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyStatePanel
              actionLabel={isAdmin ? "Generar ahora" : undefined}
              body="No hay comunicaciones que coincidan con los filtros actuales. Ajusta los filtros o genera nuevos despachos."
              eyebrow="Operacion"
              onAction={isAdmin ? generateDispatchesNow : undefined}
              title="No hay comunicaciones para esta vista"
              tone="warning"
            />
          )}
        </article>
      ) : null}
    </section>
  );
}
