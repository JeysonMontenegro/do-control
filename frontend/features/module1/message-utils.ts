export const getMessageTone = (message: string): "success" | "error" | "info" | "warning" => {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("no se pudo") ||
    normalized.includes("incorrect") ||
    normalized.includes("inválid") ||
    normalized.includes("invalid") ||
    normalized.includes("expiró") ||
    normalized.includes("ya existe") ||
    normalized.includes("ya está en uso") ||
    normalized.includes("error") ||
    normalized.includes("debes ") ||
    normalized.includes("debe ") ||
    normalized.includes("selecciona ") ||
    normalized.includes("ingresa ")
  ) {
    return "error";
  }
  if (normalized.includes("cargando")) {
    return "info";
  }
  if (normalized.includes("sin ") || normalized.includes("no hay")) {
    return "warning";
  }
  return "success";
};
