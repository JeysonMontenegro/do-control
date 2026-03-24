"use client";

import { useCallback, useEffect } from "react";

import { createPatientEditForm } from "@/features/module1/clinical-console-defaults";
import type { CommunicationDispatch, Patient, PatientSummary } from "@/features/module1/types";
import { apiGet } from "@/lib/api";

type PatientEditFormState = ReturnType<typeof createPatientEditForm>;

type UsePatientContextParams = {
  canViewPatientTimeline: boolean;
  dataPatients: Patient[];
  isAuthenticated: boolean;
  scopedDoctorId: number | null;
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  setMessage: (message: string) => void;
  setPatientEditForm: React.Dispatch<React.SetStateAction<PatientEditFormState>>;
  setSelectedPatientDispatches: React.Dispatch<React.SetStateAction<CommunicationDispatch[]>>;
  setSelectedPatientId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSummary: React.Dispatch<React.SetStateAction<PatientSummary | null>>;
};

export function usePatientContext({
  canViewPatientTimeline,
  dataPatients,
  isAuthenticated,
  scopedDoctorId,
  selectedPatientId,
  selectedSummary,
  setMessage,
  setPatientEditForm,
  setSelectedPatientDispatches,
  setSelectedPatientId,
  setSelectedSummary,
}: UsePatientContextParams) {
  const refreshSelectedSummary = useCallback(async () => {
    if (!selectedPatientId) {
      setSelectedSummary(null);
      return null;
    }

    const summaryPath =
      scopedDoctorId !== null
        ? `/api/patients/${selectedPatientId}/summary?doctor_id=${scopedDoctorId}`
        : `/api/patients/${selectedPatientId}/summary`;

    const summary = await apiGet<PatientSummary>(summaryPath);
    setSelectedSummary(summary);
    return summary;
  }, [scopedDoctorId, selectedPatientId, setSelectedSummary]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadSummary() {
      if (!selectedPatientId) {
        setSelectedSummary(null);
        return;
      }

      try {
        await refreshSelectedSummary();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "No se pudo cargar el resumen del paciente.";
        if (errorMessage.includes("Patient not found")) {
          setSelectedSummary(null);
          setSelectedPatientDispatches([]);
          return;
        }
        setMessage(errorMessage);
      }
    }

    loadSummary();
  }, [isAuthenticated, refreshSelectedSummary, selectedPatientId, setMessage, setSelectedPatientDispatches, setSelectedSummary]);

  useEffect(() => {
    if (!selectedPatientId) {
      return;
    }
    const patientStillVisible = dataPatients.some((patient) => String(patient.id) === selectedPatientId);
    if (patientStillVisible) {
      return;
    }
    setSelectedPatientId("");
    setSelectedSummary(null);
    setSelectedPatientDispatches([]);
  }, [dataPatients, selectedPatientId, setSelectedPatientDispatches, setSelectedPatientId, setSelectedSummary]);

  useEffect(() => {
    if (!selectedSummary) {
      setPatientEditForm(createPatientEditForm());
      return;
    }

    setPatientEditForm({
      first_name: selectedSummary.patient.first_name ?? "",
      last_name: selectedSummary.patient.last_name ?? "",
      primary_phone: selectedSummary.patient.primary_phone ?? "",
      national_id: selectedSummary.patient.national_id ?? "",
      tax_id: selectedSummary.patient.tax_id ?? "",
      email: selectedSummary.patient.email ?? "",
      address: selectedSummary.patient.address ?? "",
      notes: selectedSummary.patient.notes ?? "",
      is_active: selectedSummary.patient.is_active,
    });
  }, [selectedSummary, setPatientEditForm]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (!selectedPatientId || !canViewPatientTimeline) {
      setSelectedPatientDispatches([]);
      return;
    }

    async function loadPatientDispatches() {
      try {
        const dispatches = await apiGet<CommunicationDispatch[]>(
          `/api/communication-dispatches?patient_id=${selectedPatientId}&limit=12`,
        );
        setSelectedPatientDispatches(dispatches);
      } catch (error) {
        setSelectedPatientDispatches([]);
        setMessage(error instanceof Error ? error.message : "No se pudo cargar el historial de mensajes.");
      }
    }

    loadPatientDispatches();
  }, [canViewPatientTimeline, isAuthenticated, selectedPatientId, setMessage, setSelectedPatientDispatches]);

  return {
    refreshSelectedSummary,
  };
}
