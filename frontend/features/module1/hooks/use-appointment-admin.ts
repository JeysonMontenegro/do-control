"use client";

import { FormEvent, useState } from "react";

import { createAppointmentForm } from "@/features/module1/clinical-console-defaults";
import { appointmentStatusLabel, combineDisplayDateTimeToIso } from "@/features/module1/console-utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Appointment, AppointmentHistory, CommunicationDispatch, PatientSummary } from "@/features/module1/types";

type AppointmentForm = ReturnType<typeof createAppointmentForm>;

type UseAppointmentAdminParams = {
  loadData: () => Promise<void>;
  scopedDoctorId: number | null;
  selectedPatientId: string;
  setMessage: (message: string) => void;
  setSelectedPatientId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSummary: React.Dispatch<React.SetStateAction<PatientSummary | null>>;
};

export function useAppointmentAdmin({
  loadData,
  scopedDoctorId,
  selectedPatientId,
  setMessage,
  setSelectedPatientId,
  setSelectedSummary,
}: UseAppointmentAdminParams) {
  const [appointmentDispatches, setAppointmentDispatches] = useState<Record<number, CommunicationDispatch[]>>({});
  const [appointmentFilter, setAppointmentFilter] = useState<
    "all" | "ws" | "confirmed" | "pending_confirmation" | "needs_attention"
  >("all");
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>(createAppointmentForm);
  const [appointmentHistory, setAppointmentHistory] = useState<Record<number, AppointmentHistory[]>>({});
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<number | null>(null);

  async function refreshSelectedSummary() {
    if (!selectedPatientId) {
      return;
    }
    setSelectedSummary(
      await apiGet<PatientSummary>(
        scopedDoctorId !== null
          ? `/api/patients/${selectedPatientId}/summary?doctor_id=${scopedDoctorId}`
          : `/api/patients/${selectedPatientId}/summary`,
      ),
    );
  }

  async function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<Appointment>("/api/appointments", {
        ...appointmentForm,
        patient_id: Number(appointmentForm.patient_id),
        doctor_id: Number(appointmentForm.doctor_id),
        scheduled_start: combineDisplayDateTimeToIso(appointmentForm.scheduled_start_date, appointmentForm.scheduled_start_time),
        scheduled_end: combineDisplayDateTimeToIso(appointmentForm.scheduled_end_date, appointmentForm.scheduled_end_time),
      });
      await loadData();
      setSelectedPatientId(appointmentForm.patient_id);
      setMessage("Cita creada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la cita.");
    }
  }

  async function updateAppointmentStatus(appointmentId: number, status: string) {
    setMessage("");
    try {
      await apiPatch<Appointment>(`/api/appointments/${appointmentId}/status`, {
        status,
        changed_by: "frontend-demo",
        change_reason: `Cambio manual a ${status}`,
      });
      await loadData();
      await refreshSelectedSummary();
      setMessage(`Cita ${appointmentId} actualizada a ${appointmentStatusLabel(status)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la cita.");
    }
  }

  async function toggleAppointmentHistory(appointmentId: number) {
    if (expandedAppointmentId === appointmentId) {
      setExpandedAppointmentId(null);
      return;
    }

    setMessage("");
    try {
      const [history, dispatches] = await Promise.all([
        appointmentHistory[appointmentId]
          ? Promise.resolve(appointmentHistory[appointmentId])
          : apiGet<AppointmentHistory[]>(`/api/appointments/${appointmentId}/history`),
        appointmentDispatches[appointmentId]
          ? Promise.resolve(appointmentDispatches[appointmentId])
          : apiGet<CommunicationDispatch[]>(`/api/communication-dispatches?appointment_id=${appointmentId}&limit=20`),
      ]);
      if (!appointmentHistory[appointmentId]) {
        setAppointmentHistory((current) => ({ ...current, [appointmentId]: history }));
      }
      if (!appointmentDispatches[appointmentId]) {
        setAppointmentDispatches((current) => ({ ...current, [appointmentId]: dispatches }));
      }
      setExpandedAppointmentId(appointmentId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el detalle de la cita.");
    }
  }

  return {
    appointmentDispatches,
    appointmentFilter,
    appointmentForm,
    appointmentHistory,
    expandedAppointmentId,
    setAppointmentDispatches,
    setAppointmentFilter,
    setAppointmentForm,
    setExpandedAppointmentId,
    submitAppointment,
    toggleAppointmentHistory,
    updateAppointmentStatus,
  };
}
