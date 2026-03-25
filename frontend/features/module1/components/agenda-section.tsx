"use client";

import { ActiveFiltersBar } from "@/features/module1/components/active-filters-bar";
import { AgendaCalendar } from "@/features/module1/components/agenda-calendar";
import { AppointmentBadges } from "@/features/module1/components/appointment-badges";
import type { CalendarView } from "@/features/module1/console-config";
import { calendarRangeLabel, formatDateTime } from "@/features/module1/console-utils";
import { DateField, RequiredLabel, SearchableSelect } from "@/features/module1/components/form-fields";
import {
  appointmentStatusLabel,
  appointmentTypeLabel,
  dispatchStatusLabel,
  reviewReasonLabel,
} from "@/features/module1/console-utils";
import type {
  Appointment,
  AppointmentHistory,
  AppointmentReviewItem,
  CommunicationDispatch,
  CommunicationDispatchAttempt,
  Doctor,
  Encounter,
  Patient,
  PatientSummary,
} from "@/features/module1/types";

type AgendaSectionProps = {
  agendaDays: Date[];
  allowMultiDoctorVisibility: boolean;
  appointmentDispatches: Record<number, CommunicationDispatch[]>;
  appointmentFilter: "all" | "ws" | "confirmed" | "pending_confirmation" | "needs_attention";
  appointmentForm: {
    patient_id: string;
    doctor_id: string;
    scheduled_start_date: string;
    scheduled_start_time: string;
    scheduled_end_date: string;
    scheduled_end_time: string;
    appointment_type: string;
    reason: string;
    notify_patient: boolean;
  };
  appointmentHistory: Record<number, AppointmentHistory[]>;
  appointmentReviewItems: AppointmentReviewItem[];
  appointmentsByDayKey: Map<string, Appointment[]>;
  availableDoctors: Doctor[];
  calendarDate: Date;
  calendarMetrics: (appointment: Appointment) => { rowStart: number; rowEnd: number };
  calendarView: CalendarView;
  canChooseAmongMultipleDoctors: boolean;
  canManageAppointments: boolean;
  canViewGlobalCommunications: boolean;
  data: {
    appointments: Appointment[];
    encounters: Encounter[];
    patients: Patient[];
  };
  dispatchAttempts: Record<number, CommunicationDispatchAttempt[]>;
  doctorFilter: string;
  expandedDispatchId: number | null;
  filteredAppointments: Appointment[];
  focusedAppointment: Appointment | null;
  goToNextRange: () => void;
  goToPreviousRange: () => void;
  goToToday: () => void;
  isAdmin: boolean;
  monthDays: Date[];
  onAppointmentDoctorChange: (value: string) => void;
  onAppointmentEndDateChange: (value: string) => void;
  onAppointmentEndTimeChange: (value: string) => void;
  onAppointmentFilterChange: (value: "all" | "ws" | "confirmed" | "pending_confirmation" | "needs_attention") => void;
  onAppointmentNotifyPatientChange: (value: boolean) => void;
  onAppointmentPatientChange: (value: string) => void;
  onAppointmentReasonChange: (value: string) => void;
  onAppointmentStartDateChange: (value: string) => void;
  onAppointmentStartTimeChange: (value: string) => void;
  onAppointmentTypeChange: (value: string) => void;
  onCalendarViewChange: (value: CalendarView) => void;
  onCloseFocusedAppointment: () => void;
  onDoctorFilterChange: (value: string) => void;
  onGoToMessagesForAppointment: (appointmentId: number, patientId: number) => void;
  onGoToPatient: (patientId: number) => void;
  onSelectAppointment: (appointmentId: number) => void;
  openDispatchAttempts: (dispatchId: number) => void;
  reminderNow: (appointmentId: number) => void;
  renderAppointmentBadges: (appointment: Appointment) => React.ReactNode;
  selectedDoctor: Doctor | null;
  selectedSummary: PatientSummary | null;
  slotLabels: string[];
  submitAppointment: (event: React.FormEvent<HTMLFormElement>) => void;
  updateAppointmentStatus: (appointmentId: number, status: string) => void;
};

