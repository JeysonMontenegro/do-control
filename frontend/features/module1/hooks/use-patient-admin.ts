"use client";

import { FormEvent, useState } from "react";

import { createPatientEditForm, createPatientForm } from "@/features/module1/clinical-console-defaults";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { Patient, PatientSummary } from "@/features/module1/types";

type PatientForm = ReturnType<typeof createPatientForm>;
type PatientEditForm = ReturnType<typeof createPatientEditForm>;
type PatientAction = "patient_create" | "patient_edit" | null;

type UsePatientAdminParams = {
  availableDoctors: { id: number }[];
  hasSingleDoctorContext: boolean;
  loadData: () => Promise<void>;
  scopedDoctorId: number | null;
  selectedPatientId: string;
  setMessage: (message: string) => void;
  setSelectedSummary: React.Dispatch<React.SetStateAction<PatientSummary | null>>;
};

export function usePatientAdmin({
  availableDoctors,
  hasSingleDoctorContext,
  loadData,
  scopedDoctorId,
  selectedPatientId,
  setMessage,
  setSelectedSummary,
}: UsePatientAdminParams) {
  const [activeSectionAction, setActiveSectionAction] = useState<PatientAction>(null);
  const [patientForm, setPatientForm] = useState<PatientForm>(() => createPatientForm());
  const [patientEditForm, setPatientEditForm] = useState<PatientEditForm>(createPatientEditForm);

  async function submitPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<Patient>("/api/patients", {
        ...patientForm,
        display_name: patientForm.display_name.trim() || null,
        national_id: patientForm.national_id || null,
        doctor_id: patientForm.doctor_id ? Number(patientForm.doctor_id) : scopedDoctorId,
      });
      setPatientForm(createPatientForm(hasSingleDoctorContext ? String(availableDoctors[0]?.id ?? "") : ""));
      setActiveSectionAction(null);
      await loadData();
      setMessage("Paciente creado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el paciente.");
    }
  }

  async function submitPatientUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatientId) {
      setMessage("Selecciona un paciente para editar.");
      return;
    }

    setMessage("");
    try {
      const updatePath =
        scopedDoctorId !== null ? `/api/patients/${selectedPatientId}?doctor_id=${scopedDoctorId}` : `/api/patients/${selectedPatientId}`;
      await apiPatch<Patient>(updatePath, {
        display_name: patientEditForm.display_name.trim() || null,
        first_name: patientEditForm.first_name,
        last_name: patientEditForm.last_name,
        primary_phone: patientEditForm.primary_phone,
        national_id: patientEditForm.national_id || null,
        tax_id: patientEditForm.tax_id || null,
        email: patientEditForm.email || null,
        address: patientEditForm.address || null,
        notes: patientEditForm.notes || null,
        is_active: patientEditForm.is_active,
      });
      await loadData();
      setSelectedSummary(
        await apiGet<PatientSummary>(
          scopedDoctorId !== null
            ? `/api/patients/${selectedPatientId}/summary?doctor_id=${scopedDoctorId}`
            : `/api/patients/${selectedPatientId}/summary`,
        ),
      );
      setActiveSectionAction(null);
      setMessage("Paciente actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el paciente.");
    }
  }

  async function togglePatientActive(patient: Patient) {
    setMessage("");
    try {
      const updatePath =
        scopedDoctorId !== null ? `/api/patients/${patient.id}?doctor_id=${scopedDoctorId}` : `/api/patients/${patient.id}`;
      await apiPatch<Patient>(updatePath, {
        is_active: !patient.is_active,
      });
      await loadData();
      if (selectedPatientId && String(patient.id) === selectedPatientId) {
        setSelectedSummary(
          await apiGet<PatientSummary>(
            scopedDoctorId !== null
              ? `/api/patients/${selectedPatientId}/summary?doctor_id=${scopedDoctorId}`
              : `/api/patients/${selectedPatientId}/summary`,
          ),
        );
      }
      setPatientEditForm((current) => ({ ...current, is_active: !patient.is_active }));
      setMessage(`Paciente ${patient.is_active ? "desactivado" : "activado"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cambiar el estado del paciente.");
    }
  }

  return {
    activeSectionAction,
    patientEditForm,
    patientForm,
    setActiveSectionAction,
    setPatientEditForm,
    setPatientForm,
    submitPatient,
    submitPatientUpdate,
    togglePatientActive,
  };
}
