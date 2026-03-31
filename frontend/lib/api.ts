export const API_URL = "/api/proxy";

const SESSION_STORAGE_KEYS = [
  "docontrol_token",
  "docontrol_user_email",
  "docontrol_user_first_name",
  "docontrol_user_last_name",
  "docontrol_user_display_name",
  "docontrol_user_gender",
  "docontrol_user_phone_number",
  "docontrol_user_roles",
  "docontrol_user_profile_photo_url",
];

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("docontrol_token");
}

function buildAuthHeaders(): Headers {
  const token = getToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

function mergeHeaders(...headersList: Array<HeadersInit | undefined>): Headers {
  const merged = new Headers();

  for (const headers of headersList) {
    if (!headers) {
      continue;
    }
    const current = new Headers(headers);
    current.forEach((value, key) => {
      merged.set(key, value);
    });
  }

  return merged;
}

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }
  for (const key of SESSION_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

function extractErrorText(body: string): string {
  try {
    const parsed = JSON.parse(body) as { detail?: unknown; message?: unknown };
    if (typeof parsed.detail === "string") {
      return parsed.detail;
    }
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (item && typeof item === "object" && "msg" in item && typeof item.msg === "string") {
            return item.msg;
          }
          return null;
        })
        .filter(Boolean)
        .join(". ");
    }
    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    // Fall back to the raw body text when the response is not JSON.
  }
  return body;
}

function toFriendlyErrorMessage(rawMessage: string, status: number): string {
  const message = rawMessage.trim();
  if (!message) {
    return "No se pudo completar la solicitud. Intenta nuevamente.";
  }
  if (message.includes("Invalid token")) {
    return "Tu sesión expiró. Ingresa nuevamente.";
  }
  if (message.includes("Invalid credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("A user with that email already exists")) {
    return "Ya existe una cuenta con ese correo. Usa otro correo o edita el registro existente.";
  }
  if (message.includes("That phone number is already in use")) {
    return "Ese número de teléfono ya está en uso. Verifica el dato o usa otro número.";
  }
  if (message.includes("Patient is not assigned to the selected doctor")) {
    return "El paciente no está asignado al doctor seleccionado.";
  }
  if (message.includes("Appointment does not belong to the selected doctor")) {
    return "La cita seleccionada no pertenece al doctor elegido.";
  }
  if (message.includes("Appointment already has an encounter")) {
    return "La cita seleccionada ya tiene una consulta asociada.";
  }
  if (message.includes("Cannot create patients for an inactive doctor")) {
    return "No se pueden crear pacientes para un doctor inactivo.";
  }
  if (message.includes("Cannot create appointments for an inactive doctor")) {
    return "No se pueden crear citas para un doctor inactivo.";
  }
  if (message.includes("Cannot create encounters for an inactive doctor")) {
    return "No se pueden registrar consultas para un doctor inactivo.";
  }
  if (message.includes("Encounter does not belong to the selected patient")) {
    return "La consulta seleccionada no pertenece al paciente elegido.";
  }
  if (message.includes("Attachment content is required")) {
    return "Debes seleccionar un archivo antes de adjuntarlo.";
  }
  if (message.includes("Doctor login password is required")) {
    return "Debes ingresar una contraseña para crear el acceso del doctor.";
  }
  if (message.includes("Current password is invalid")) {
    return "La contraseña actual no es correcta.";
  }
  if (message.includes("Current password is required")) {
    return "Debes escribir tu contraseña actual para hacer este cambio.";
  }
  if (message.includes("reCAPTCHA")) {
    return "No se pudo validar la seguridad del formulario. Intenta nuevamente.";
  }
  if (message.includes("Patient does not have a primary phone number")) {
    return "El paciente no tiene un teléfono principal registrado.";
  }
  if (message.includes("Doctor id is required")) {
    return "Debes seleccionar un doctor para abrir este inbox.";
  }
  if (message.includes("You do not have doctor inbox access")) {
    return "Tu usuario no tiene acceso al inbox de doctores.";
  }
  if (message.includes("You do not have access to that doctor inbox")) {
    return "No tienes acceso al inbox de ese doctor.";
  }
  if (message.includes("La integración de WhatsApp no está configurada")) {
    return "La integración de WhatsApp todavía no está configurada.";
  }
  if (message.includes("No se pudo conectar con la integración de WhatsApp")) {
    return "No se pudo conectar con WhatsApp en este momento.";
  }
  if (message.includes("Cannot send reminders for a cancelled appointment")) {
    return "No se puede enviar un recordatorio para una cita cancelada.";
  }
  if (message.includes("No hay una plantilla activa de recordatorio")) {
    return "No hay una plantilla activa de recordatorio para este caso.";
  }
  if (message.includes("Debe indicar doctor_id o doctor_phone_number")) {
    return "Debes indicar el doctor para continuar.";
  }
  if (message.includes("Debe especificar el doctor")) {
    return "Debes elegir el doctor antes de continuar.";
  }
  if (status >= 500) {
    return "Ocurrió un problema interno. Intenta nuevamente en unos minutos.";
  }
  return message;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    if (response.status === 401 && body.includes("Invalid token")) {
      clearStoredSession();
      throw new Error("Tu sesión expiró. Ingresa nuevamente.");
    }
    throw new Error(toFriendlyErrorMessage(extractErrorText(body), response.status));
  }

  return response.json() as Promise<T>;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: mergeHeaders(buildAuthHeaders(), init?.headers),
  });

  return parseResponse<T>(response);
}

function buildJsonRequestInit(method: "POST" | "PATCH" | "PUT" | "DELETE", payload?: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  return apiRequest<T>(path, buildJsonRequestInit("POST", payload));
}

export async function apiPostForm<T>(path: string, payload: FormData): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: payload,
  });
}

export async function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  return apiRequest<T>(path, buildJsonRequestInit("PATCH", payload));
}

export async function apiPut<T>(path: string, payload: unknown): Promise<T> {
  return apiRequest<T>(path, buildJsonRequestInit("PUT", payload));
}

export async function apiDelete<T>(path: string, payload?: unknown): Promise<T> {
  return apiRequest<T>(path, buildJsonRequestInit("DELETE", payload));
}
