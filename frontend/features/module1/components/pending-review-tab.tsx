"use client";

import { lastDispatchStatus } from "@/features/module1/console-utils";
import { PendingReviewSection } from "@/features/module1/components/pending-review-section";
import type { Appointment, AppointmentReviewItem, CommunicationDispatch } from "@/features/module1/types";

type PendingReviewTabProps = {
  appointmentReviewItems: AppointmentReviewItem[];
  communicationDispatches: CommunicationDispatch[];
  filteredAppointments: Appointment[];
  onGoToAgendaAppointment: (appointmentId: number) => void;
  renderAppointmentBadges: (appointment: Appointment) => React.ReactNode;
  reviewQueueByAppointmentId: Map<number, AppointmentReviewItem>;
  resolveReviewItem: (itemId: number, action: "create_appointment" | "link_existing" | "reject") => void;
};

export function PendingReviewTab({
  appointmentReviewItems,
  communicationDispatches,
  filteredAppointments,
  onGoToAgendaAppointment,
  renderAppointmentBadges,
  reviewQueueByAppointmentId,
  resolveReviewItem,
}: PendingReviewTabProps) {
  const attentionAppointments = filteredAppointments.filter((appointment) => {
    const relatedDispatches = communicationDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
    return (
      appointment.confirmation_status === "pending" ||
      lastDispatchStatus(relatedDispatches) === "failed" ||
      reviewQueueByAppointmentId.has(appointment.id)
    );
  });

  const sortedReviewItems = [...appointmentReviewItems].sort(
    (left, right) => new Date(left.scheduled_start).getTime() - new Date(right.scheduled_start).getTime(),
  );

  const reviewGroups = [
    {
      key: "reschedule_request",
      title: "Solicitudes de reagendar",
      description: "Pacientes que pidieron cambiar dia u hora y necesitan una nueva propuesta.",
      items: sortedReviewItems.filter((item) => item.review_reason === "reschedule_request"),
    },
    {
      key: "patient_resolution",
      title: "Pacientes por identificar",
      description: "Casos donde todavia hay que confirmar a que paciente corresponde la solicitud.",
      items: sortedReviewItems.filter((item) => item.review_reason === "patient_resolution"),
    },
    {
      key: "doctor_resolution",
      title: "Doctor por resolver",
      description: "Solicitudes donde falta definir el doctor correcto antes de crear o vincular la cita.",
      items: sortedReviewItems.filter((item) => item.review_reason === "doctor_resolution"),
    },
    {
      key: "validation_rejected",
      title: "Casos rechazados por validacion",
      description: "Mensajes que no pasaron las reglas automaticas y necesitan revision humana.",
      items: sortedReviewItems.filter((item) => item.review_reason === "validation_rejected"),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <PendingReviewSection
      appointmentReviewItems={appointmentReviewItems}
      attentionAppointments={attentionAppointments}
      onGoToAgendaAppointment={onGoToAgendaAppointment}
      renderAppointmentBadges={renderAppointmentBadges}
      resolveReviewItem={resolveReviewItem}
      reviewGroups={reviewGroups}
    />
  );
}
