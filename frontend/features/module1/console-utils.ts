import type { Appointment, AppointmentReviewItem, CommunicationDispatch } from "@/features/module1/types";
import type { CalendarView } from "@/features/module1/console-config";

export const nowPlusMinutes = (minutes: number) => {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  return date.toISOString().slice(0, 16);
};

export const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Sin fecha";
  }
  return new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const formatDate = (value: string | Date) =>
  new Intl.DateTimeFormat("es-GT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(typeof value === "string" ? new Date(value) : value);

export const formatTime = (value: string | Date) =>
  new Intl.DateTimeFormat("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(typeof value === "string" ? new Date(value) : value);

export const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const addDays = (date: Date, days: number) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

export const startOfWeek = (date: Date) => {
  const base = startOfDay(date);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(base, diff);
};

export const startOfMonthGrid = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfWeek(first);
};

export const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const appointmentStatusLabel = (value: string) => {
  const labels: Record<string, string> = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    completed: "Completada",
    pending: "Pendiente",
    open: "Abierta",
    closed: "Cerrada",
  };
  return labels[value] ?? value;
};

export const appointmentTypeLabel = (value: string) => {
  const labels: Record<string, string> = {
    first_consultation: "Primera consulta",
    follow_up: "Seguimiento",
    checkup: "Chequeo",
    procedure: "Procedimiento",
    virtual_consultation: "Consulta virtual",
  };
  return labels[value] ?? value.replaceAll("_", " ");
};

export const encounterTypeLabel = (value: string) => {
  const labels: Record<string, string> = {
    general_consultation: "Consulta general",
    emergency_consultation: "Consulta de emergencia",
    follow_up: "Seguimiento",
    procedure: "Procedimiento",
    post_op_follow_up: "Seguimiento postoperatorio",
  };
  return labels[value] ?? value.replaceAll("_", " ");
};

export const dispatchStatusLabel = (value: string) => {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    sent: "Enviado",
    delivered: "Entregado",
    failed: "Fallido",
  };
  return labels[value] ?? value.replaceAll("_", " ");
};

export const communicationKindLabel = (dispatch: CommunicationDispatch) => {
  const content = `${dispatch.template_title ?? ""} ${dispatch.template_key ?? ""} ${dispatch.rendered_message ?? ""}`.toLowerCase();
  if (content.includes("cancel")) {
    return "Cancelación";
  }
  if (content.includes("confirm")) {
    return "Confirmación";
  }
  if (content.includes("record") || content.includes("reminder") || content.includes("cita")) {
    return "Recordatorio";
  }
  return "Comunicación";
};

export const confirmationLabel = (value: string) => {
  const labels: Record<string, string> = {
    pending: "Pendiente de confirmar",
    confirmed: "Confirmada",
    declined: "Rechazada",
    cancelled: "Cancelada",
  };
  return labels[value] ?? value;
};

export const reminderLeadTimeLabel = (minutesBefore: number) => {
  if (minutesBefore % (24 * 60) === 0) {
    const days = minutesBefore / (24 * 60);
    return days === 1 ? "24 horas antes" : `${days} días antes`;
  }
  if (minutesBefore % 60 === 0) {
    const hours = minutesBefore / 60;
    return hours === 1 ? "1 hora antes" : `${hours} horas antes`;
  }
  return `${minutesBefore} minutos antes`;
};

export const reviewReasonLabel = (value: string) => {
  const labels: Record<string, string> = {
    doctor_resolution: "Resolver doctor",
    patient_resolution: "Resolver paciente",
    validation_rejected: "Validación rechazada",
    reschedule_request: "Solicitud de reagendar",
  };
  return labels[value] ?? value.replaceAll("_", " ");
};

export const sourceLabel = (value: string) => {
  if (value === "appoint-me") {
    return "WhatsApp";
  }
  if (value === "receptionist") {
    return "Recepción";
  }
  return value;
};

export const calendarRangeLabel = (view: CalendarView, anchorDate: Date) => {
  if (view === "dia") {
    return new Intl.DateTimeFormat("es-GT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(anchorDate);
  }
  if (view === "semana") {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = addDays(weekStart, 6);
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  }
  return new Intl.DateTimeFormat("es-GT", {
    month: "long",
    year: "numeric",
  }).format(anchorDate);
};

export const lastDispatchStatus = (dispatches: CommunicationDispatch[]) => {
  if (!dispatches.length) {
    return null;
  }
  return [...dispatches]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0]
    .status;
};

export function hasAnyRole(currentRoles: string[], allowedRoles: string[]) {
  return allowedRoles.some((role) => currentRoles.includes(role));
}

export const getAppointmentEventClassName = (appointment: Appointment) => {
  if (appointment.status === "cancelled") {
    return "cancelled";
  }
  if (appointment.confirmation_status === "confirmed") {
    return "confirmed";
  }
  if (appointment.source === "appoint-me") {
    return "ws";
  }
  return "default";
};

export const getConfirmationBadgeClassName = (confirmationStatus: string) => {
  if (confirmationStatus === "cancelled") {
    return "badge-danger";
  }
  if (confirmationStatus === "confirmed") {
    return "badge-success";
  }
  if (confirmationStatus === "pending") {
    return "badge-warn";
  }
  return "badge-neutral";
};

export const getReviewBadgeConfig = (reviewItem: AppointmentReviewItem | undefined) => {
  if (!reviewItem) {
    return null;
  }
  if (reviewItem.review_reason === "reschedule_request") {
    return { className: "badge-accent", label: "Reagendar solicitado" };
  }
  return { className: "badge-danger", label: "Revisión manual" };
};
