import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchAppointmentCard,
  formatAppointmentDate,
  formatAppointmentKind,
  formatAppointmentTime,
  formatPatientFacingStatus,
} from "./card-data";

const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://docontrol.app";

function statusTone(statusLabel: string) {
  if (statusLabel === "Confirmada") {
    return "appointment-card-status-confirmed";
  }
  if (statusLabel === "Cancelada") {
    return "appointment-card-status-cancelled";
  }
  return "appointment-card-status-pending";
}

export async function generateMetadata({ params }: { params: Promise<{ appointmentId: string }> }): Promise<Metadata> {
  const { appointmentId } = await params;
  const card = await fetchAppointmentCard(appointmentId);

  if (!card) {
    return {
      title: "Cita no encontrada | Do-Control",
      description: "No encontramos la cita solicitada.",
    };
  }

  const title = `${card.status_label} con ${card.doctor_name}`;
  const description = `${formatAppointmentDate(card.scheduled_start)} · ${formatAppointmentTime(card.scheduled_start, card.scheduled_end)} · ${formatAppointmentKind(card.appointment_type)}`;
  const url = `${PUBLIC_BASE_URL.replace(/\/$/, "")}/c/${appointmentId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [{ url: `${url}/opengraph-image` }],
      siteName: "Do-Control",
      type: "website",
      locale: "es_GT",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicAppointmentPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  const card = await fetchAppointmentCard(appointmentId);

  if (!card) {
    notFound();
  }

  return (
    <main className="public-appointment-page">
      <section className="public-appointment-shell">
        <header className="public-appointment-header">
          <span className="public-appointment-eyebrow">{card.clinic_name ?? "Do-Control"}</span>
          <h1>Detalles de tu cita</h1>
          <p>Consulta aquí la información esencial de tu próxima atención.</p>
        </header>

        <article className="public-appointment-card">
          <div className="public-appointment-topline">
            <div>
              <span className="public-appointment-label">Profesional</span>
              <strong>{card.doctor_name}</strong>
              {card.doctor_specialty ? <small>{card.doctor_specialty}</small> : null}
            </div>
            <span className={`public-appointment-status ${statusTone(card.status_label)}`}>{card.status_label}</span>
          </div>

          <dl className="public-appointment-grid">
            <div>
              <dt>Fecha</dt>
              <dd>{formatAppointmentDate(card.scheduled_start)}</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd>{formatAppointmentTime(card.scheduled_start, card.scheduled_end)}</dd>
            </div>
            <div>
              <dt>Tipo de cita</dt>
              <dd>{formatAppointmentKind(card.appointment_type)}</dd>
            </div>
            <div>
              <dt>Estado de la cita</dt>
              <dd>{formatPatientFacingStatus(card.status)}</dd>
            </div>
            <div className="public-appointment-grid-wide">
              <dt>Motivo de la cita</dt>
              <dd>{card.reason || "No especificado"}</dd>
            </div>
            <div className="public-appointment-grid-wide">
              <dt>Dirección</dt>
              <dd>{card.clinic_address || "Dirección no disponible"}</dd>
            </div>
            <div className="public-appointment-grid-wide">
              <dt>Teléfono de contacto</dt>
              <dd>{card.clinic_phone || "Teléfono no disponible"}</dd>
            </div>
          </dl>
        </article>
      </section>
    </main>
  );
}
