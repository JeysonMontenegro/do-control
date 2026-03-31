"use client";

import { useMemo, useState } from "react";

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
import { formatPhoneForDisplay, normalizePhoneWithDefaultCountry } from "@/features/module1/phone-utils";
import type {
  Appointment,
  CommunicationDispatch,
  CommunicationDispatchAttempt,
  CommunicationDispatchSummary,
  Doctor,
  MessagingConversation,
  MessagingConversationMessage,
  Patient,
  PatientSummary,
} from "@/features/module1/types";

type MessagesSubtab = "paciente" | "citas" | "operacion";

type AppointmentEventRow = Appointment & {
  relatedDispatchCount: number;
};

type MessagesSectionProps = {
  activeConversation: MessagingConversation | null;
  activeConversationPhone: string;
  availableDoctors: Doctor[];
  canChooseAmongMultipleDoctors: boolean;
  canViewGlobalCommunications: boolean;
  composer: string;
  communicationDispatchSummary: CommunicationDispatchSummary | null;
  communicationDispatches: CommunicationDispatch[];
  data: {
    appointments: Appointment[];
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
  inboxUnreadCount: number;
  isAdmin: boolean;
  isSendingMessage: boolean;
  loadingConversations: boolean;
  loadingMessages: boolean;
  messageConversations: MessagingConversation[];
  messageItems: MessagingConversationMessage[];
  messagesSubtab: MessagesSubtab;
  onComposerChange: (value: string) => void;
  onDoctorFilterChange: (value: string) => void;
  onRefreshInbox: () => void;
  onSendMessage: () => void;
  onSelectConversation: (phone: string) => void;
  previewActionsDisabled?: boolean;
  requeueDispatch: (dispatchId: number) => void;
  requeueVisibleFailedDispatches: () => void;
  selectedPatientDispatches: CommunicationDispatch[];
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  targetDoctorId: string;
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
  activeConversation,
  activeConversationPhone,
  availableDoctors,
  canChooseAmongMultipleDoctors,
  canViewGlobalCommunications,
  composer,
  communicationDispatchSummary,
  communicationDispatches,
  data,
  dispatchAttempts,
  dispatchFilters,
  expandedDispatchId,
  generateDispatchesNow,
  inboxUnreadCount,
  isAdmin,
  isSendingMessage,
  loadingConversations,
  loadingMessages,
  messageConversations,
  messageItems,
  messagesSubtab,
  onComposerChange,
  onDoctorFilterChange,
  onRefreshInbox,
  onSendMessage,
  onSelectConversation,
  requeueDispatch,
  requeueVisibleFailedDispatches,
  selectedPatientDispatches,
  selectedPatientId,
  selectedSummary,
  targetDoctorId,
  setActiveTab,
  setDispatchFilters,
  setMessagesSubtab,
  setSelectedPatientId,
  toggleAppointmentHistory,
  toggleDispatchAttempts,
  updateDispatchStatus,
}: MessagesSectionProps) {
  const [conversationSearch, setConversationSearch] = useState("");
  const [conversationFilter, setConversationFilter] = useState<"all" | "unread" | "window_open" | "unlinked">("all");
  const activeDispatchFilters = [
    dispatchFilters.status_filter ? { label: "Estado", value: dispatchStatusLabel(dispatchFilters.status_filter) } : null,
    dispatchFilters.channel ? { label: "Canal", value: dispatchFilters.channel } : null,
    dispatchFilters.query.trim() ? { label: "Busqueda", value: dispatchFilters.query.trim() } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const doctorOptions = availableDoctors.map((doctor) => ({
    value: String(doctor.id),
    label: `${doctor.doctor_title?.trim() || "Dr."} ${doctor.first_name} ${doctor.last_name}`,
    description: doctor.specialty ?? "Sin especialidad",
  }));
  const patientByPhone = useMemo(() => {
    const entries = data.patients.map((patient) => [normalizePhoneWithDefaultCountry(patient.primary_phone), patient] as const);
    return new Map(entries);
  }, [data.patients]);
  const selectedConversationPatient = activeConversation
    ? patientByPhone.get(normalizePhoneWithDefaultCountry(activeConversation.patient_phone)) ?? null
    : null;
  const conversationPatientIds = useMemo(() => {
    const map = new Map<string, number>();
    for (const conversation of messageConversations) {
      const patient = patientByPhone.get(normalizePhoneWithDefaultCountry(conversation.patient_phone));
      if (patient) {
        map.set(conversation.patient_phone, patient.id);
      }
    }
    return map;
  }, [messageConversations, patientByPhone]);
  const filteredMessageConversations = useMemo(() => {
    switch (conversationFilter) {
      case "unread":
        return messageConversations.filter((conversation) => conversation.unread_count > 0);
      case "window_open":
        return messageConversations.filter((conversation) => conversation.window_open);
      case "unlinked":
        return messageConversations.filter((conversation) => !conversationPatientIds.has(conversation.patient_phone));
      default:
        return messageConversations;
    }
  }, [conversationFilter, conversationPatientIds, messageConversations]);
  const inboxActiveFilters = [
    conversationFilter !== "all"
      ? {
          label: "Inbox",
          value:
            conversationFilter === "unread"
              ? "No leídos"
              : conversationFilter === "window_open"
                ? "Ventana abierta"
                : "Sin paciente ligado",
        }
      : null,
    conversationSearch.trim() ? { label: "Búsqueda", value: conversationSearch.trim() } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const selectedConversationAppointments = useMemo(() => {
    if (!selectedConversationPatient) {
      return [] as Appointment[];
    }
    return data.appointments
      .filter((appointment) => appointment.patient_id === selectedConversationPatient.id)
      .sort((left, right) => left.scheduled_start.localeCompare(right.scheduled_start));
  }, [data.appointments, selectedConversationPatient]);
  const upcomingConversationAppointment = useMemo(() => {
    const nowIso = new Date().toISOString();
    return (
      selectedConversationAppointments.find(
        (appointment) => appointment.status !== "cancelled" && appointment.scheduled_start >= nowIso,
      ) ?? selectedConversationAppointments[selectedConversationAppointments.length - 1] ?? null
    );
  }, [selectedConversationAppointments]);
  const conversationColumns = useMemo<ClinicalGridColumn<MessagingConversation>[]>(
    () => [
      {
        headerName: "Paciente",
        minWidth: 220,
        valueGetter: ({ data }) =>
          data
            ? `${data.patient_name ?? "Sin nombre"} · ${formatPhoneForDisplay(data.patient_phone)}`
            : "",
        exportValue: (row) => `${row.patient_name ?? "Sin nombre"} · ${formatPhoneForDisplay(row.patient_phone)}`,
      },
      {
        headerName: "Último mensaje",
        minWidth: 260,
        flex: 1.3,
        valueGetter: ({ data }) => data?.last_message ?? "Sin mensajes recientes",
        exportValue: (row) => row.last_message ?? "",
      },
      {
        headerName: "Estado",
        minWidth: 150,
        valueGetter: ({ data }) =>
          data ? `${data.window_open ? "Ventana abierta" : "Solo template"} · ${data.unread_count} no leídos` : "",
        exportValue: (row) => `${row.window_open ? "Ventana abierta" : "Solo template"} · ${row.unread_count} no leídos`,
      },
      {
        headerName: "Actividad",
        minWidth: 160,
        valueGetter: ({ data }) => (data ? formatDateTime(data.last_at) : ""),
        exportValue: (row) => formatDateTime(row.last_at),
      },
      {
        headerName: "Acciones",
        minWidth: 160,
        excludeFromExport: true,
        cellRenderer: (params: ICellRendererParams<MessagingConversation>) => {
          const data = params.data;
          if (!data) {
            return null;
          }
          return (
            <div className="ag-actions-cell">
              <button
                type="button"
                className={`secondary-button compact-action-button ${activeConversationPhone === data.patient_phone ? "is-selected" : ""}`}
                onClick={() => onSelectConversation(data.patient_phone)}
              >
                Abrir
              </button>
            </div>
          );
        },
      },
    ],
    [activeConversationPhone, onSelectConversation],
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
            Inbox
            {inboxUnreadCount > 0 ? <span className="filter-chip-badge">{inboxUnreadCount}</span> : null}
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
          Revisa el inbox de WhatsApp, los eventos ligados a citas y el seguimiento operativo global desde un solo punto.
        </p>
      </article>

      {messagesSubtab === "paciente" ? (
        <>
          <article className="card section-card">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Inbox</p>
                <h2>Conversaciones de WhatsApp</h2>
              </div>
              <div className="row-actions">
                <button type="button" className="secondary-button compact-action-button" onClick={onRefreshInbox}>
                  Actualizar
                </button>
              </div>
            </div>
            <div className="toolbar-row">
              <div className="chip-row">
                <button
                  type="button"
                  className={`filter-chip ${conversationFilter === "all" ? "filter-chip-active" : ""}`}
                  onClick={() => setConversationFilter("all")}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={`filter-chip ${conversationFilter === "unread" ? "filter-chip-active" : ""}`}
                  onClick={() => setConversationFilter("unread")}
                >
                  No leídos
                </button>
                <button
                  type="button"
                  className={`filter-chip ${conversationFilter === "window_open" ? "filter-chip-active" : ""}`}
                  onClick={() => setConversationFilter("window_open")}
                >
                  Ventana 24h
                </button>
                <button
                  type="button"
                  className={`filter-chip ${conversationFilter === "unlinked" ? "filter-chip-active" : ""}`}
                  onClick={() => setConversationFilter("unlinked")}
                >
                  Sin paciente ligado
                </button>
              </div>
              {canChooseAmongMultipleDoctors ? (
                <label className="toolbar-search-shell">
                  <span>Doctor</span>
                  <SearchableSelect
                    id="messages-doctor-filter"
                    name="messages_doctor_filter"
                    value={targetDoctorId}
                    onChange={onDoctorFilterChange}
                    options={doctorOptions}
                    placeholder="Seleccionar doctor"
                    clearLabel="Seleccionar doctor"
                    searchPlaceholder="Buscar doctor"
                  />
                </label>
              ) : null}
              <label className="toolbar-search-shell">
                <span>Buscar conversación</span>
                <input
                  className="search-input compact-input"
                  id="messages-conversation-search"
                  name="messages_conversation_search"
                  value={conversationSearch}
                  onChange={(event) => setConversationSearch(event.target.value)}
                  placeholder="Buscar por paciente o teléfono"
                />
              </label>
            </div>
            <ActiveFiltersBar
              clearLabel="Limpiar filtros del inbox"
              items={inboxActiveFilters}
              onClearAll={
                inboxActiveFilters.length
                  ? () => {
                      setConversationFilter("all");
                      setConversationSearch("");
                    }
                  : undefined
              }
              resultsLabel="conversaciones visibles"
              resultsValue={filteredMessageConversations.length}
            />
            {!targetDoctorId ? (
              <EmptyStatePanel
                body="Primero elige el doctor cuyo inbox quieres revisar."
                eyebrow="Inbox"
                title="Selecciona un doctor para cargar conversaciones"
              />
            ) : loadingConversations ? (
              <p className="empty-state">Cargando conversaciones...</p>
            ) : filteredMessageConversations.length ? (
              <ClinicalDataGrid<MessagingConversation>
                columns={conversationColumns}
                emptyMessage="No hay conversaciones para este doctor."
                exportFileName="inbox-whatsapp"
                quickFilter={conversationSearch}
                rowData={filteredMessageConversations}
              />
            ) : (
              <EmptyStatePanel
                body="Cuando este doctor tenga conversaciones activas en WhatsApp, aparecerán aquí."
                eyebrow="Inbox"
                title="Todavía no hay conversaciones visibles"
              />
            )}
          </article>

          <article className="card section-card span-two">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Chat</p>
                <h2>{activeConversation?.patient_name ?? "Conversación"}</h2>
              </div>
              {activeConversation ? (
                <div className="row-actions">
                  <span className={`status-badge ${activeConversation.window_open ? "status-badge-success" : "status-badge-warning"}`}>
                    {activeConversation.window_open ? "Ventana 24h abierta" : "Solo templates"}
                  </span>
                  {activeConversation.unread_count ? (
                    <span className="status-badge">{activeConversation.unread_count} no leídos</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {activeConversation ? (
              <>
                <div className="detail-panel compact-panel">
                  <strong>{activeConversation.patient_name ?? "Paciente sin nombre"}</strong>
                  <span>{formatPhoneForDisplay(activeConversation.patient_phone)}</span>
                  {selectedConversationPatient ? (
                    <span>{selectedConversationPatient.medical_record_number}</span>
                  ) : (
                    <span>Paciente aún no ligado en do-control</span>
                  )}
                  <div className="row-actions">
                    <button
                      type="button"
                      className="secondary-button compact-action-button"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          void navigator.clipboard.writeText(activeConversation.patient_phone);
                        }
                      }}
                    >
                      Copiar teléfono
                    </button>
                    <button
                      type="button"
                      className="secondary-button compact-action-button"
                      onClick={() => window.open(`https://wa.me/${normalizePhoneWithDefaultCountry(activeConversation.patient_phone)}`, "_blank", "noopener,noreferrer")}
                    >
                      Abrir WhatsApp
                    </button>
                    {selectedConversationPatient ? (
                      <button
                        type="button"
                        className="secondary-button compact-action-button"
                        onClick={() => {
                          setSelectedPatientId(String(selectedConversationPatient.id));
                          setActiveTab("pacientes");
                        }}
                      >
                        Ver expediente
                      </button>
                    ) : null}
                    {upcomingConversationAppointment ? (
                      <button
                        type="button"
                        className="secondary-button compact-action-button"
                        onClick={() => {
                          setActiveTab("agenda");
                          toggleAppointmentHistory(upcomingConversationAppointment.id);
                        }}
                      >
                        Ver cita
                      </button>
                    ) : null}
                  </div>
                </div>
                {upcomingConversationAppointment ? (
                  <div className="detail-panel compact-panel">
                    <strong>Contexto clínico inmediato</strong>
                    <span>
                      {appointmentTypeLabel(upcomingConversationAppointment.appointment_type)} · {confirmationLabel(upcomingConversationAppointment.confirmation_status)}
                    </span>
                    <span>{formatDateTime(upcomingConversationAppointment.scheduled_start)}</span>
                    <span>{upcomingConversationAppointment.reason?.trim() || "Sin motivo registrado"}</span>
                  </div>
                ) : null}
                <div className="conversation-thread">
                  {loadingMessages ? (
                    <p className="empty-state">Cargando conversación...</p>
                  ) : messageItems.length ? (
                    messageItems.map((message) => (
                      <article
                        key={`conversation-message-${message.id}`}
                        className={`conversation-bubble ${message.direction === "outbound" ? "conversation-bubble-outbound" : "conversation-bubble-inbound"}`}
                      >
                        <div className="conversation-bubble-meta">
                          <strong>{message.direction === "outbound" ? "Clínica" : "Paciente"}</strong>
                          <span>{formatDateTime(message.created_at)}</span>
                        </div>
                        <p>{message.text?.trim() || "Mensaje sin cuerpo visible."}</p>
                        <div className="conversation-bubble-tags">
                          <span className="status-badge">{message.type}</span>
                          <span className="status-badge">{message.status}</span>
                          {message.intent ? <span className="status-badge">{message.intent}</span> : null}
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyStatePanel
                      body="La conversación existe, pero todavía no hay mensajes visibles para este hilo."
                      eyebrow="Chat"
                      title="No hay mensajes para mostrar"
                    />
                  )}
                </div>
                <div className="conversation-composer">
                  <label>
                    <span>Responder</span>
                    <textarea
                      id="messages-conversation-composer"
                      name="messages_conversation_composer"
                      value={composer}
                      onChange={(event) => onComposerChange(event.target.value)}
                      placeholder={
                        activeConversation.window_open
                          ? "Escribe una respuesta para el paciente"
                          : "La ventana de 24 horas está cerrada. Solo pueden enviarse templates desde appoint-me."
                      }
                      rows={4}
                      disabled={!activeConversation.window_open || isSendingMessage}
                    />
                  </label>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="success-button"
                      disabled={!activeConversation.window_open || !composer.trim() || isSendingMessage}
                      onClick={onSendMessage}
                    >
                      {isSendingMessage ? "Enviando..." : "Enviar mensaje"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyStatePanel
                body="Selecciona una conversación de la izquierda para revisar el historial y responder desde aquí."
                eyebrow="Chat"
                title="Selecciona una conversación"
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
