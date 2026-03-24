"use client";

import { useMemo } from "react";

import { CONFIRMATION_TEMPLATE_KEY, type CalendarView } from "@/features/module1/console-config";
import {
  addDays,
  lastDispatchStatus,
  startOfDay,
  startOfMonthGrid,
  startOfWeek,
} from "@/features/module1/console-utils";
import type {
  Appointment,
  AppointmentReviewItem,
  CommunicationDispatch,
  CommunicationTemplate,
  Doctor,
  Encounter,
  Patient,
  PatientSummary,
  ReminderRule,
} from "@/features/module1/types";

type LoadState = {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  encounters: Encounter[];
};

type UseClinicalConsoleDerivedParams = {
  activeDoctorPage: number;
  activeRoles: string[];
  activeTabDoctorFilter: string;
  appointmentFilter: "all" | "ws" | "confirmed" | "pending_confirmation" | "needs_attention";
  appointmentFormDoctorId: string;
  appointmentReviewItems: AppointmentReviewItem[];
  calendarDate: Date;
  calendarView: CalendarView;
  communicationDispatches: CommunicationDispatch[];
  communicationTemplates: CommunicationTemplate[];
  currentUserDisplayName: string | null;
  currentUserEmail: string;
  currentUserFirstName: string;
  currentUserGender: string | null;
  currentUserLastName: string;
  data: LoadState;
  doctorFilter: string;
  doctorRosterActiveDoctors: Doctor[];
  doctorRosterFilteredActiveDoctors: Doctor[];
  doctorRosterFilteredInactiveDoctors: Doctor[];
  encounterFormDoctorId: string;
  inactiveDoctorPage: number;
  reminderRules: ReminderRule[];
  scopedDoctorId: number | null;
  selectedSummary: PatientSummary | null;
  teamPageSize: number;
  topbarSearch: string;
};

