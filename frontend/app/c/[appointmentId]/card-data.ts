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
  const directMap: Record<string, string> = {
    follow_up: "Seguimiento",
    first_visit: "Primera consulta",
    control: "Control",
    exam_review: "Revisión de exámenes",
    emergency: "Urgencia",
  };

  if (directMap[value]) {
    return directMap[value];
  }

  return value
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
