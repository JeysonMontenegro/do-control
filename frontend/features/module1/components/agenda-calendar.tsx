"use client";

import { useMemo, type CSSProperties } from "react";

import type { Appointment } from "@/features/module1/types";
import type { CalendarView } from "@/features/module1/console-config";
import { appointmentStatusLabel, appointmentTypeLabel, formatDate, formatTime, formatWeekday, getAppointmentEventClassName, isSameDay, startOfDay } from "@/features/module1/console-utils";

const AGENDA_SLOT_HEIGHT = 36;
const AGENDA_EVENT_GAP = 4;
const AGENDA_STACK_OFFSET = 18;

type AgendaCalendarProps = {
  calendarView: CalendarView;
  calendarDate: Date;
  monthDays: Date[];
  agendaDays: Date[];
  slotLabels: string[];
  appointmentsByDayKey: Map<string, Appointment[]>;
  onSelectAppointment: (appointmentId: number) => void;
  calendarMetrics: (appointment: Appointment) => {
    rowStart: number;
    rowEnd: number;
    clampedStart: number;
    clampedEnd: number;
    dayStart: number;
  };
};

function pixelOffsetForMinutes(
  minuteOffset: number,
  rowHeights: number[],
  rowOffsets: number[],
) {
  const normalizedOffset = Math.max(0, minuteOffset);
  const rowIndex = Math.min(rowHeights.length - 1, Math.floor(normalizedOffset / 30));
  const minuteRemainder = normalizedOffset % 30;
  return rowOffsets[rowIndex] + rowHeights[rowIndex] * (minuteRemainder / 30);
}

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
  const overlapLayouts = useMemo(() => {
    const layouts = new Map<number, { columnIndex: number; columnCount: number }>();

    agendaDays.forEach((day) => {
      const appointments = appointmentsByDayKey.get(startOfDay(day).toISOString()) ?? [];
      buildAppointmentLayouts(appointments).forEach((layout, appointmentId) => layouts.set(appointmentId, layout));
    });

    return layouts;
  }, [agendaDays, appointmentsByDayKey]);

  const stackedLayouts = useMemo(() => {
    const layouts = new Map<number, { stackIndex: number; stackSize: number }>();

    agendaDays.forEach((day) => {
      const appointments = appointmentsByDayKey.get(startOfDay(day).toISOString()) ?? [];
      const clusters = buildAppointmentClusters(appointments);

      clusters.forEach((cluster) => {
        cluster.forEach((appointment, index) => {
          layouts.set(appointment.id, {
            stackIndex: index,
            stackSize: cluster.length,
          });
        });
      });
    });

    return layouts;
  }, [agendaDays, appointmentsByDayKey]);

  const weekRowMetrics = useMemo(() => {
    const metricsByDay = new Map<string, { rowHeights: number[]; rowOffsets: number[] }>();

    agendaDays.forEach((day) => {
      const dayKey = startOfDay(day).toISOString();
      const appointments = appointmentsByDayKey.get(dayKey) ?? [];
      const rowHeights = Array.from({ length: slotLabels.length - 1 }, () => AGENDA_SLOT_HEIGHT);
      const clusters = buildAppointmentClusters(appointments);

      clusters.forEach((cluster) => {
        if (cluster.length <= 1) {
          return;
        }

        const clusterRows = cluster.map((appointment) => calendarMetrics(appointment));
        const clusterStart = Math.min(...clusterRows.map((item) => item.rowStart));
        const clusterEnd = Math.max(...clusterRows.map((item) => item.rowEnd));
        const coveredRows = Math.max(1, clusterEnd - clusterStart);
        const extraHeight = (cluster.length - 1) * AGENDA_STACK_OFFSET;
        const extraPerRow = Math.floor(extraHeight / coveredRows);
        let remainder = extraHeight % coveredRows;

        for (let rowIndex = clusterStart - 2; rowIndex < clusterEnd - 2; rowIndex += 1) {
          rowHeights[rowIndex] += extraPerRow + (remainder > 0 ? 1 : 0);
          if (remainder > 0) {
            remainder -= 1;
          }
        }
      });

      const rowOffsets: number[] = [];
      let offset = 0;
      rowHeights.forEach((height, index) => {
        rowOffsets[index] = offset;
        offset += height;
      });

      metricsByDay.set(dayKey, { rowHeights, rowOffsets });
    });

    return metricsByDay;
  }, [agendaDays, appointmentsByDayKey, calendarMetrics, slotLabels.length]);

  const renderAppointmentButton = (appointment: Appointment, className: string) => (
    <button
      type="button"
      key={`${className}-${appointment.id}`}
      className={className}
      onClick={() => onSelectAppointment(appointment.id)}
      title={`${appointment.patient_name ?? `Paciente ${appointment.patient_id}`} · ${appointmentTypeLabel(appointment.appointment_type)} · ${appointmentStatusLabel(appointment.status)}`}
    >
      <span>{formatTime(appointment.scheduled_start)}</span>
      <strong>{appointment.patient_name ?? `Paciente ${appointment.patient_id}`}</strong>
    </button>
  );

  if (calendarView === "mes") {
    return (
      <>
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
        <div className="mobile-agenda-list">
          {monthDays
            .filter((day) => (appointmentsByDayKey.get(startOfDay(day).toISOString()) ?? []).length > 0)
            .map((day) => {
              const appointments = appointmentsByDayKey.get(startOfDay(day).toISOString()) ?? [];
              return (
                <article className="mobile-agenda-day" key={`mobile-month-${day.toISOString()}`}>
                  <header className="mobile-agenda-day-header">
                    <strong>{formatDate(day)}</strong>
                    <span>{appointments.length} cita{appointments.length === 1 ? "" : "s"}</span>
                  </header>
                  <div className="mobile-agenda-events">
                    {appointments.map((appointment) =>
                      renderAppointmentButton(
                        appointment,
                        `mobile-agenda-event mobile-agenda-event-${getAppointmentEventClassName(appointment)}`,
                      ),
                    )}
                  </div>
                </article>
              );
            })}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={`agenda-shell ${calendarView === "dia" ? "agenda-shell-day" : "agenda-shell-week"}`}>
        <div
          className="agenda-header-grid"
          style={{ gridTemplateColumns: `88px repeat(${agendaDays.length}, minmax(0, 1fr))` }}
        >
          <div className="agenda-corner" />
          {agendaDays.map((day) => (
            <div key={`header-${day.toISOString()}`} className={`agenda-day-header ${isSameDay(day, new Date()) ? "agenda-day-header-today" : ""}`}>
              <strong>{formatWeekday(day)}</strong>
              <span>{formatDate(day)}</span>
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

          {agendaDays.map((day) => {
            const dayKey = startOfDay(day).toISOString();
            const appointments = appointmentsByDayKey.get(dayKey) ?? [];
            const isDayView = calendarView === "dia";
            const rowMetrics = weekRowMetrics.get(dayKey) ?? {
              rowHeights: Array.from({ length: slotLabels.length - 1 }, () => AGENDA_SLOT_HEIGHT),
              rowOffsets: Array.from({ length: slotLabels.length - 1 }, (_, index) => index * AGENDA_SLOT_HEIGHT),
            };

            return (
              <div
                key={`column-${day.toISOString()}`}
                className="agenda-day-column"
                style={isDayView ? undefined : { gridTemplateRows: rowMetrics.rowHeights.map((height) => `${height}px`).join(" ") }}
              >
                {slotLabels.slice(0, -1).map((slotLabel) => (
                  <div key={`slot-${day.toISOString()}-${slotLabel}`} className="agenda-slot" />
                ))}
                {appointments.map((appointment) => {
                  const metrics = calendarMetrics(appointment);
                  const overlapLayout = overlapLayouts.get(appointment.id) ?? { columnIndex: 0, columnCount: 1 };
                  const stackedLayout = stackedLayouts.get(appointment.id) ?? { stackIndex: 0, stackSize: 1 };
                  const startIndex = Math.max(0, metrics.rowStart - 2);
                  const endIndex = Math.max(startIndex + 1, metrics.rowEnd - 2);
                  const visibleEndMinutes = Math.max(metrics.clampedEnd, metrics.clampedStart + 30);
                  const startMinuteOffset = metrics.clampedStart - metrics.dayStart;
                  const endMinuteOffset = visibleEndMinutes - metrics.dayStart;
                  const topOffset = isDayView
                    ? (startMinuteOffset / 30) * AGENDA_SLOT_HEIGHT + 3
                    : pixelOffsetForMinutes(startMinuteOffset, rowMetrics.rowHeights, rowMetrics.rowOffsets) +
                      stackedLayout.stackIndex * AGENDA_STACK_OFFSET +
                      3;
                  const baseHeight = isDayView
                    ? Math.max(AGENDA_SLOT_HEIGHT, ((visibleEndMinutes - metrics.clampedStart) / 30) * AGENDA_SLOT_HEIGHT - 6)
                    : Math.max(
                        AGENDA_SLOT_HEIGHT,
                        pixelOffsetForMinutes(endMinuteOffset, rowMetrics.rowHeights, rowMetrics.rowOffsets) -
                          pixelOffsetForMinutes(startMinuteOffset, rowMetrics.rowHeights, rowMetrics.rowOffsets) -
                          6,
                      );
                  return (
                    <button
                      type="button"
                      key={`grid-appointment-${appointment.id}`}
                      className={`agenda-event agenda-event-${getAppointmentEventClassName(appointment)}${
                        isDayView && overlapLayout.columnCount > 1 ? " agenda-event-compact" : ""
                      }${baseHeight <= AGENDA_SLOT_HEIGHT + 6 ? " agenda-event-tight" : ""}`}
                      style={
                        {
                          top: `${topOffset}px`,
                          height: `${baseHeight}px`,
                          "--agenda-column-index": isDayView ? overlapLayout.columnIndex : 0,
                          "--agenda-column-count": isDayView ? overlapLayout.columnCount : 1,
                          "--agenda-column-gap": `${AGENDA_EVENT_GAP}px`,
                        } as CSSProperties
                      }
                      onClick={() => onSelectAppointment(appointment.id)}
                      title={`${appointment.patient_name ?? `Paciente ${appointment.patient_id}`} · ${appointmentTypeLabel(appointment.appointment_type)} · ${appointmentStatusLabel(appointment.status)}`}
                    >
                      <span>{formatTime(appointment.scheduled_start)}</span>
                      <strong>{appointment.patient_name ?? `Paciente ${appointment.patient_id}`}</strong>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mobile-agenda-list">
        {agendaDays.map((day) => {
          const appointments = appointmentsByDayKey.get(startOfDay(day).toISOString()) ?? [];
          return (
            <article className="mobile-agenda-day" key={`mobile-day-${day.toISOString()}`}>
              <header className="mobile-agenda-day-header">
                <strong>{formatWeekday(day)}</strong>
                <span>{formatDate(day)}</span>
                <span>{appointments.length ? `${appointments.length} cita${appointments.length === 1 ? "" : "s"}` : "Sin citas"}</span>
              </header>
              <div className="mobile-agenda-events">
                {appointments.length ? (
                  appointments.map((appointment) =>
                    renderAppointmentButton(
                      appointment,
                      `mobile-agenda-event mobile-agenda-event-${getAppointmentEventClassName(appointment)}`,
                    ),
                  )
                ) : (
                  <div className="mobile-agenda-empty">Sin citas programadas</div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

function buildAppointmentClusters(appointments: Appointment[]) {
  const sortedAppointments = [...appointments].sort(
    (left, right) => new Date(left.scheduled_start).getTime() - new Date(right.scheduled_start).getTime(),
  );
  const clusters: Appointment[][] = [];
  let clusterAppointments: Appointment[] = [];
  let clusterEnd = 0;

  sortedAppointments.forEach((appointment) => {
    const start = new Date(appointment.scheduled_start).getTime();
    const end = new Date(appointment.scheduled_end).getTime();

    if (!clusterAppointments.length || start < clusterEnd) {
      clusterAppointments.push(appointment);
      clusterEnd = Math.max(clusterEnd, end);
      return;
    }

    clusters.push([...clusterAppointments]);
    clusterAppointments = [appointment];
    clusterEnd = end;
  });

  if (clusterAppointments.length) {
    clusters.push([...clusterAppointments]);
  }

  return clusters;
}

function buildAppointmentLayouts(appointments: Appointment[]) {
  const layouts = new Map<number, { columnIndex: number; columnCount: number }>();

  buildAppointmentClusters(appointments).forEach((cluster) => {
    const clusterWithTimes = cluster.map((appointment) => ({
      appointment,
      start: new Date(appointment.scheduled_start).getTime(),
      end: new Date(appointment.scheduled_end).getTime(),
    }));
    const activeColumns: Array<{ end: number; columnIndex: number }> = [];
    let maxColumns = 0;

    clusterWithTimes.forEach((entry) => {
      for (let index = activeColumns.length - 1; index >= 0; index -= 1) {
        if (activeColumns[index].end <= entry.start) {
          activeColumns.splice(index, 1);
        }
      }

      let columnIndex = 0;
      while (activeColumns.some((column) => column.columnIndex === columnIndex)) {
        columnIndex += 1;
      }

      activeColumns.push({ end: entry.end, columnIndex });
      maxColumns = Math.max(maxColumns, columnIndex + 1);
      layouts.set(entry.appointment.id, { columnIndex, columnCount: 1 });
    });

    cluster.forEach((appointment) => {
      const current = layouts.get(appointment.id);
      if (current) {
        layouts.set(appointment.id, { ...current, columnCount: maxColumns });
      }
    });
  });

  return layouts;
}
