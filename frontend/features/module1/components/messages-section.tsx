"use client";

import { ActiveFiltersBar } from "@/features/module1/components/active-filters-bar";
import { EmptyStatePanel } from "@/features/module1/components/empty-state-panel";
import type { ConsoleTab } from "@/features/module1/console-config";
import {
  appointmentTypeLabel,
  communicationKindLabel,
  confirmationLabel,
  dispatchStatusLabel,
  formatDateTime,
} from "@/features/module1/console-utils";
import type {
  Appointment,
  CommunicationDispatch,
  CommunicationDispatchAttempt,
  CommunicationDispatchSummary,
  Patient,
  PatientSummary,
} from "@/features/module1/types";

type MessagesSubtab = "paciente" | "citas" | "operacion";

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
  const activeDispatchFilters = [
    dispatchFilters.status_filter ? { label: "Estado", value: dispatchStatusLabel(dispatchFilters.status_filter) } : null,
    dispatchFilters.channel ? { label: "Canal", value: dispatchFilters.channel } : null,
    dispatchFilters.query.trim() ? { label: "Busqueda", value: dispatchFilters.query.trim() } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

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
        <>
          <article className="card section-card">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Paciente</p>
                <h2>Filtro de comunicaciones</h2>
              </div>
            </div>
            <label>
              <span>Paciente seleccionado</span>
              <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
                <option value="">Seleccionar paciente</option>
                {data.patients.map((patient) => (
                  <option key={`message-patient-${patient.id}`} value={patient.id}>
                    {patient.first_name} {patient.last_name} · {patient.medical_record_number}
                  </option>
                ))}
              </select>
            </label>
            <p className="empty-state">
              Esta vista muestra el histórico del paciente seleccionado.
            </p>
          </article>
          <article className="card section-card span-two">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Mensajes</p>
                <h2>Timeline del paciente</h2>
              </div>
            </div>
            {selectedSummary ? (
              <>
                <div className="detail-panel compact-panel">
                  <strong>
                    {selectedSummary.patient.first_name} {selectedSummary.patient.last_name}
                  </strong>
                  <span>{selectedSummary.patient.medical_record_number}</span>
                  <span>{selectedSummary.patient.primary_phone}</span>
                </div>
                <div className="table-list">
                  {selectedPatientDispatches.length ? (
                    selectedPatientDispatches.map((dispatch) => (
                      <div className="timeline-item" key={`patient-dispatch-${dispatch.id}`}>
                        <div className="row-actions">
                          <strong>{communicationKindLabel(dispatch)}</strong>
                          <span className={`badge ${
                            dispatch.status === "failed"
                              ? "badge-danger"
                              : dispatch.status === "delivered"
                                ? "badge-success"
                                : dispatch.status === "pending"
                                  ? "badge-warn"
                                  : "badge-neutral"
                          }`}>
                            {dispatchStatusLabel(dispatch.status)}
                          </span>
                        </div>
                        <span>
                          {dispatch.template_title ?? "Mensaje clínico"}
                          {dispatch.doctor_name ? ` · ${dispatch.doctor_name}` : ""}
                        </span>
                        <span>
                          {dispatch.appointment_scheduled_start
                            ? `Cita: ${formatDateTime(dispatch.appointment_scheduled_start)}`
                            : formatDateTime(dispatch.created_at)}
                        </span>
                        <div className="message-preview">{dispatch.rendered_message ?? "Sin texto generado."}</div>
                        {dispatch.error_message ? <span>Error: {dispatch.error_message}</span> : null}
                      </div>
                    ))
                  ) : (
                    <EmptyStatePanel
                      body="Cuando este paciente tenga recordatorios, confirmaciones o seguimientos enviados, apareceran aqui."
                      eyebrow="Timeline"
                      title="Este paciente todavia no tiene comunicaciones"
                    />
                  )}
                </div>
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
        </>
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
            <div className="table-list">
              {selectedSummary.appointments.length ? (
                selectedSummary.appointments.map((appointment) => {
                  const relatedDispatches = selectedPatientDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
                  return (
                    <button
                      type="button"
                      className="simple-list-item"
                      key={`message-appointment-${appointment.id}`}
                      onClick={() => {
                        setActiveTab("agenda");
                        toggleAppointmentHistory(appointment.id);
                      }}
                    >
                      <strong>{formatDateTime(appointment.scheduled_start)}</strong>
                      <span>{appointmentTypeLabel(appointment.appointment_type)}</span>
                      <span>{confirmationLabel(appointment.confirmation_status)}</span>
                      <span>{relatedDispatches.length ? `${relatedDispatches.length} mensajes ligados` : "Sin mensajes ligados"}</span>
                    </button>
                  );
                })
              ) : (
                <EmptyStatePanel
                  body="Todavia no hay citas ligadas a este paciente, por lo que no hay mensajes que relacionar contra agenda."
                  eyebrow="Citas"
                  title="Este paciente no tiene citas registradas"
                />
              )}
            </div>
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
          <div className="table-list">
            {communicationDispatches.length ? (
              communicationDispatches.map((dispatch) => (
                <div className="simple-list-item" key={`dispatch-${dispatch.id}`}>
                  <strong>{dispatch.patient_name ?? `Paciente ${dispatch.patient_id}`} · {communicationKindLabel(dispatch)}</strong>
                  <span>{dispatch.doctor_name ?? "Sin doctor"} · {formatDateTime(dispatch.created_at)}</span>
                  <span>{dispatchStatusLabel(dispatch.status)} · {dispatch.recipient_phone}</span>
                  <span>{dispatch.error_message ?? dispatch.rendered_message ?? "Sin observación."}</span>
                <div className="row-actions">
                  {dispatch.patient_id ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setSelectedPatientId(String(dispatch.patient_id));
                        setActiveTab("pacientes");
                      }}
                    >
                      Ver paciente
                    </button>
                  ) : null}
                  {dispatch.appointment_id ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setActiveTab("agenda");
                        toggleAppointmentHistory(dispatch.appointment_id as number);
                      }}
                    >
                      Ver cita
                    </button>
                  ) : null}
                  <button type="button" className="secondary-button" onClick={() => toggleDispatchAttempts(dispatch.id)}>
                    {expandedDispatchId === dispatch.id ? "Ocultar intentos" : "Ver intentos"}
                  </button>
                    {isAdmin && dispatch.status !== "delivered" ? (
                      <button type="button" className="success-button" onClick={() => updateDispatchStatus(dispatch.id, "delivered")}>
                        Marcar entregado
                      </button>
                    ) : null}
                    {isAdmin && dispatch.status !== "failed" ? (
                      <button type="button" className="danger-button" onClick={() => updateDispatchStatus(dispatch.id, "failed")}>
                        Marcar fallido
                      </button>
                    ) : null}
                    {isAdmin && dispatch.status === "failed" ? (
                      <button type="button" className="success-button" onClick={() => requeueDispatch(dispatch.id)}>
                        Reenviar
                      </button>
                    ) : null}
                  </div>
                  {expandedDispatchId === dispatch.id ? (
                    <div className="attempt-list">
                      {dispatchAttempts[dispatch.id]?.length ? (
                        dispatchAttempts[dispatch.id].map((attempt) => (
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
                  ) : null}
                </div>
              ))
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
          </div>
        </article>
      ) : null}
    </section>
  );
}
