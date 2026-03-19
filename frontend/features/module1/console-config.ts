export type ConsoleTab = "agenda" | "doctores" | "pacientes" | "consultas" | "mensajes" | "pendientes" | "gestion";
export type CalendarView = "dia" | "semana" | "mes";

export const consoleTabs: Array<{ id: ConsoleTab; label: string }> = [
  { id: "agenda", label: "Agenda" },
  { id: "doctores", label: "Doctores" },
  { id: "pacientes", label: "Pacientes" },
  { id: "consultas", label: "Consultas" },
  { id: "mensajes", label: "Mensajes" },
  { id: "pendientes", label: "Seguimiento" },
  { id: "gestion", label: "Configuración" },
];

export const slotLabels = Array.from({ length: 29 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});

export const CONFIRMATION_TEMPLATE_KEY = "appointment_confirmation_doctor";
export const DEFAULT_CONFIRMATION_TITLE = "Confirmación de cita";
export const DEFAULT_CONFIRMATION_BODY =
  "Hola {patient_name}, te saludamos de la clínica del doctor {doctor_name}. Solicitamos tu confirmación para tu cita el día de mañana a las {appointment_time}. Por favor responde con SI si asistirás, NO si no asistirás, o RECALENDAR si deseas agendar nuevamente otro día y horario sujeto a disponibilidad.";
