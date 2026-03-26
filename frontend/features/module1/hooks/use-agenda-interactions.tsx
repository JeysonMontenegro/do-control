"use client";

import { useMemo } from "react";

import { AppointmentBadges } from "@/features/module1/components/appointment-badges";
import type { CalendarView } from "@/features/module1/console-config";
import { addDays, lastDispatchStatus, startOfDay } from "@/features/module1/console-utils";
import type { Appointment, AppointmentReviewItem, CommunicationDispatch } from "@/features/module1/types";

type UseAgendaInteractionsParams = {
  appointmentReviewItemsByAppointmentId: Map<number, AppointmentReviewItem>;
  calendarView: CalendarView;
  communicationDispatches: CommunicationDispatch[];
  expandedAppointmentId: number | null;
  filteredAppointments: Appointment[];
  setCalendarDate: React.Dispatch<React.SetStateAction<Date>>;
};

export function useAgendaInteractions({
  appointmentReviewItemsByAppointmentId,
  calendarView,
  communicationDispatches,
  expandedAppointmentId,
  filteredAppointments,
  setCalendarDate,
}: UseAgendaInteractionsParams) {
  const calendarMetrics = (appointment: Appointment) => {
    const start = new Date(appointment.scheduled_start);
    const end = new Date(appointment.scheduled_end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const dayStart = 6 * 60;
    const dayEnd = 20 * 60;
    const clampedStart = Math.max(startMinutes, dayStart);
    const clampedEnd = Math.min(endMinutes, dayEnd);
    const rowStart = Math.max(2, Math.floor((clampedStart - dayStart) / 30) + 2);
    const rowEnd = Math.max(rowStart + 1, Math.ceil((clampedEnd - dayStart) / 30) + 2);
    return {
      rowStart,
      rowEnd,
      clampedStart,
      clampedEnd,
      dayStart,
    };
  };

  const goToPreviousRange = () => {
    setCalendarDate((current) => {
      if (calendarView === "dia") {
        return addDays(current, -1);
      }
      if (calendarView === "semana") {
        return addDays(current, -7);
      }
      return new Date(current.getFullYear(), current.getMonth() - 1, 1);
    });
  };

  const goToNextRange = () => {
    setCalendarDate((current) => {
      if (calendarView === "dia") {
        return addDays(current, 1);
      }
      if (calendarView === "semana") {
        return addDays(current, 7);
      }
      return new Date(current.getFullYear(), current.getMonth() + 1, 1);
    });
  };

  const goToToday = () => setCalendarDate(startOfDay(new Date()));

  const focusedAppointment = useMemo(
    () => filteredAppointments.find((appointment) => appointment.id === expandedAppointmentId) ?? null,
    [expandedAppointmentId, filteredAppointments],
  );

  const renderAppointmentBadges = (appointment: Appointment) => {
    const relatedDispatches = communicationDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
    const latestMessageStatus = lastDispatchStatus(relatedDispatches);
    const reviewItem = appointmentReviewItemsByAppointmentId.get(appointment.id);

    return <AppointmentBadges appointment={appointment} latestMessageStatus={latestMessageStatus} reviewItem={reviewItem} />;
  };

  return {
    calendarMetrics,
    focusedAppointment,
    goToNextRange,
    goToPreviousRange,
    goToToday,
    renderAppointmentBadges,
  };
}
