"use client";

import { apiPatch } from "@/lib/api";
import type { ClinicSetting } from "@/features/module1/types";

type UseEmailSettingsAdminParams = {
  setClinicSetting: React.Dispatch<React.SetStateAction<ClinicSetting | null>>;
  setMessage: (message: string) => void;
};

export function useEmailSettingsAdmin({ setClinicSetting, setMessage }: UseEmailSettingsAdminParams) {
  async function toggleEmailDelivery(enabled: boolean) {
    setMessage("");
    try {
      const updated = await apiPatch<ClinicSetting>("/api/clinic-settings", {
        email_delivery_enabled: enabled,
      });
      setClinicSetting(updated);
      setMessage(enabled ? "Envío de correos habilitado." : "Envío de correos deshabilitado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la configuración de correos.");
    }
  }

  async function toggleEmailProcessSetting(field: keyof ClinicSetting, enabled: boolean) {
    setMessage("");
    try {
      const updated = await apiPatch<ClinicSetting>("/api/clinic-settings", {
        [field]: enabled,
      });
      setClinicSetting(updated);
      setMessage(enabled ? "Proceso de correo habilitado." : "Proceso de correo deshabilitado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el proceso de correo.");
    }
  }

  return {
    toggleEmailDelivery,
    toggleEmailProcessSetting,
  };
}