export function AgendaSection({
  agendaDays,
  allowMultiDoctorVisibility,
  appointmentDispatches,
  appointmentFilter,
  appointmentForm,
  appointmentHistory,
  appointmentReviewItems,
  appointmentsByDayKey,
  availableDoctors,
  calendarDate,
  calendarMetrics,
  calendarView,
  canChooseAmongMultipleDoctors,
  canManageAppointments,
  canViewGlobalCommunications,
  data,
  dispatchAttempts,
  doctorFilter,
  expandedDispatchId,
  filteredAppointments,
  focusedAppointment,
  goToNextRange,
  goToPreviousRange,
  goToToday,
  isAdmin,
  monthDays,
  onAppointmentDoctorChange,
  onAppointmentEndDateChange,
  onAppointmentEndTimeChange,
  onAppointmentFilterChange,
  onAppointmentNotifyPatientChange,
  onAppointmentPatientChange,
  onAppointmentReasonChange,
  onAppointmentStartDateChange,
  onAppointmentStartTimeChange,
  onAppointmentTypeChange,
  onCalendarViewChange,
  onCloseFocusedAppointment,
  onDoctorFilterChange,
  onGoToMessagesForAppointment,
  onGoToPatient,
  onSelectAppointment,
  openDispatchAttempts,
  reminderNow,
  renderAppointmentBadges,
  selectedDoctor,
  selectedSummary,
  slotLabels,
  submitAppointment,
  updateAppointmentStatus,
}: AgendaSectionProps) {
  const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
  const splitTimeValue = (value: string) => {
    const [hour = "00", minute = "00"] = value.split(":");
    return { hour, minute };
  };
  const updateTimePart = (value: string, part: "hour" | "minute", nextValue: string) => {
    const current = splitTimeValue(value);
    const hour = part === "hour" ? nextValue : current.hour;
    const minute = part === "minute" ? nextValue : current.minute;
    return `${hour}:${minute}`;
  };
  const doctorOptions = availableDoctors.map((doctor) => ({
    value: String(doctor.id),
    label: `Dr. ${doctor.first_name} ${doctor.last_name}`,
  }));
  const patientOptions = data.patients.map((patient) => ({
    value: String(patient.id),
    label: `${patient.first_name} ${patient.last_name}`,
    description: patient.medical_record_number,
    keywords: [patient.primary_phone ?? "", patient.national_id ?? ""],
  }));
  const selectedAppointmentPatient =
    data.patients.find((patient) => String(patient.id) === appointmentForm.patient_id) ?? null;
  const canNotifySelectedPatient = Boolean(selectedAppointmentPatient?.primary_phone?.trim());
  const activeAgendaFilters = [
    doctorFilter && selectedDoctor ? { label: "Doctor", value: `${selectedDoctor.first_name} ${selectedDoctor.last_name}` } : null,
    appointmentFilter !== "all"
      ? {
          label: "Agenda",
          value:
            appointmentFilter === "ws"
              ? "WhatsApp"
              : appointmentFilter === "confirmed"
                ? "Confirmadas"
                : appointmentFilter === "pending_confirmation"
                  ? "Por confirmar"
                  : "Requieren atencion",
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  const reviewQueueByAppointmentId = new Map(
    appointmentReviewItems
      .filter((item) => item.existing_appointment_id !== null)
      .map((item) => [item.existing_appointment_id as number, item]),
  );
  const startTimeParts = splitTimeValue(appointmentForm.scheduled_start_time);
  const endTimeParts = splitTimeValue(appointmentForm.scheduled_end_time);

  const renderFocusedAppointment = () => {
    if (!focusedAppointment) {
      return (
        <article className="card section-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2>Selecciona una cita</h2>
            </div>
          </div>
          <p className="empty-state">Haz clic sobre una cita del calendario para ver historial, mensajes y acciones.</p>
        </article>
      );
    }

    const relatedDispatches = appointmentDispatches[focusedAppointment.id] ?? [];
    const reviewItem = reviewQueueByAppointmentId.get(focusedAppointment.id);

    return (
      <>
        <article className="card section-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2>Cita abierta en modal</h2>
            </div>
            <button type="button" className="secondary-button" onClick={onCloseFocusedAppointment}>
              Cerrar
            </button>
          </div>
          <p className="empty-state">El detalle completo de la cita está abierto como modal para que no tengas que volver al panel lateral.</p>
        </article>
        <div className="modal-overlay agenda-detail-overlay" role="dialog" aria-modal="true">
          <div className="modal-card agenda-detail-modal">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Detalle de cita</p>
                <h2>{focusedAppointment.patient_name ?? `Paciente ${focusedAppointment.patient_id}`}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={onCloseFocusedAppointment}>
                Cerrar
              </button>
            </div>
            <div className="detail-stack">
              <div className="detail-panel">
                <strong>{focusedAppointment.doctor_name ?? `Doctor ${focusedAppointment.doctor_id}`}</strong>
                <span>{formatDateTime(focusedAppointment.scheduled_start)}</span>
                <span>{appointmentTypeLabel(focusedAppointment.appointment_type)}</span>
                <span>{appointmentStatusLabel(focusedAppointment.status)}</span>
                {renderAppointmentBadges(focusedAppointment)}
                {reviewItem ? (
                  <div className="timeline-item">
                    <strong>{reviewReasonLabel(reviewItem.review_reason)}</strong>
                    <span>{reviewItem.review_message}</span>
                    <span>Horario solicitado: {formatDateTime(reviewItem.scheduled_start)}</span>
                  </div>
                ) : null}
                {canManageAppointments ? (
                  <div className="row-actions">
                    <button type="button" className="success-button" onClick={() => updateAppointmentStatus(focusedAppointment.id, "confirmed")}>
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="success-button"
                      onClick={() => reminderNow(focusedAppointment.id)}
                      disabled={focusedAppointment.status === "cancelled" || focusedAppointment.confirmation_status === "cancelled"}
                    >
                      Enviar recordatorio ahora
                    </button>
                    <button type="button" className="danger-button" onClick={() => updateAppointmentStatus(focusedAppointment.id, "cancelled")}>
                      Cancelar
                    </button>
                    <button type="button" className="success-button" onClick={() => updateAppointmentStatus(focusedAppointment.id, "completed")}>
                      Completar
                    </button>
                  </div>
                ) : null}
                <div className="row-actions">
                  <button type="button" className="secondary-button" onClick={() => onGoToPatient(focusedAppointment.patient_id)}>
                    Ver paciente
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onGoToMessagesForAppointment(focusedAppointment.id, focusedAppointment.patient_id)}
                  >
                    Ver mensajes
                  </button>
                </div>
              </div>
              <div className="detail-panel">
                <strong>Historial</strong>
                {appointmentHistory[focusedAppointment.id]?.length ? (
                  appointmentHistory[focusedAppointment.id].map((entry) => (
                    <div className="timeline-item" key={`history-${entry.id}`}>
                      <strong>
                        {appointmentStatusLabel(entry.old_status ?? "scheduled")} → {appointmentStatusLabel(entry.new_status)}
                      </strong>
                      <span>{formatDateTime(entry.created_at)}</span>
                      <span>{entry.change_reason ?? "Sin observación"}</span>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Sin movimientos registrados.</p>
                )}
              </div>
              <div className="detail-panel">
                <strong>Mensajes relacionados</strong>
                {relatedDispatches.length ? (
                  relatedDispatches.map((dispatch) => (
                    <div className="timeline-item" key={`dispatch-${dispatch.id}`}>
                      <strong>{dispatch.template_title ?? "Mensaje"}</strong>
                      <span>{dispatchStatusLabel(dispatch.status)} · {formatDateTime(dispatch.created_at)}</span>
                      <span>{dispatch.rendered_message ?? "Sin contenido generado."}</span>
                      {canViewGlobalCommunications ? (
                        <div className="row-actions">
                          <button type="button" className="secondary-button" onClick={() => openDispatchAttempts(dispatch.id)}>
                            {expandedDispatchId === dispatch.id ? "Ocultar intentos" : "Ver intentos"}
                          </button>
                        </div>
                      ) : null}
                      {expandedDispatchId === dispatch.id ? (
                        <div className="attempt-list">
                          {dispatchAttempts[dispatch.id]?.length ? (
                            dispatchAttempts[dispatch.id].map((attempt) => (
                              <div className="timeline-item" key={`attempt-${attempt.id}`}>
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
                  <p className="empty-state">Esta cita todavía no tiene mensajes ligados.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <section className="tab-layout">
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Calendario clínico</h2>
          </div>
          <div className="toolbar-inline">
            <button type="button" className="secondary-button" onClick={goToPreviousRange}>Anterior</button>
            <button type="button" className="secondary-button" onClick={goToToday}>Hoy</button>
            <button type="button" className="secondary-button" onClick={goToNextRange}>Siguiente</button>
          </div>
        </div>
        <div className="toolbar-row">
          <strong>{calendarRangeLabel(calendarView, calendarDate)}</strong>
          <div className="chip-row">
            {(["dia", "semana", "mes"] as CalendarView[]).map((view) => (
              <button
                key={view}
                type="button"
                className={`filter-chip ${calendarView === view ? "filter-chip-active" : ""}`}
                onClick={() => onCalendarViewChange(view)}
              >
                {view[0].toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
          <div className="toolbar-inline">
            {isAdmin ? (
              <SearchableSelect
                value={doctorFilter}
                onChange={onDoctorFilterChange}
                options={doctorOptions}
                placeholder="Todos los doctores"
                clearLabel="Todos los doctores"
                searchPlaceholder="Buscar doctor"
              />
            ) : canChooseAmongMultipleDoctors && availableDoctors.length > 1 ? (
              <SearchableSelect
                value={doctorFilter}
                onChange={onDoctorFilterChange}
                options={doctorOptions}
                placeholder="Selecciona doctor"
                clearLabel="Selecciona doctor"
                searchPlaceholder="Buscar doctor"
              />
            ) : !isAdmin && availableDoctors.length > 1 ? (
              <div className="context-pill">Hay varios doctores asignados. Contacta al administrador para habilitar visibilidad.</div>
            ) : selectedDoctor ? (
              <div className="context-pill">Doctor: {selectedDoctor.first_name} {selectedDoctor.last_name}</div>
            ) : null}
            {!isAdmin && allowMultiDoctorVisibility && availableDoctors.length > 1 ? (
              <div className="context-pill">Recepción con {availableDoctors.length} doctores asignados</div>
            ) : null}
            <div className="chip-row">
              <button type="button" className={`filter-chip filter-chip-all ${appointmentFilter === "all" ? "filter-chip-active" : ""}`} onClick={() => onAppointmentFilterChange("all")}>Todas</button>
              <button type="button" className={`filter-chip filter-chip-ws ${appointmentFilter === "ws" ? "filter-chip-active" : ""}`} onClick={() => onAppointmentFilterChange("ws")}>WhatsApp</button>
              <button type="button" className={`filter-chip filter-chip-confirmed ${appointmentFilter === "confirmed" ? "filter-chip-active" : ""}`} onClick={() => onAppointmentFilterChange("confirmed")}>Confirmadas</button>
              <button type="button" className={`filter-chip filter-chip-pending ${appointmentFilter === "pending_confirmation" ? "filter-chip-active" : ""}`} onClick={() => onAppointmentFilterChange("pending_confirmation")}>Por confirmar</button>
              <button type="button" className={`filter-chip filter-chip-attention ${appointmentFilter === "needs_attention" ? "filter-chip-active" : ""}`} onClick={() => onAppointmentFilterChange("needs_attention")}>Requieren atención</button>
            </div>
          </div>
        </div>
        <ActiveFiltersBar
          items={activeAgendaFilters}
          onClearAll={
            activeAgendaFilters.length
              ? () => {
                  onDoctorFilterChange("");
                  onAppointmentFilterChange("all");
                }
              : undefined
          }
          resultsLabel="citas en la vista actual"
          resultsValue={filteredAppointments.length}
        />
        <AgendaCalendar
          calendarView={calendarView}
          calendarDate={calendarDate}
          monthDays={monthDays}
          agendaDays={agendaDays}
          slotLabels={slotLabels}
          appointmentsByDayKey={appointmentsByDayKey}
          onSelectAppointment={onSelectAppointment}
          calendarMetrics={calendarMetrics}
        />
      </article>
      <div className="agenda-side-stack">
        {renderFocusedAppointment()}
        <article className="card section-card">
          {canManageAppointments ? (
            <form className="form-card compact-form" onSubmit={submitAppointment}>
              <h3>Nueva cita</h3>
              <label>
                <RequiredLabel>Paciente</RequiredLabel>
                <SearchableSelect
                  value={appointmentForm.patient_id}
                  onChange={onAppointmentPatientChange}
                  options={patientOptions}
                  placeholder="Seleccionar paciente"
                  searchPlaceholder="Buscar paciente"
                  required
                />
              </label>
              {isAdmin || (canChooseAmongMultipleDoctors && availableDoctors.length > 1) ? (
                <label>
                  <RequiredLabel>Doctor</RequiredLabel>
                  <SearchableSelect
                    value={appointmentForm.doctor_id}
                    onChange={onAppointmentDoctorChange}
                    options={doctorOptions}
                    placeholder={isAdmin ? "Seleccionar doctor" : "Selecciona doctor"}
                    searchPlaceholder="Buscar doctor"
                    required
                  />
                </label>
              ) : !isAdmin && availableDoctors.length > 1 ? (
                <p className="empty-state">No puedes elegir entre varios doctores hasta que administración habilite esa visibilidad.</p>
              ) : selectedDoctor ? (
                <label>
                  <span>Doctor</span>
                  <input value={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`} readOnly />
                </label>
              ) : null}
              <DateField label="Fecha" value={appointmentForm.scheduled_start_date} onChange={onAppointmentStartDateChange} required />
              <label>
                <RequiredLabel>Tipo de cita</RequiredLabel>
                <select value={appointmentForm.appointment_type} onChange={(event) => onAppointmentTypeChange(event.target.value)} required>
                  <option value="first_consultation">Primera consulta</option>
                  <option value="follow_up">Seguimiento</option>
                  <option value="checkup">Chequeo</option>
                  <option value="procedure">Procedimiento</option>
                  <option value="virtual_consultation">Consulta virtual</option>
                </select>
              </label>
              <label>
                <RequiredLabel>Hora inicio</RequiredLabel>
                <div className="time-field-grid">
                  <select
                    value={startTimeParts.hour}
                    onChange={(event) => onAppointmentStartTimeChange(updateTimePart(appointmentForm.scheduled_start_time, "hour", event.target.value))}
                    required
                  >
                    {hourOptions.map((hour) => (
                      <option key={`start-hour-${hour}`} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <select
                    value={startTimeParts.minute}
                    onChange={(event) => onAppointmentStartTimeChange(updateTimePart(appointmentForm.scheduled_start_time, "minute", event.target.value))}
                    required
                  >
                    {minuteOptions.map((minute) => (
                      <option key={`start-minute-${minute}`} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label>
                <RequiredLabel>Hora fin</RequiredLabel>
                <div className="time-field-grid">
                  <select
                    value={endTimeParts.hour}
                    onChange={(event) => onAppointmentEndTimeChange(updateTimePart(appointmentForm.scheduled_end_time, "hour", event.target.value))}
                    required
                  >
                    {hourOptions.map((hour) => (
                      <option key={`end-hour-${hour}`} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <select
                    value={endTimeParts.minute}
                    onChange={(event) => onAppointmentEndTimeChange(updateTimePart(appointmentForm.scheduled_end_time, "minute", event.target.value))}
                    required
                  >
                    {minuteOptions.map((minute) => (
                      <option key={`end-minute-${minute}`} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="span-two">
                <span>Motivo de la cita</span>
                <textarea
                  value={appointmentForm.reason}
                  onChange={(event) => onAppointmentReasonChange(event.target.value)}
                  placeholder="Ejemplo: control de presión arterial, revisión de resultados, seguimiento de síntomas."
                  rows={3}
                />
              </label>
              <label className="checkbox-field">
                <span>Notificar al paciente por WhatsApp</span>
                <input
                  type="checkbox"
                  checked={Boolean(appointmentForm.notify_patient && canNotifySelectedPatient)}
                  onChange={(event) => onAppointmentNotifyPatientChange(event.target.checked)}
                  disabled={!canNotifySelectedPatient}
                />
              </label>
              {!canNotifySelectedPatient ? (
                <p className="empty-state">Este paciente no tiene teléfono registrado. La notificación por WhatsApp queda deshabilitada.</p>
              ) : null}
              <button type="submit">Guardar cita</button>
            </form>
          ) : (
            <p className="empty-state">Desde aquí puedes revisar la agenda y abrir el detalle de cada cita.</p>
          )}
        </article>
      </div>
    </section>
  );
}