export function useClinicalConsoleDerived({
  activeDoctorPage,
  activeRoles,
  activeTabDoctorFilter,
  appointmentFilter,
  appointmentFormDoctorId,
  appointmentReviewItems,
  calendarDate,
  calendarView,
  communicationDispatches,
  communicationTemplates,
  currentUserDisplayName,
  currentUserEmail,
  currentUserFirstName,
  currentUserGender,
  currentUserLastName,
  data,
  doctorFilter,
  doctorRosterActiveDoctors,
  doctorRosterFilteredActiveDoctors,
  doctorRosterFilteredInactiveDoctors,
  encounterFormDoctorId,
  inactiveDoctorPage,
  reminderRules,
  scopedDoctorId,
  selectedSummary,
  teamPageSize,
  topbarSearch,
}: UseClinicalConsoleDerivedParams) {
  const normalizedGlobalSearch = useMemo(() => topbarSearch.trim().toLowerCase(), [topbarSearch]);

  const currentUserDisplay = useMemo(() => {
    const fullName = `${currentUserFirstName} ${currentUserLastName}`.trim();
    const alias = currentUserDisplayName?.trim() || "";
    const baseName = fullName || alias || currentUserEmail;
    if (activeRoles.includes("doctor")) {
      return `${currentUserGender === "female" ? "Dra." : "Dr."} ${baseName}`;
    }
    if (activeRoles.includes("receptionist")) {
      return `Recepcion ${baseName}`;
    }
    return baseName;
  }, [activeRoles, currentUserDisplayName, currentUserEmail, currentUserFirstName, currentUserGender, currentUserLastName]);

  const activeDoctors = doctorRosterActiveDoctors;
  const availableDoctors = activeDoctors;
  const hasSingleDoctorContext = availableDoctors.length === 1;

  const selectedDoctor = useMemo(
    () =>
      activeDoctors.find(
        (doctor) =>
          String(doctor.id) === activeTabDoctorFilter ||
          String(doctor.id) === appointmentFormDoctorId ||
          String(doctor.id) === encounterFormDoctorId,
      ) ?? activeDoctors[0] ?? null,
    [activeDoctors, activeTabDoctorFilter, appointmentFormDoctorId, encounterFormDoctorId],
  );

  const doctorNameById = useMemo(
    () =>
      new Map(
        data.doctors.map((doctor) => [
          doctor.id,
          `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
        ]),
      ),
    [data.doctors],
  );

  const reviewQueueByAppointmentId = useMemo(
    () =>
      new Map(
        appointmentReviewItems
          .filter((item) => item.existing_appointment_id !== null)
          .map((item) => [item.existing_appointment_id as number, item]),
      ),
    [appointmentReviewItems],
  );

  const filteredPatients = useMemo(() => {
    if (!normalizedGlobalSearch) {
      return data.patients;
    }
    return data.patients.filter((patient) => {
      const haystack = [
        patient.medical_record_number,
        patient.first_name,
        patient.last_name,
        patient.primary_phone,
        patient.national_id ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedGlobalSearch);
    });
  }, [data.patients, normalizedGlobalSearch]);

  const filteredEncounters = useMemo(() => {
    if (!normalizedGlobalSearch) {
      return data.encounters;
    }
    return data.encounters.filter((encounter) => {
      const patient = data.patients.find((item) => item.id === encounter.patient_id);
      const haystack = [
        encounter.encounter_type,
        encounter.chief_complaint,
        patient?.first_name ?? "",
        patient?.last_name ?? "",
        patient?.medical_record_number ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedGlobalSearch);
    });
  }, [data.encounters, data.patients, normalizedGlobalSearch]);

  const filteredAppointments = useMemo(() => {
    return data.appointments.filter((appointment) => {
      if (doctorFilter && String(appointment.doctor_id) !== doctorFilter) {
        return false;
      }
      if (normalizedGlobalSearch) {
        const haystack = [
          appointment.patient_name ?? "",
          appointment.doctor_name ?? "",
          appointment.reason ?? "",
          appointment.appointment_type,
          appointment.source,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedGlobalSearch)) {
          return false;
        }
      }

      const relatedDispatches = communicationDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
      const latestDispatchStatus = lastDispatchStatus(relatedDispatches);
      const needsAttention =
        appointment.confirmation_status === "pending" ||
        latestDispatchStatus === "failed" ||
        reviewQueueByAppointmentId.has(appointment.id);

      if (appointmentFilter === "ws") {
        return appointment.source === "appoint-me";
      }
      if (appointmentFilter === "confirmed") {
        return appointment.confirmation_status === "confirmed";
      }
      if (appointmentFilter === "pending_confirmation") {
        return appointment.confirmation_status === "pending";
      }
      if (appointmentFilter === "needs_attention") {
        return needsAttention;
      }
      return true;
    });
  }, [appointmentFilter, communicationDispatches, data.appointments, doctorFilter, normalizedGlobalSearch, reviewQueueByAppointmentId]);

  const agendaDays = useMemo(() => {
    if (calendarView === "dia") {
      return [startOfDay(calendarDate)];
    }
    if (calendarView === "semana") {
      const start = startOfWeek(calendarDate);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    return [];
  }, [calendarDate, calendarView]);

  const monthDays = useMemo(() => {
    if (calendarView !== "mes") {
      return [];
    }
    const start = startOfMonthGrid(calendarDate);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [calendarDate, calendarView]);

  const appointmentsByDayKey = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of filteredAppointments) {
      const dayKey = startOfDay(new Date(appointment.scheduled_start)).toISOString();
      const current = map.get(dayKey) ?? [];
      current.push(appointment);
      map.set(dayKey, current);
    }
    for (const entries of map.values()) {
      entries.sort((left, right) => new Date(left.scheduled_start).getTime() - new Date(right.scheduled_start).getTime());
    }
    return map;
  }, [filteredAppointments]);

  const paginatedActiveDoctors = useMemo(
    () => doctorRosterFilteredActiveDoctors.slice((activeDoctorPage - 1) * teamPageSize, activeDoctorPage * teamPageSize),
    [activeDoctorPage, doctorRosterFilteredActiveDoctors, teamPageSize],
  );
  const paginatedInactiveDoctors = useMemo(
    () => doctorRosterFilteredInactiveDoctors.slice((inactiveDoctorPage - 1) * teamPageSize, inactiveDoctorPage * teamPageSize),
    [inactiveDoctorPage, doctorRosterFilteredInactiveDoctors, teamPageSize],
  );

  const sortedPatientEncounters = useMemo(() => {
    if (!selectedSummary) {
      return [];
    }
    return [...selectedSummary.encounters].sort(
      (left, right) => new Date(right.encounter_date).getTime() - new Date(left.encounter_date).getTime(),
    );
  }, [selectedSummary]);

  const scopedReminderRules = useMemo(
    () =>
      reminderRules.filter((rule) => rule.is_active && (scopedDoctorId === null || rule.doctor_id === null || rule.doctor_id === scopedDoctorId)),
    [reminderRules, scopedDoctorId],
  );
  const generalReminderRule = useMemo(
    () => reminderRules.find((rule) => rule.doctor_id === null && rule.trigger_type === "before_appointment") ?? null,
    [reminderRules],
  );

  const scopedUpcomingAppointments = useMemo(() => {
    const now = Date.now();
    return data.appointments.filter((appointment) => {
      if (scopedDoctorId !== null && appointment.doctor_id !== scopedDoctorId) {
        return false;
      }
      if (appointment.status === "cancelled" || appointment.confirmation_status === "cancelled") {
        return false;
      }
      return new Date(appointment.scheduled_start).getTime() >= now;
    });
  }, [data.appointments, scopedDoctorId]);

  const confirmedUpcomingCount = scopedUpcomingAppointments.filter((appointment) => appointment.confirmation_status === "confirmed").length;
  const unconfirmedUpcomingCount = scopedUpcomingAppointments.filter((appointment) => appointment.confirmation_status !== "confirmed").length;
  const cancelledUpcomingCount = data.appointments.filter((appointment) => {
    if (scopedDoctorId !== null && appointment.doctor_id !== scopedDoctorId) {
      return false;
    }
    const startsAt = new Date(appointment.scheduled_start).getTime();
    return startsAt >= Date.now() && (appointment.status === "cancelled" || appointment.confirmation_status === "cancelled");
  }).length;
  const remindersScheduledCount = scopedReminderRules.length ? scopedUpcomingAppointments.length : 0;

  const confirmationTemplate = useMemo(
    () =>
      communicationTemplates.find(
        (template) => template.template_key === CONFIRMATION_TEMPLATE_KEY && scopedDoctorId !== null && template.doctor_id === scopedDoctorId,
      ) ??
      communicationTemplates.find((template) => template.template_key === CONFIRMATION_TEMPLATE_KEY && template.doctor_id === null) ??
      null,
    [communicationTemplates, scopedDoctorId],
  );

  return {
    agendaDays,
    appointmentsByDayKey,
    availableDoctors,
    cancelledUpcomingCount,
    confirmationTemplate,
    confirmedUpcomingCount,
    currentUserDisplay,
    doctorNameById,
    filteredAppointments,
    filteredEncounters,
    filteredPatients,
    generalReminderRule,
    hasSingleDoctorContext,
    monthDays,
    paginatedActiveDoctors,
    paginatedInactiveDoctors,
    remindersScheduledCount,
    reviewQueueByAppointmentId,
    scopedReminderRules,
    scopedUpcomingAppointments,
    selectedDoctor,
    sortedPatientEncounters,
    unconfirmedUpcomingCount,
  };
}
