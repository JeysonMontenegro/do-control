"use client";

import { confirmationLabel, formatDateTime, reviewReasonLabel } from "@/features/module1/console-utils";
import type { Appointment, AppointmentReviewItem } from "@/features/module1/types";

type PendingReviewSectionProps = {
  appointmentReviewItems: AppointmentReviewItem[];
  attentionAppointments: Appointment[];
  onGoToAgendaAppointment: (appointmentId: number) => void;
  renderAppointmentBadges: (appointment: Appointment) => React.ReactNode;
  resolveReviewItem: (itemId: number, action: "create_appointment" | "link_existing" | "reject") => void;
  reviewGroups: Array<{
    key: string;
    title: string;
    description: string;
    items: AppointmentReviewItem[];
  }>;
};

export function PendingReviewSection({
  appointmentReviewItems,
  attentionAppointments,
  onGoToAgendaAppointment,
  renderAppointmentBadges,
  resolveReviewItem,
  reviewGroups,
}: PendingReviewSectionProps) {
  return (
    <section className="tab-layout">
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2>Centro de seguimiento operativo</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card">
            <strong>{appointmentReviewItems.length}</strong>
            <span>Solicitudes por resolver</span>
          </div>
          <div className="metric-card">
            <strong>{appointmentReviewItems.filter((item) => item.review_reason === "reschedule_request").length}</strong>
            <span>Solicitudes de reagendar</span>
          </div>
          <div className="metric-card">
            <strong>{appointmentReviewItems.filter((item) => item.review_reason !== "reschedule_request").length}</strong>
            <span>Casos por validar</span>
          </div>
          <div className="metric-card">
            <strong>{attentionAppointments.length}</strong>
            <span>Citas con seguimiento hoy</span>
          </div>
        </div>
        <div className="detail-panel">
          <strong>Qué ves aquí</strong>
          <span>Esta bandeja reúne solicitudes que no se resolvieron automáticamente y citas que siguen abiertas por confirmar o con problemas de comunicación.</span>
        </div>
      </article>
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Solicitudes</p>
            <h2>Casos que requieren decisión</h2>
          </div>
        </div>
        <div className="stack-block">
          {reviewGroups.length ? (
            reviewGroups.map((group) => (
              <section className="review-queue-group" key={group.key}>
                <div className="review-queue-group-header">
                  <div>
                    <strong>{group.title}</strong>
                    <span>{group.description}</span>
                  </div>
                  <span className="context-pill">{group.items.length} caso{group.items.length === 1 ? "" : "s"}</span>
                </div>
                <div className="table-list">
                  {group.items.map((item) => (
                    <div className="review-queue-item" key={`review-item-${item.id}`}>
                      <div className="review-queue-head">
                        <div>
                          <strong>{item.patient_name}</strong>
                          <span>{item.doctor_name ?? item.doctor_phone_number ?? "Doctor pendiente"}</span>
                        </div>
                        <div className="inline-badges">
                          <span className="badge badge-neutral">{reviewReasonLabel(item.review_reason)}</span>
                          <span className="badge badge-neutral">{item.source === "appoint-me" ? "WhatsApp" : item.source}</span>
                        </div>
                      </div>
                      <div className="review-meta-grid">
                        <span><strong>Fecha solicitada:</strong> {formatDateTime(item.scheduled_start)}</span>
                        <span><strong>Contacto:</strong> {item.phone_number || "Sin teléfono"}</span>
                      </div>
                      <p className="review-message">{item.review_message}</p>
                      <div className="row-actions">
                        <button type="button" className="success-button" onClick={() => resolveReviewItem(item.id, "create_appointment")}>
                          Crear cita
                        </button>
                        <button type="button" className="success-button" onClick={() => resolveReviewItem(item.id, "link_existing")}>
                          Vincular cita
                        </button>
                        <button type="button" className="danger-button" onClick={() => resolveReviewItem(item.id, "reject")}>
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <p className="empty-state">No hay solicitudes pendientes de revisión manual.</p>
          )}
        </div>
      </article>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Agenda sensible</p>
            <h2>Citas que necesitan seguimiento</h2>
          </div>
        </div>
        <div className="detail-panel compact-panel">
          <strong>Qué revisar primero</strong>
          <span>Empieza por citas sin confirmar, mensajes fallidos y citas que ya tienen una solicitud de revisión ligada.</span>
        </div>
        <div className="table-list">
          {attentionAppointments.length ? (
            attentionAppointments.map((appointment) => (
              <button
                type="button"
                className="simple-list-item review-followup-item"
                key={`attention-appointment-${appointment.id}`}
                onClick={() => onGoToAgendaAppointment(appointment.id)}
              >
                <strong>{appointment.patient_name ?? `Paciente ${appointment.patient_id}`}</strong>
                <span>{appointment.doctor_name ?? `Doctor ${appointment.doctor_id}`}</span>
                <span>{formatDateTime(appointment.scheduled_start)}</span>
                <span>{confirmationLabel(appointment.confirmation_status)}</span>
                {renderAppointmentBadges(appointment)}
              </button>
            ))
          ) : (
            <p className="empty-state">No hay citas marcadas con seguimiento especial.</p>
          )}
        </div>
      </article>
    </section>
  );
}
