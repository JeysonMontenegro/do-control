"use client";

import { FormEvent } from "react";

import { createReminderRuleForm } from "@/features/module1/clinical-console-defaults";
import { CONFIRMATION_TEMPLATE_KEY, DEFAULT_CONFIRMATION_BODY, DEFAULT_CONFIRMATION_TITLE } from "@/features/module1/console-config";
import { apiPatch, apiPost } from "@/lib/api";
import type { CommunicationTemplate, ReminderRule } from "@/features/module1/types";

type ReminderRuleFormState = {
  channel: string;
  doctor_id: string;
  is_active: boolean;
  minutes_before: string;
  template_key: string;
  trigger_type: string;
};

type TemplateFormState = {
  body: string;
  title: string;
};

type UseReminderAdminParams = {
  communicationTemplates: CommunicationTemplate[];
  availableDoctorIds?: number[];
  loadData: () => Promise<void>;
  reminderRuleForm: ReminderRuleFormState;
  reminderRules: ReminderRule[];
  setMessage: (message: string) => void;
  setReminderRuleForm: React.Dispatch<React.SetStateAction<ReminderRuleFormState>>;
  templateForm: TemplateFormState;
};

export function useReminderAdmin({
  communicationTemplates,
  availableDoctorIds,
  loadData,
  reminderRuleForm,
  reminderRules,
  setMessage,
  setReminderRuleForm,
  templateForm,
}: UseReminderAdminParams) {
  async function submitReminderRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<ReminderRule>("/api/reminder-rules", {
        doctor_id: reminderRuleForm.doctor_id ? Number(reminderRuleForm.doctor_id) : null,
        channel: reminderRuleForm.channel,
        trigger_type: reminderRuleForm.trigger_type,
        minutes_before: Number(reminderRuleForm.minutes_before),
        template_key: reminderRuleForm.template_key,
        is_active: reminderRuleForm.is_active,
      });
      setReminderRuleForm(createReminderRuleForm());
      await loadData();
      setMessage("Regla de recordatorio creada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la regla.");
    }
  }

  async function activateDefault24HourReminder() {
    setMessage("");
    try {
      const templatePayload = {
        doctor_id: null,
        channel: "whatsapp",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        title: templateForm.title || DEFAULT_CONFIRMATION_TITLE,
        body: templateForm.body || DEFAULT_CONFIRMATION_BODY,
        is_active: true,
      };

      const generalConfirmationTemplate = communicationTemplates.find(
        (template) => template.template_key === CONFIRMATION_TEMPLATE_KEY && template.doctor_id === null,
      );

      if (generalConfirmationTemplate) {
        await apiPatch<CommunicationTemplate>(`/api/communication-templates/${generalConfirmationTemplate.id}`, templatePayload);
      } else {
        await apiPost<CommunicationTemplate>("/api/communication-templates", templatePayload);
      }

      const generalRule = reminderRules.find((rule) => rule.doctor_id === null && rule.trigger_type === "before_appointment");
      const rulePayload = {
        doctor_id: null,
        channel: "whatsapp",
        trigger_type: "before_appointment",
        minutes_before: 1440,
        template_key: CONFIRMATION_TEMPLATE_KEY,
        is_active: true,
      };

      if (generalRule) {
        await apiPatch<ReminderRule>(`/api/reminder-rules/${generalRule.id}`, rulePayload);
      } else {
        await apiPost<ReminderRule>("/api/reminder-rules", rulePayload);
      }

      setReminderRuleForm((current) => ({
        ...current,
        doctor_id: "",
        minutes_before: "1440",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        is_active: true,
      }));
      await loadData();
      setMessage("La regla general de 24 horas quedó activa.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo activar la regla general de 24 horas.");
    }
  }

  async function toggleReminderRule(rule: ReminderRule) {
    setMessage("");
    try {
      await apiPatch<ReminderRule>(`/api/reminder-rules/${rule.id}`, {
        is_active: !rule.is_active,
      });
      await loadData();
      setMessage(`Regla ${rule.is_active ? "desactivada" : "activada"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la regla.");
    }
  }

  async function setDoctorReminderRuleActive(doctorId: number, isActive: boolean) {
    setMessage("");
    try {
      const existingRule = reminderRules.find(
        (rule) => rule.doctor_id === doctorId && rule.trigger_type === "before_appointment",
      );
      const generalRule = reminderRules.find((rule) => rule.doctor_id === null && rule.trigger_type === "before_appointment");
      const baseMinutesBefore = existingRule?.minutes_before ?? generalRule?.minutes_before ?? 1440;
      const baseTemplateKey = existingRule?.template_key ?? generalRule?.template_key ?? CONFIRMATION_TEMPLATE_KEY;

      if (existingRule) {
        await apiPatch<ReminderRule>(`/api/reminder-rules/${existingRule.id}`, {
          is_active: isActive,
        });
      } else {
        if (availableDoctorIds && !availableDoctorIds.includes(doctorId)) {
          throw new Error("No puedes gestionar recordatorios para ese doctor.");
        }
        await apiPost<ReminderRule>("/api/reminder-rules", {
          doctor_id: doctorId,
          channel: "whatsapp",
          trigger_type: "before_appointment",
          minutes_before: baseMinutesBefore,
          template_key: baseTemplateKey,
          is_active: isActive,
        });
      }

      await loadData();
      setMessage(`Recordatorios ${isActive ? "activados" : "desactivados"} para el doctor seleccionado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el recordatorio por doctor.");
    }
  }

  return {
    activateDefault24HourReminder,
    setDoctorReminderRuleActive,
    submitReminderRule,
    toggleReminderRule,
  };
}
