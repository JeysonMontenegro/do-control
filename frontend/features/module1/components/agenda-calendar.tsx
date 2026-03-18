import type { Appointment } from "@/features/module1/types";
import type { CalendarView } from "@/features/module1/console-config";
import { appointmentStatusLabel, appointmentTypeLabel, formatDate, formatTime, getAppointmentEventClassName, isSameDay, startOfDay } from "@/features/module1/console-utils";

type AgendaCalendarProps = {
  calendarView: CalendarView;
  calendarDate: Date;
  monthDays: Date[];
  agendaDays: Date[];
  slotLabels: string[];
  appointmentsByDayKey: Map<string, Appointment[]>;
  onSelectAppointment: (appointmentId: number) => void;
  calendarMetrics: (appointment: Appointment) => { rowStart: number; rowEnd: number };
};

export function AgendaCalendar({
  calendarView,
  calendarDate,
  monthDays,
  agendaDays,
  slotLabels,
  appointmentsByDayKey,
  onSelectAppointment,
  calendarMetrics,
}: AgendaCalendarProps) {
  if (calendarView === "mes") {
    return (
      <div className="month-grid">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((label) => (
          <div key={label} className="month-weekday">
            {label}
          </div>
        ))}
        {monthDays.map((day) => {
          const appointments = appointmentsByDayKey.get(startOfDay(day).toISOString()) ?? [];
          const isCurrentMonth = day.getMonth() === calendarDate.getMonth();
          const isToday = isSameDay(day, new Date());
          return (
            <article
              key={day.toISOString()}
              className={`month-cell ${isCurrentMonth ? "" : "month-cell-muted"} ${isToday ? "month-cell-today" : ""}`}
            >
              <header>
                <strong>{day.getDate()}</strong>
                <span>{formatDate(day)}</span>
              </header>
              <div className="month-events">
                {appointments.slice(0, 4).map((appointment) => (
                  <button
                    type="button"
                    key={`month-appointment-${appointment.id}`}
                    className={`month-event month-event-${getAppointmentEventClassName(appointment)}`}
                    onClick={() => onSelectAppointment(appointment.id)}
                  >
                    <span>{formatTime(appointment.scheduled_start)}</span>
                    <strong>{appointment.patient_name ?? `Paciente ${appointment.patient_id}`}</strong>
                  </button>
                ))}
                {appointments.length > 4 ? <span className="empty-state">+{appointments.length - 4} más</span> : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`agenda-shell ${calendarView === "dia" ? "agenda-shell-day" : "agenda-shell-week"}`}>
      <div
        className="agenda-header-grid"
        style={{ gridTemplateColumns: `88px repeat(${agendaDays.length}, minmax(0, 1fr))` }}
      >
        <div className="agenda-corner" />
        {agendaDays.map((day) => (
          <div key={`header-${day.toISOString()}`} className={`agenda-day-header ${isSameDay(day, new Date()) ? "agenda-day-header-today" : ""}`}>
            <strong>{new Intl.DateTimeFormat("es-GT", { weekday: "long" }).format(day)}</strong>
            <span>{new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short" }).format(day)}</span>
          </div>
        ))}
      </div>

      <div
        className="agenda-body-grid"
        style={{ gridTemplateColumns: `88px repeat(${agendaDays.length}, minmax(0, 1fr))` }}
      >
        <div className="agenda-time-column">
          {slotLabels.slice(0, -1).map((slotLabel, slotIndex) => (
            <div key={`time-${slotLabel}`} className="agenda-time">
              {slotIndex % 2 === 0 ? slotLabel : ""}
            </div>
          ))}
        </div>

        {agendaDays.map((day) => (
          <div key={`column-${day.toISOString()}`} className="agenda-day-column">
            {slotLabels.slice(0, -1).map((slotLabel) => (
              <div key={`slot-${day.toISOString()}-${slotLabel}`} className="agenda-slot" />
            ))}
            {(appointmentsByDayKey.get(startOfDay(day).toISOString()) ?? []).map((appointment) => {
              const metrics = calendarMetrics(appointment);
              return (
                <button
                  type="button"
                  key={`grid-appointment-${appointment.id}`}
                  className={`agenda-event agenda-event-${getAppointmentEventClassName(appointment)}`}
                  style={{ gridRow: `${metrics.rowStart} / ${metrics.rowEnd}` }}
                  onClick={() => onSelectAppointment(appointment.id)}
                  title={`${appointment.patient_name ?? `Paciente ${appointment.patient_id}`} · ${appointmentTypeLabel(appointment.appointment_type)} · ${appointmentStatusLabel(appointment.status)}`}
                >
                  <span>{formatTime(appointment.scheduled_start)}</span>
                  <strong>{appointment.patient_name ?? `Paciente ${appointment.patient_id}`}</strong>
                  <small>{appointment.doctor_name ?? `Doctor ${appointment.doctor_id}`}</small>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
