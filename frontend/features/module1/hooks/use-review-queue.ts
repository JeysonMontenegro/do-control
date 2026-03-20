"use client";

import { FormEvent, useMemo, useState } from "react";

import { createReviewResolutionForm } from "@/features/module1/clinical-console-defaults";
import { formatDateTime } from "@/features/module1/console-utils";
import { normalizeComparableText } from "@/features/module1/review-utils";
import { apiPost } from "@/lib/api";
import type {
  Appointment,
  AppointmentReviewItem,
  Patient,
} from "@/features/module1/types";

type ReviewResolutionAction = "reject" | "link_existing" | "create_appointment";
type ReviewResolutionForm = {
  action: ReviewResolutionAction;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  note: string;
};

type UseReviewQueueParams = {
  appointmentReviewItems: AppointmentReviewItem[];
  appointments: Appointment[];
  currentUserEmail: string;
  patients: Patient[];
  selectedPatientId: string;
  setMessage: (message: string) => void;
  onResolved: () => Promise<void>;
};

export function useReviewQueue({
  appointmentReviewItems,
  appointments,
  currentUserEmail,
  patients,
  selectedPatientId,
  setMessage,
  onResolved,
}: UseReviewQueueParams) {
  const [activeReviewItemId, setActiveReviewItemId] = useState<number | null>(null);
  const [reviewResolutionForm, setReviewResolutionForm] = useState<ReviewResolutionForm>(createReviewResolutionForm);

  const activeReviewItem = useMemo(
    () => appointmentReviewItems.find((item) => item.id === activeReviewItemId) ?? null,
    [activeReviewItemId, appointmentReviewItems],
  );

  const reviewPatientOptions = useMemo(() => {
    if (!activeReviewItem) {
      return [];
    }

    const normalizedRequestedName = normalizeComparableText(activeReviewItem.patient_name);
    return patients.filter((patient) => {
      const patientName = normalizeComparableText(`${patient.first_name} ${patient.last_name}`);
      return (
        patient.primary_phone === activeReviewItem.phone_number ||
        patientName.includes(normalizedRequestedName) ||
        normalizedRequestedName.includes(patientName)
      );
    });
  }, [activeReviewItem, patients]);

  const reviewAppointmentOptions = useMemo(() => {
    if (!activeReviewItem) {
      return [];
    }

    return appointments.filter((appointment) => {
      if (activeReviewItem.doctor_id !== null && appointment.doctor_id !== activeReviewItem.doctor_id) {
        return false;
      }
      if (
        activeReviewItem.existing_appointment_id !== null &&
        appointment.id === activeReviewItem.existing_appointment_id
      ) {
        return true;
      }

      const patientName = (appointment.patient_name ?? "").toLowerCase();
      return (
        patientName.includes(activeReviewItem.patient_name.toLowerCase()) ||
        formatDateTime(appointment.scheduled_start) === formatDateTime(activeReviewItem.scheduled_start)
      );
    });
  }, [activeReviewItem, appointments]);

  function closeReviewResolutionModal() {
    setActiveReviewItemId(null);
    setReviewResolutionForm(createReviewResolutionForm());
  }

  function resolveReviewItem(itemId: number, action: ReviewResolutionAction) {
    const item = appointmentReviewItems.find((entry) => entry.id === itemId);
    if (!item) {
      setMessage("No se encontró el pendiente seleccionado.");
      return;
    }

    const normalizedRequestedName = normalizeComparableText(item.patient_name);
    const matchingPatients = patients.filter((patient) => {
      const patientName = normalizeComparableText(`${patient.first_name} ${patient.last_name}`);
      return (
        patient.primary_phone === item.phone_number ||
        patientName.includes(normalizedRequestedName) ||
        normalizedRequestedName.includes(patientName)
      );
    });

    const suggestedPatientId = matchingPatients[0]?.id ?? (selectedPatientId ? Number(selectedPatientId) : null);
    const suggestedAppointmentId =
      item.existing_appointment_id ??
      appointments.find(
        (appointment) =>
          (item.doctor_id === null || appointment.doctor_id === item.doctor_id) &&
          (appointment.patient_name ?? "").toLowerCase().includes(item.patient_name.toLowerCase()),
      )?.id ??
      null;

    setReviewResolutionForm({
      action,
      patient_id: action === "create_appointment" && suggestedPatientId ? String(suggestedPatientId) : "",
      doctor_id: item.doctor_id ? String(item.doctor_id) : "",
      appointment_id: action === "link_existing" && suggestedAppointmentId ? String(suggestedAppointmentId) : "",
      note:
        action === "reject"
          ? "Rechazado manualmente"
          : item.review_reason === "reschedule_request"
            ? "Solicitud de reagendar atendida manualmente."
            : "",
    });
    setActiveReviewItemId(itemId);
  }

  async function submitReviewResolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeReviewItem) {
      return;
    }

    setMessage("");
    try {
      const payload: Record<string, string | number> = {
        action: reviewResolutionForm.action,
        changed_by: currentUserEmail || "frontend-user",
      };

      if (reviewResolutionForm.action === "create_appointment") {
        if (!reviewResolutionForm.patient_id) {
          setMessage("Selecciona un paciente para crear la cita.");
          return;
        }
        payload.patient_id = Number(reviewResolutionForm.patient_id);
        if (!activeReviewItem.doctor_id) {
          if (!reviewResolutionForm.doctor_id) {
            setMessage("Selecciona el doctor para esta resolución.");
            return;
          }
          payload.doctor_id = Number(reviewResolutionForm.doctor_id);
        }
      }

      if (reviewResolutionForm.action === "link_existing") {
        if (!reviewResolutionForm.appointment_id) {
          setMessage("Selecciona una cita existente para vincular.");
          return;
        }
        payload.appointment_id = Number(reviewResolutionForm.appointment_id);
      }

      if (reviewResolutionForm.note.trim()) {
        payload.note = reviewResolutionForm.note.trim();
      }

      await apiPost(`/api/appointment-review-items/${activeReviewItem.id}/resolve`, payload);
      closeReviewResolutionModal();
      await onResolved();
      setMessage("Pendiente actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo resolver el pendiente.");
    }
  }

  return {
    activeReviewItem,
    activeReviewItemId,
    closeReviewResolutionModal,
    resolveReviewItem,
    reviewAppointmentOptions,
    reviewPatientOptions,
    reviewResolutionForm,
    setReviewResolutionForm,
    submitReviewResolution,
  };
}
