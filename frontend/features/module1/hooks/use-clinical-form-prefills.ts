"use client";

import { useEffect } from "react";

import type { Doctor, PatientSummary } from "@/features/module1/types";

type AppointmentFormState = {
  appointment_type: string;
  created_by: string;
  doctor_id: string;
  patient_id: string;
  reason: string;
  scheduled_end_date: string;
  scheduled_end_time: string;
  scheduled_start_date: string;
  scheduled_start_time: string;
  source: string;
};

type EncounterFormState = {
  appointment_id: string;
  chief_complaint: string;
  created_by: string;
  doctor_id: string;
  encounter_date: string;
  encounter_time: string;
  encounter_type: string;
  patient_id: string;
};

type UseClinicalFormPrefillsParams = {
  appointmentForm: AppointmentFormState;
  encounterForm: EncounterFormState;
  selectedDoctor: Doctor | null;
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  setAppointmentForm: React.Dispatch<React.SetStateAction<AppointmentFormState>>;
  setEncounterForm: React.Dispatch<React.SetStateAction<EncounterFormState>>;
};

function getPreferredAppointmentId(selectedSummary: PatientSummary | null, selectedDoctor: Doctor | null) {
  if (!selectedSummary) {
    return "";
  }

  const scopedAppointments = selectedDoctor
    ? selectedSummary.appointments.filter((appointment) => appointment.doctor_id === selectedDoctor.id)
    : selectedSummary.appointments;

  const preferredAppointment = scopedAppointments.find(
    (appointment) =>
      appointment.status !== "cancelled" && appointment.confirmation_status !== "cancelled",
  );

  return preferredAppointment ? String(preferredAppointment.id) : "";
}

export function useClinicalFormPrefills({
  appointmentForm,
  encounterForm,
  selectedDoctor,
  selectedPatientId,
  selectedSummary,
  setAppointmentForm,
  setEncounterForm,
}: UseClinicalFormPrefillsParams) {
  useEffect(() => {
    if (!selectedPatientId && !selectedDoctor) {
      return;
    }

    const nextDoctorId = selectedDoctor ? String(selectedDoctor.id) : "";

    if (selectedPatientId && appointmentForm.patient_id !== selectedPatientId) {
      setAppointmentForm((current) => ({
        ...current,
        patient_id: selectedPatientId,
        doctor_id: nextDoctorId || current.doctor_id,
      }));
    } else if (nextDoctorId && appointmentForm.doctor_id !== nextDoctorId) {
      setAppointmentForm((current) => ({
        ...current,
        doctor_id: nextDoctorId,
      }));
    }

    const preferredAppointmentId = getPreferredAppointmentId(selectedSummary, selectedDoctor);

    if (
      (selectedPatientId && encounterForm.patient_id !== selectedPatientId) ||
      (nextDoctorId && encounterForm.doctor_id !== nextDoctorId) ||
      (preferredAppointmentId && !encounterForm.appointment_id)
    ) {
      setEncounterForm((current) => ({
        ...current,
        patient_id: selectedPatientId || current.patient_id,
        doctor_id: nextDoctorId || current.doctor_id,
        appointment_id: current.appointment_id || preferredAppointmentId,
      }));
    }
  }, [
    appointmentForm.doctor_id,
    appointmentForm.patient_id,
    encounterForm.appointment_id,
    encounterForm.doctor_id,
    encounterForm.patient_id,
    selectedDoctor,
    selectedPatientId,
    selectedSummary,
    setAppointmentForm,
    setEncounterForm,
  ]);
}
