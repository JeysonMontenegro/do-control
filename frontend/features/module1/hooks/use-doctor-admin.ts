"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  createDoctorAdminForm,
  emptyDoctorClinic,
  type DoctorAdminForm,
  type DoctorClinicForm,
} from "@/features/module1/clinical-console-defaults";
import { formatEditableDate, parseDisplayDate } from "@/features/module1/console-utils";
import { normalizePhoneWithDefaultCountry } from "@/features/module1/phone-utils";
import { apiPatch, apiPost } from "@/lib/api";
import type { ClinicSetting, Doctor } from "@/features/module1/types";

type UseDoctorAdminParams = {
  doctors: Doctor[];
  loadData: () => Promise<void>;
  setClinicSetting: React.Dispatch<React.SetStateAction<ClinicSetting | null>>;
  setMessage: (message: string) => void;
};

export function useDoctorAdmin({
  doctors,
  loadData,
  setClinicSetting,
  setMessage,
}: UseDoctorAdminParams) {
  const [doctorAdminForm, setDoctorAdminForm] = useState<DoctorAdminForm>(createDoctorAdminForm);
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorRosterTab, setDoctorRosterTab] = useState<"activos" | "inactivos">("activos");
  const [doctorDirectorySearch, setDoctorDirectorySearch] = useState("");
  const [activeDoctorPage, setActiveDoctorPage] = useState(1);
  const [inactiveDoctorPage, setInactiveDoctorPage] = useState(1);

  const activeDoctors = useMemo(() => doctors.filter((doctor) => doctor.is_active), [doctors]);
  const inactiveDoctors = useMemo(() => doctors.filter((doctor) => !doctor.is_active), [doctors]);
  const normalizedDoctorDirectorySearch = doctorDirectorySearch.trim().toLowerCase();
  const filteredActiveDoctors = useMemo(() => {
    if (!normalizedDoctorDirectorySearch) {
      return activeDoctors;
    }
    return activeDoctors.filter((doctor) =>
      `${doctor.first_name} ${doctor.last_name} ${doctor.specialty ?? ""} ${doctor.linked_user_email ?? ""}`
        .toLowerCase()
        .includes(normalizedDoctorDirectorySearch),
    );
  }, [activeDoctors, normalizedDoctorDirectorySearch]);
  const filteredInactiveDoctors = useMemo(() => {
    if (!normalizedDoctorDirectorySearch) {
      return inactiveDoctors;
    }
    return inactiveDoctors.filter((doctor) =>
      `${doctor.first_name} ${doctor.last_name} ${doctor.specialty ?? ""} ${doctor.linked_user_email ?? ""}`
        .toLowerCase()
        .includes(normalizedDoctorDirectorySearch),
    );
  }, [inactiveDoctors, normalizedDoctorDirectorySearch]);

  async function submitDoctorAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const payload = {
        first_name: doctorAdminForm.first_name,
        last_name: doctorAdminForm.last_name,
        gender: doctorAdminForm.gender,
        doctor_title: doctorAdminForm.doctor_title.trim() || null,
        date_of_birth: parseDisplayDate(doctorAdminForm.date_of_birth) || null,
        specialty: doctorAdminForm.specialty || null,
        license_number: doctorAdminForm.license_number || null,
        primary_phone: doctorAdminForm.primary_phone.trim() ? normalizePhoneWithDefaultCountry(doctorAdminForm.primary_phone) : null,
        clinics: doctorAdminForm.clinics
          .filter((clinic) => clinic.clinic_name.trim())
          .map((clinic, index) => ({
            clinic_name: clinic.clinic_name.trim(),
            address: clinic.address.trim() || null,
            phone_number: clinic.phone_number.trim() || null,
            notes: clinic.notes.trim() || null,
            is_primary: clinic.is_primary || index === 0,
          })),
        ...(editingDoctorId
          ? { user_password: doctorAdminForm.user_password || undefined }
          : { user_email: doctorAdminForm.user_email || null, user_password: doctorAdminForm.user_password || null }),
      };
      if (editingDoctorId) {
        await apiPatch<Doctor>(`/api/doctors/${editingDoctorId}`, payload);
      } else {
        await apiPost<Doctor>("/api/doctors", payload);
      }
      resetDoctorAdminForm();
      await loadData();
      setMessage(editingDoctorId ? "Doctor actualizado." : "Doctor registrado.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el doctor.");
      return false;
    }
  }

  async function toggleDoctorActive(doctor: Doctor) {
    setMessage("");
    try {
      await apiPatch<Doctor>(`/api/doctors/${doctor.id}`, { is_active: !doctor.is_active });
      await loadData();
      setMessage(`Doctor ${doctor.is_active ? "desactivado" : "activado"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el doctor.");
    }
  }

  async function toggleMultiDoctorVisibility(enabled: boolean) {
    setMessage("");
    try {
      const updatedSetting = await apiPatch<ClinicSetting>("/api/clinic-settings", {
        allow_multi_doctor_visibility: enabled,
      });
      setClinicSetting(updatedSetting);
      await loadData();
      setMessage(enabled ? "La visibilidad de varios doctores fue habilitada." : "La visibilidad de varios doctores fue ocultada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la configuración de clínica.");
    }
  }

  function startDoctorEdit(doctor: Doctor) {
    setEditingDoctorId(doctor.id);
    setShowDoctorModal(true);
    setDoctorAdminForm({
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      gender: doctor.gender ?? "other",
      doctor_title: doctor.doctor_title ?? "Dr.",
      date_of_birth: formatEditableDate(doctor.date_of_birth ?? null),
      specialty: doctor.specialty ?? "",
      license_number: doctor.license_number ?? "",
      primary_phone: doctor.phone_numbers?.find((phone) => phone.is_primary)?.phone_number ?? createDoctorAdminForm().primary_phone,
      user_email: doctor.linked_user_email ?? "",
      user_password: "",
      clinics: doctor.clinics?.length
        ? doctor.clinics.map((clinic) => ({
            clinic_name: clinic.clinic_name,
            address: clinic.address ?? "",
            phone_number: clinic.phone_number ?? "",
            notes: clinic.notes ?? "",
            is_primary: clinic.is_primary,
          }))
        : [emptyDoctorClinic()],
    });
  }

  function resetDoctorAdminForm() {
    setShowDoctorModal(false);
    setEditingDoctorId(null);
    setDoctorAdminForm(createDoctorAdminForm());
  }

  function updateDoctorClinic(index: number, field: keyof DoctorClinicForm, value: string | boolean) {
    setDoctorAdminForm((current) => {
      const clinics = current.clinics.map((clinic, clinicIndex) => {
        if (clinicIndex !== index) {
          return clinic;
        }
        if (field === "is_primary" && value === true) {
          return { ...clinic, is_primary: true };
        }
        return { ...clinic, [field]: value };
      });
      if (field === "is_primary" && value === true) {
        return {
          ...current,
          clinics: clinics.map((clinic, clinicIndex) => ({ ...clinic, is_primary: clinicIndex === index })),
        };
      }
      return { ...current, clinics };
    });
  }

  function addDoctorClinic() {
    setDoctorAdminForm((current) => ({
      ...current,
      clinics: [...current.clinics, emptyDoctorClinic()],
    }));
  }

  function removeDoctorClinic(index: number) {
    setDoctorAdminForm((current) => {
      const nextClinics = current.clinics.filter((_, clinicIndex) => clinicIndex !== index);
      return {
        ...current,
        clinics: nextClinics.length ? nextClinics : [emptyDoctorClinic()],
      };
    });
  }

  function updateDoctorDirectorySearch(value: string) {
    setDoctorDirectorySearch(value);
    setActiveDoctorPage(1);
    setInactiveDoctorPage(1);
  }

  return {
    activeDoctorPage,
    activeDoctors,
    addDoctorClinic,
    doctorAdminForm,
    doctorDirectorySearch,
    doctorRosterTab,
    editingDoctorId,
    filteredActiveDoctors,
    filteredInactiveDoctors,
    inactiveDoctorPage,
    inactiveDoctors,
    removeDoctorClinic,
    resetDoctorAdminForm,
    setActiveDoctorPage,
    setDoctorAdminForm,
    setDoctorRosterTab,
    setShowDoctorModal,
    setInactiveDoctorPage,
    showDoctorModal,
    startDoctorEdit,
    submitDoctorAdmin,
    toggleDoctorActive,
    toggleMultiDoctorVisibility,
    updateDoctorClinic,
    updateDoctorDirectorySearch,
  };
}
