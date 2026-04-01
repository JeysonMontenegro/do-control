"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createDoctorAdminForm,
  createDoctorInviteForm,
  emptyDoctorClinic,
  type DoctorAdminForm,
  type DoctorClinicForm,
  type DoctorInviteForm,
} from "@/features/module1/clinical-console-defaults";
import { formatEditableDate, parseDisplayDate } from "@/features/module1/console-utils";
import { normalizePhoneWithDefaultCountry } from "@/features/module1/phone-utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import type { ClinicSetting, Doctor, DoctorOnboardingAdminStatus } from "@/features/module1/types";

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
  type DoctorInvitationResponse = {
    status: string;
    doctor_id: number;
    user_id: number;
    email: string;
    phone_number: string;
    expires_at: string;
    onboarding_url: string;
  };

  const parseCoordinate = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const [doctorAdminForm, setDoctorAdminForm] = useState<DoctorAdminForm>(createDoctorAdminForm);
  const [doctorInviteForm, setDoctorInviteForm] = useState<DoctorInviteForm>(createDoctorInviteForm);
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [latestInvitationUrl, setLatestInvitationUrl] = useState("");
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showDoctorInviteModal, setShowDoctorInviteModal] = useState(false);
  const [onboardingAdminTarget, setOnboardingAdminTarget] = useState<DoctorOnboardingAdminStatus | null>(null);
  const [doctorOnboardingStatuses, setDoctorOnboardingStatuses] = useState<DoctorOnboardingAdminStatus[]>([]);
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

  async function refreshDoctorOnboardingStatuses() {
    try {
      const statuses = await apiGet<DoctorOnboardingAdminStatus[]>("/api/doctors/onboarding");
      setDoctorOnboardingStatuses(statuses);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el estado del onboarding médico.");
    }
  }

  useEffect(() => {
    void refreshDoctorOnboardingStatuses();
  }, []);

  async function submitDoctorAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const clinicsPayload = doctorAdminForm.clinics
        .filter((clinic) => clinic.clinic_name.trim())
        .map((clinic, index) => ({
          clinic_name: clinic.clinic_name.trim(),
          address: clinic.address.trim() || null,
          latitude: parseCoordinate(clinic.latitude),
          longitude: parseCoordinate(clinic.longitude),
          phone_number: clinic.phone_number.trim() || null,
          notes: clinic.notes.trim() || null,
          is_primary: clinic.is_primary || index === 0,
        }));

      if (onboardingAdminTarget) {
        await apiPatch<DoctorOnboardingAdminStatus>(`/api/doctors/${onboardingAdminTarget.doctor_id}/onboarding`, {
          first_name: doctorAdminForm.first_name,
          last_name: doctorAdminForm.last_name,
          gender: doctorAdminForm.gender,
          doctor_title: doctorAdminForm.doctor_title.trim() || null,
          date_of_birth: parseDisplayDate(doctorAdminForm.date_of_birth) || null,
          specialty: doctorAdminForm.specialty || null,
          license_number: doctorAdminForm.license_number || null,
          phone_number: doctorAdminForm.primary_phone.trim()
            ? normalizePhoneWithDefaultCountry(doctorAdminForm.primary_phone)
            : null,
          user_password: doctorAdminForm.user_password || null,
          activate_user: true,
          clinics: clinicsPayload,
        });
        resetDoctorAdminForm();
        await loadData();
        await refreshDoctorOnboardingStatuses();
        setMessage("Onboarding completado o corregido por admin.");
        return true;
      }

      const payload = {
        first_name: doctorAdminForm.first_name,
        last_name: doctorAdminForm.last_name,
        gender: doctorAdminForm.gender,
        doctor_title: doctorAdminForm.doctor_title.trim() || null,
        date_of_birth: parseDisplayDate(doctorAdminForm.date_of_birth) || null,
        specialty: doctorAdminForm.specialty || null,
        license_number: doctorAdminForm.license_number || null,
        primary_phone: doctorAdminForm.primary_phone.trim() ? normalizePhoneWithDefaultCountry(doctorAdminForm.primary_phone) : null,
        clinics: clinicsPayload,
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

  async function submitDoctorInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await apiPost<DoctorInvitationResponse>("/api/doctors/invitations", {
        full_name: doctorInviteForm.full_name.trim(),
        email: doctorInviteForm.email.trim(),
        phone_number: normalizePhoneWithDefaultCountry(doctorInviteForm.phone_number),
      });
      setLatestInvitationUrl(response.onboarding_url);
      setDoctorInviteForm(createDoctorInviteForm());
      setShowDoctorInviteModal(false);
      await loadData();
      await refreshDoctorOnboardingStatuses();
      setMessage(`Invitación enviada. Enlace generado: ${response.onboarding_url}`);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar la invitación del doctor.");
      return false;
    }
  }

  async function toggleDoctorActive(doctor: Doctor) {
    setMessage("");
    try {
      await apiPatch<Doctor>(`/api/doctors/${doctor.id}`, { is_active: !doctor.is_active });
      await loadData();
      await refreshDoctorOnboardingStatuses();
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
    setOnboardingAdminTarget(null);
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
            latitude: clinic.latitude != null ? String(clinic.latitude) : "",
            longitude: clinic.longitude != null ? String(clinic.longitude) : "",
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
    setOnboardingAdminTarget(null);
    setDoctorAdminForm(createDoctorAdminForm());
  }

  function resetDoctorInviteForm() {
    setShowDoctorInviteModal(false);
    setDoctorInviteForm(createDoctorInviteForm());
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

  function startDoctorOnboardingAdmin(status: DoctorOnboardingAdminStatus) {
    const linkedDoctor = doctors.find((doctor) => doctor.id === status.doctor_id);
    setEditingDoctorId(status.doctor_id);
    setOnboardingAdminTarget(status);
    setShowDoctorModal(true);
    setDoctorAdminForm({
      first_name: linkedDoctor?.first_name ?? status.first_name,
      last_name: linkedDoctor?.last_name ?? status.last_name,
      gender: linkedDoctor?.gender ?? "other",
      doctor_title: linkedDoctor?.doctor_title ?? "Dr.",
      date_of_birth: formatEditableDate(linkedDoctor?.date_of_birth ?? null),
      specialty: linkedDoctor?.specialty ?? "",
      license_number: linkedDoctor?.license_number ?? "",
      primary_phone: linkedDoctor?.phone_numbers?.find((phone) => phone.is_primary)?.phone_number ?? status.phone_number ?? "",
      user_email: status.email,
      user_password: "",
      clinics: linkedDoctor?.clinics?.length
        ? linkedDoctor.clinics.map((clinic) => ({
            clinic_name: clinic.clinic_name,
            address: clinic.address ?? "",
            latitude: clinic.latitude != null ? String(clinic.latitude) : "",
            longitude: clinic.longitude != null ? String(clinic.longitude) : "",
            phone_number: clinic.phone_number ?? "",
            notes: clinic.notes ?? "",
            is_primary: clinic.is_primary,
          }))
        : [emptyDoctorClinic()],
    });
  }

  async function reissueDoctorOnboarding(doctorId: number) {
    setMessage("");
    try {
      const response = await apiPost<DoctorInvitationResponse>(`/api/doctors/${doctorId}/onboarding/reissue`, {});
      setLatestInvitationUrl(response.onboarding_url);
      await loadData();
      await refreshDoctorOnboardingStatuses();
      setMessage(`Invitación reemitida. Nuevo enlace: ${response.onboarding_url}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reemitir la invitación.");
    }
  }

  async function revokeDoctorOnboarding(doctorId: number) {
    setMessage("");
    try {
      await apiPost<DoctorOnboardingAdminStatus>(`/api/doctors/${doctorId}/onboarding/revoke`, {});
      await loadData();
      await refreshDoctorOnboardingStatuses();
      setMessage("Invitación de onboarding revocada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo revocar la invitación.");
    }
  }

  return {
    activeDoctorPage,
    activeDoctors,
    addDoctorClinic,
    doctorAdminForm,
    doctorDirectorySearch,
    doctorInviteForm,
    doctorOnboardingStatuses,
    doctorRosterTab,
    editingDoctorId,
    filteredActiveDoctors,
    filteredInactiveDoctors,
    inactiveDoctorPage,
    inactiveDoctors,
    latestInvitationUrl,
    onboardingAdminTarget,
    removeDoctorClinic,
    refreshDoctorOnboardingStatuses,
    reissueDoctorOnboarding,
    resetDoctorAdminForm,
    resetDoctorInviteForm,
    revokeDoctorOnboarding,
    setActiveDoctorPage,
    setDoctorAdminForm,
    setDoctorInviteForm,
    setDoctorRosterTab,
    setShowDoctorModal,
    setShowDoctorInviteModal,
    setInactiveDoctorPage,
    showDoctorModal,
    showDoctorInviteModal,
    startDoctorEdit,
    startDoctorOnboardingAdmin,
    submitDoctorAdmin,
    submitDoctorInvitation,
    toggleDoctorActive,
    toggleMultiDoctorVisibility,
    updateDoctorClinic,
    updateDoctorDirectorySearch,
  };
}
