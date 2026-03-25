import { ImageResponse } from "next/og";

import { fetchAppointmentCard, formatAppointmentDate, formatAppointmentKind, formatAppointmentTime } from "./card-data";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function statusColors(statusLabel: string) {
  if (statusLabel === "Confirmada") {
    return { background: "#dff5e8", color: "#177a68" };
  }
  if (statusLabel === "Cancelada") {
    return { background: "#fde9e5", color: "#b54434" };
  }
  return { background: "#fff0d1", color: "#9a5f00" };
}

export default async function OpenGraphImage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const card = await fetchAppointmentCard(appointmentId);

  const colors = statusColors(card?.status_label ?? "Por confirmar");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(145deg, #f5fbfc 0%, #e3eef7 100%)",
          color: "#18314a",
          padding: "40px",
          fontFamily: "Segoe UI",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            borderRadius: "34px",
            border: "1px solid rgba(24, 49, 74, 0.08)",
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 28px 64px rgba(18, 43, 68, 0.12)",
            padding: "42px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "760px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#0f6c78", fontSize: 24, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {card?.clinic_name ?? "Do-Control"}
              </div>
              <div style={{ display: "flex", fontSize: 56, fontWeight: 800, lineHeight: 1.02 }}>
                Detalles de tu cita
              </div>
              <div style={{ display: "flex", fontSize: 30, color: "#51697f" }}>
                {card ? `${formatAppointmentDate(card.scheduled_start)} · ${formatAppointmentTime(card.scheduled_start, card.scheduled_end)}` : "Consulta la información esencial de tu cita"}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "220px",
                minHeight: "68px",
                borderRadius: "999px",
                background: colors.background,
                color: colors.color,
                fontSize: 28,
                fontWeight: 800,
                padding: "0 24px",
              }}
            >
              {card?.status_label ?? "No disponible"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "18px" }}>
            <CardBlock label="Doctor" value={card?.doctor_name ?? "No encontrado"} supporting={card?.doctor_specialty ?? "Especialidad no disponible"} />
            <CardBlock label="Tipo" value={card ? formatAppointmentKind(card.appointment_type) : "No disponible"} supporting={card?.reason ?? "Motivo no especificado"} />
            <CardBlock label="Ubicación" value={card?.clinic_address ?? "Dirección no disponible"} supporting={card?.clinic_phone ?? "Teléfono no disponible"} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function CardBlock({ label, value, supporting }: { label: string; value: string; supporting: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flex: 1,
        borderRadius: "24px",
        background: "#f5f9ff",
        border: "1px solid rgba(24, 49, 74, 0.08)",
        padding: "22px",
      }}
    >
      <div style={{ display: "flex", fontSize: 20, color: "#5c748c", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 32, fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 24, color: "#51697f", lineHeight: 1.25 }}>{supporting}</div>
    </div>
  );
}
