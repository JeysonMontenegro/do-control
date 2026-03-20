"use client";

import { AgendaCalendar } from "@/features/module1/components/agenda-calendar";
import { AppointmentBadges } from "@/features/module1/components/appointment-badges";
import type { CalendarView } from "@/features/module1/console-config";
import { calendarRangeLabel, formatDateTime } from "@/features/module1/console-utils";
import { DateField, RequiredLabel } from "@/features/module1/components/form-fields";
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
  onAppointmentPatientChange: (value: string) => void;
  onAppointmentStartDateChange: (value: string) => void;
  onAppointmentStartTimeChange: (value: string) => void;
  onCalendarViewChange: (value: CalendarView) => void;
  onDoctorFilterChange: (value: string) => void;
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
  onAppointmentPatientChange,
  onAppointmentStartDateChange,
  onAppointmentStartTimeChange,
  onCalendarViewChange,
  onDoctorFilterChange,
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
  const reviewQueueByAppointmentId = new Map(
    appointmentReviewItems
      .filter((item) => item.existing_appointment_id !== null)
      .map((item) => [item.existing_appointment_id as number, item]),
  );

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
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Detalle de cita</p>
            <h2>{focusedAppointment.patient_name ?? `Paciente ${focusedAppointment.patient_id}`}</h2>
          </div>
          <span>{formatDateTime(focusedAppointment.scheduled_start)}</span>
        </div>
        <div className="detail-stack">
          <div className="detail-panel">
            <strong>{focusedAppointment.doctor_name ?? `Doctor ${focusedAppointment.doctor_id}`}</strong>
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
      </article>
    );
  };

  return (
    <section className="tab-layout">
      <section className="headline-strip span-three">
        <div className="headline-card" title="Cantidad de citas mostradas según la vista del calendario y filtros activos.">
          <strong>{filteredAppointments.length}</strong>
          <span>Citas visibles</span>
        </div>
        <div className="headline-card" title="Citas que todavía están pendientes de confirmación manual o por integración.">
          <strong>{filteredAppointments.filter((item) => item.confirmation_status === "pending").length}</strong>
          <span>Por confirmar</span>
        </div>
        <div className="headline-card" title="Total de consultas clínicas registradas en el sistema.">
          <strong>{data.encounters.length}</strong>
          <span>Consultas</span>
        </div>
        <div className="headline-card" title="Archivos clínicos del paciente seleccionado actualmente.">
          <strong>{selectedSummary?.attachments.length ?? 0}</strong>
          <span>Archivos</span>
        </div>
      </section>
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Resumen</p>
            <h2>Vista rápida</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card" title="Cantidad de citas visibles dentro de la vista actual del calendario.">
            <strong>{filteredAppointments.length}</strong>
            <span>Citas en la vista actual</span>
          </div>
          <div className="metric-card" title="Citas que siguen pendientes de confirmar.">
            <strong>{filteredAppointments.filter((item) => item.confirmation_status === "pending").length}</strong>
            <span>Pendientes de confirmar</span>
          </div>
          <div className="metric-card" title="Casos enviados a revisión manual que aún requieren una decisión.">
            <strong>{appointmentReviewItems.length}</strong>
            <span>Casos por revisar</span>
          </div>
        </div>
        <div className="calendar-legend">
          <span className="legend-title">Colores</span>
          <span className="legend-item"><span className="legend-swatch legend-swatch-default" />Cita normal</span>
          <span className="legend-item"><span className="legend-swatch legend-swatch-confirmed" />Cita confirmada</span>
          <span className="legend-item"><span className="legend-swatch legend-swatch-ws" />Cita desde WhatsApp</span>
          <span className="legend-item"><span className="legend-swatch legend-swatch-cancelled" />Cita cancelada</span>
        </div>
      </article>
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
              <select value={doctorFilter} onChange={(event) => onDoctorFilterChange(event.target.value)}>
                <option value="">Todos los doctores</option>
                {availableDoctors.map((doctor) => (
                  <option key={`doctor-filter-${doctor.id}`} value={doctor.id}>{doctor.first_name} {doctor.last_name}</option>
                ))}
              </select>
            ) : canChooseAmongMultipleDoctors && availableDoctors.length > 1 ? (
              <select value={doctorFilter} onChange={(event) => onDoctorFilterChange(event.target.value)}>
                <option value="">Selecciona doctor</option>
                {availableDoctors.map((doctor) => (
                  <option key={`doctor-scope-${doctor.id}`} value={doctor.id}>{doctor.first_name} {doctor.last_name}</option>
                ))}
              </select>
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
                <select value={appointmentForm.patient_id} onChange={(event) => onAppointmentPatientChange(event.target.value)} required>
                  <option value="">Seleccionar</option>
                  {data.patients.map((patient) => (
                    <option key={`appointment-patient-${patient.id}`} value={patient.id}>{patient.first_name} {patient.last_name}</option>
                  ))}
                </select>
              </label>
              {isAdmin || (canChooseAmongMultipleDoctors && availableDoctors.length > 1) ? (
                <label>
                  <RequiredLabel>Doctor</RequiredLabel>
                  <select value={appointmentForm.doctor_id} onChange={(event) => onAppointmentDoctorChange(event.target.value)} required>
                    <option value="">{isAdmin ? "Seleccionar" : "Selecciona doctor"}</option>
                    {availableDoctors.map((doctor) => (
                      <option key={`appointment-doctor-${doctor.id}`} value={doctor.id}>{doctor.first_name} {doctor.last_name}</option>
                    ))}
                  </select>
                </label>
              ) : !isAdmin && availableDoctors.length > 1 ? (
                <p className="empty-state">No puedes elegir entre varios doctores hasta que administración habilite esa visibilidad.</p>
              ) : selectedDoctor ? (
                <label>
                  <span>Doctor</span>
                  <input value={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`} readOnly />
                </label>
              ) : null}
              <DateField label="Inicio" value={appointmentForm.scheduled_start_date} onChange={onAppointmentStartDateChange} required />
              <label>
                <RequiredLabel>Hora inicio</RequiredLabel>
                <input type="time" value={appointmentForm.scheduled_start_time} onChange={(event) => onAppointmentStartTimeChange(event.target.value)} required />
              </label>
              <DateField label="Fin" value={appointmentForm.scheduled_end_date} onChange={onAppointmentEndDateChange} required />
              <label>
                <RequiredLabel>Hora fin</RequiredLabel>
                <input type="time" value={appointmentForm.scheduled_end_time} onChange={(event) => onAppointmentEndTimeChange(event.target.value)} required />
              </label>
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
