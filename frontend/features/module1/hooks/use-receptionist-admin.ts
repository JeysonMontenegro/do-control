"use client";

import { FormEvent, useMemo, useState } from "react";

import { createReceptionistForm } from "@/features/module1/clinical-console-defaults";
import { apiPatch, apiPost } from "@/lib/api";
import type { Doctor, Receptionist } from "@/features/module1/types";

type ReceptionistForm = ReturnType<typeof createReceptionistForm>;

type UseReceptionistAdminParams = {
  doctors: Doctor[];
  receptionists: Receptionist[];
  activeReceptionists: Receptionist[];
  loadData: () => Promise<void>;
  setMessage: (message: string) => void;
};

export function useReceptionistAdmin({
  doctors,
  receptionists,
  activeReceptionists,
  loadData,
  setMessage,
}: UseReceptionistAdminParams) {
  const [receptionistForm, setReceptionistForm] = useState<ReceptionistForm>(createReceptionistForm);
  const [editingReceptionistId, setEditingReceptionistId] = useState<number | null>(null);
  const [showReceptionistModal, setShowReceptionistModal] = useState(false);
  const [selectedReceptionistId, setSelectedReceptionistId] = useState<number | null>(null);
  const [receptionistDoctorSearch, setReceptionistDoctorSearch] = useState("");

  async function submitReceptionist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const payload = {
        first_name: receptionistForm.first_name,
        last_name: receptionistForm.last_name,
        gender: receptionistForm.gender,
        phone_number: receptionistForm.phone_number || null,
        email: receptionistForm.email,
        ...(editingReceptionistId ? { password: receptionistForm.password || undefined } : { password: receptionistForm.password }),
        doctor_ids: receptionistForm.doctor_ids,
      };
      if (editingReceptionistId) {
        await apiPatch<Receptionist>(`/api/receptionists/${editingReceptionistId}`, payload);
      } else {
        await apiPost<Receptionist>("/api/receptionists", payload);
      }
      setSelectedReceptionistId(editingReceptionistId);
      resetReceptionistForm();
      await loadData();
      setMessage(editingReceptionistId ? "Recepcionista actualizada." : "Recepcionista registrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la recepcionista.");
    }
  }

  async function toggleReceptionistActive(receptionist: Receptionist) {
    setMessage("");
    try {
      await apiPatch<Receptionist>(`/api/receptionists/${receptionist.id}`, { is_active: !receptionist.is_active });
      await loadData();
      setMessage(`Recepcionista ${receptionist.is_active ? "desactivada" : "activada"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la recepcionista.");
    }
  }

  function startReceptionistEdit(receptionist: Receptionist) {
    setSelectedReceptionistId(receptionist.id);
    setEditingReceptionistId(receptionist.id);
    setReceptionistForm({
      ...createReceptionistForm(),
      first_name: receptionist.first_name,
      last_name: receptionist.last_name,
      gender: receptionist.gender ?? "other",
      phone_number: receptionist.phone_number ?? "",
      email: receptionist.email,
      doctor_ids: receptionist.assigned_doctors.map((doctor) => doctor.id),
    });
    setReceptionistDoctorSearch("");
    setShowReceptionistModal(true);
  }

  function resetReceptionistForm() {
    setEditingReceptionistId(null);
    setReceptionistForm(createReceptionistForm());
    setReceptionistDoctorSearch("");
    setShowReceptionistModal(false);
  }

  const selectedReceptionist = useMemo(
    () => receptionists.find((receptionist) => receptionist.id === selectedReceptionistId) ?? activeReceptionists[0] ?? null,
    [activeReceptionists, receptionists, selectedReceptionistId],
  );

  const filteredDoctorOptions = useMemo(() => {
    const search = receptionistDoctorSearch.trim().toLowerCase();
    if (!search) {
      return doctors;
    }
    return doctors.filter((doctor) =>
      `${doctor.first_name} ${doctor.last_name} ${doctor.specialty ?? ""}`.toLowerCase().includes(search),
    );
  }, [doctors, receptionistDoctorSearch]);

  return {
    editingReceptionistId,
    filteredDoctorOptions,
    receptionistDoctorSearch,
    receptionistForm,
    selectedReceptionist,
    selectedReceptionistId,
    setReceptionistDoctorSearch,
    setReceptionistForm,
    setSelectedReceptionistId,
    setShowReceptionistModal,
    showReceptionistModal,
    resetReceptionistForm,
    startReceptionistEdit,
    submitReceptionist,
    toggleReceptionistActive,
  };
}
