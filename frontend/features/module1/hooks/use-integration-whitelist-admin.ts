"use client";

import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import type { EmailWhitelistState, MessagingWhitelistState } from "@/features/module1/types";

type UseIntegrationWhitelistAdminParams = {
  setEmailWhitelist: React.Dispatch<React.SetStateAction<EmailWhitelistState | null>>;
  setMessage: (message: string) => void;
  setMessagingWhitelist: React.Dispatch<React.SetStateAction<MessagingWhitelistState | null>>;
};

export function useIntegrationWhitelistAdmin({
  setEmailWhitelist,
  setMessage,
  setMessagingWhitelist,
}: UseIntegrationWhitelistAdminParams) {
  async function refreshWhitelists() {
    try {
      const [loadedMessagingWhitelist, loadedEmailWhitelist] = await Promise.all([
        apiGet<MessagingWhitelistState>("/api/integrations/messaging/whitelist"),
        apiGet<EmailWhitelistState>("/api/integrations/email/whitelist"),
      ]);
      setMessagingWhitelist(loadedMessagingWhitelist);
      setEmailWhitelist(loadedEmailWhitelist);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo recargar el estado de whitelist.");
    }
  }

  async function toggleMessagingWhitelist(enabled: boolean) {
    setMessage("");
    try {
      const updated = await apiPut<MessagingWhitelistState>("/api/integrations/messaging/whitelist", { enabled });
      setMessagingWhitelist(updated);
      setMessage(enabled ? "Whitelist de mensajería habilitada." : "Whitelist de mensajería deshabilitada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la whitelist de mensajería.");
    }
  }

  async function addMessagingWhitelistPhone(phone: string) {
    setMessage("");
    try {
      await apiPost<{ added: string }>("/api/integrations/messaging/whitelist/phones", { phone });
      await refreshWhitelists();
      setMessage("Número agregado al whitelist de mensajería.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo agregar el número al whitelist de mensajería.");
    }
  }

  async function removeMessagingWhitelistPhone(phone: string) {
    setMessage("");
    try {
      await apiDelete<{ removed: string }>(`/api/integrations/messaging/whitelist/phones/${encodeURIComponent(phone)}`);
      await refreshWhitelists();
      setMessage("Número removido del whitelist de mensajería.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo quitar el número del whitelist de mensajería.");
    }
  }

  async function toggleEmailWhitelist(enabled: boolean) {
    setMessage("");
    try {
      const updated = await apiPut<EmailWhitelistState>("/api/integrations/email/whitelist", { enabled });
      setEmailWhitelist(updated);
      setMessage(enabled ? "Whitelist de correos habilitada." : "Whitelist de correos deshabilitada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la whitelist de correos.");
    }
  }

  async function addEmailWhitelistAddress(email: string) {
    setMessage("");
    try {
      await apiPost<{ added: string }>("/api/integrations/email/whitelist/addresses", { email });
      await refreshWhitelists();
      setMessage("Correo agregado al whitelist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo agregar el correo al whitelist.");
    }
  }

  async function removeEmailWhitelistAddress(email: string) {
    setMessage("");
    try {
      await apiDelete<{ removed: string }>(`/api/integrations/email/whitelist/addresses/${encodeURIComponent(email)}`);
      await refreshWhitelists();
      setMessage("Correo removido del whitelist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo quitar el correo del whitelist.");
    }
  }

  return {
    addEmailWhitelistAddress,
    addMessagingWhitelistPhone,
    removeEmailWhitelistAddress,
    removeMessagingWhitelistPhone,
    toggleEmailWhitelist,
    toggleMessagingWhitelist,
  };
}
