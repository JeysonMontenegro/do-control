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

export async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<T>(response);
}

export async function apiPatch<T>(path: string, payload: unknown): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<T>(response);
}
