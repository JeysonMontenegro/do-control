export type AppointmentCard = {
  id: number;
  public_id: string;
  doctor_name: string;
  doctor_title: string | null;
  doctor_specialty: string | null;
  scheduled_start: string;
  scheduled_end: string;
  appointment_type: string;
  reason: string | null;
  status: string;
  confirmation_status: string;
  status_label: string;
  clinic_name: string | null;
  clinic_address: string | null;
  clinic_latitude: number | null;
  clinic_longitude: number | null;
  clinic_phone: string | null;
};

const BACKEND_URL = process.env.DO_CONTROL_API_URL ?? "http://backend:8000";

export async function fetchAppointmentCard(appointmentId: string): Promise<AppointmentCard | null> {
  const response = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/api/public/appointments/${appointmentId}/card`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load appointment card ${appointmentId}: ${response.status}`);
  }

  return (await response.json()) as AppointmentCard;
}

export function formatAppointmentKind(value: string) {
  const normalizedValue = value.trim().toLowerCase();
  const directMap: Record<string, string> = {
    follow_up: "Seguimiento",
    first_visit: "Primera consulta",
    first_consultation: "Primera consulta",
    control: "Control",
    exam_review: "Revisión de exámenes",
    emergency: "Urgencia",
    procedure: "Procedimiento",
    checkup: "Chequeo",
    virtual_consultation: "Consulta virtual",
  };

  if (directMap[normalizedValue]) {
    return directMap[normalizedValue];
  }

  return normalizedValue
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function formatPatientFacingStatus(value: string) {
  const directMap: Record<string, string> = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    pending: "Por confirmar",
  };
  return directMap[value] ?? value;
}

export function formatAppointmentDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Guatemala",
  }).format(new Date(value));
}

export function formatAppointmentTime(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("es-GT", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Guatemala",
  });
  return `${formatter.format(new Date(start))} a ${formatter.format(new Date(end))}`;
}

export function buildGoogleMapsUrl(card: AppointmentCard) {
  if (card.clinic_latitude != null && card.clinic_longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${card.clinic_latitude},${card.clinic_longitude}`)}`;
  }
  if (card.clinic_address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.clinic_address.trim())}`;
  }
  return null;
}

function formatCalendarDate(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}${pick("month")}${pick("day")}T${pick("hour")}${pick("minute")}${pick("second")}Z`;
}

export function buildGoogleCalendarUrl(card: AppointmentCard) {
  const text = `${formatAppointmentKind(card.appointment_type)} con ${[card.doctor_title?.trim(), card.doctor_name].filter(Boolean).join(" ")}`;
  const details = [
    card.reason?.trim() ? `Motivo: ${card.reason.trim()}` : null,
    card.clinic_name?.trim() ? `Clínica: ${card.clinic_name.trim()}` : null,
    card.clinic_address?.trim() ? `Dirección: ${card.clinic_address.trim()}` : null,
    card.clinic_phone?.trim() ? `Teléfono: ${card.clinic_phone.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    dates: `${formatCalendarDate(card.scheduled_start)}/${formatCalendarDate(card.scheduled_end)}`,
    details,
    location: card.clinic_address?.trim() || card.clinic_name?.trim() || "Do-Control",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
