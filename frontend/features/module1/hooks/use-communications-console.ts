"use client";

import { FormEvent, useMemo, useState } from "react";

import { createDispatchStatusForm } from "@/features/module1/clinical-console-defaults";
import { CONFIRMATION_TEMPLATE_KEY } from "@/features/module1/console-config";
import { getFirstExamOrderId } from "@/features/module1/review-utils";
import { apiGet, apiPatch, apiPost, API_URL } from "@/lib/api";
import type {
  Appointment,
  ClinicSetting,
  CommunicationDispatch,
  CommunicationDispatchAttempt,
  CommunicationDispatchBatchRequeue,
  CommunicationDispatchGeneration,
  CommunicationTemplate,
  CommunicationTemplatePreview,
  EmailDispatch,
  EmailTemplate,
  EmailTemplatePreview,
  PatientSummary,
} from "@/features/module1/types";

type UseCommunicationsConsoleParams = {
  appointmentDispatches: Record<number, CommunicationDispatch[]>;
  communicationDispatches: CommunicationDispatch[];
  communicationTemplates: CommunicationTemplate[];
  currentRoles: string[];
  currentUserEmail: string;
  emailTemplateForm: {
    template_key: string;
    title: string;
    subject: string;
    html_body: string;
    text_body: string;
    is_active: boolean;
  };
  emailTemplates: EmailTemplate[];
  loadData: () => Promise<void>;
  selectedDoctor: { id: number } | null;
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  setAppointmentDispatches: React.Dispatch<React.SetStateAction<Record<number, CommunicationDispatch[]>>>;
  setClinicSetting: React.Dispatch<React.SetStateAction<ClinicSetting | null>>;
  setExpandedAppointmentId: React.Dispatch<React.SetStateAction<number | null>>;
  setMessage: (message: string) => void;
  templateForm: {
    doctor_id: string;
    channel: string;
    template_key: string;
    title: string;
    body: string;
    is_active: boolean;
  };
  confirmationTemplate: CommunicationTemplate | null;
};

type DispatchStatusForm = {
  status: "sent" | "delivered" | "failed";
  error_message: string;
};

export function useCommunicationsConsole({
  appointmentDispatches,
  communicationDispatches,
  communicationTemplates,
  currentRoles,
  currentUserEmail,
  emailTemplateForm,
  emailTemplates,
  loadData,
  selectedDoctor,
  selectedPatientId,
  selectedSummary,
  setAppointmentDispatches,
  setExpandedAppointmentId,
  setMessage,
  templateForm,
  confirmationTemplate,
}: UseCommunicationsConsoleParams) {
  const [dispatchAttempts, setDispatchAttempts] = useState<Record<number, CommunicationDispatchAttempt[]>>({});
  const [expandedDispatchId, setExpandedDispatchId] = useState<number | null>(null);
  const [templatePreview, setTemplatePreview] = useState<CommunicationTemplatePreview | null>(null);
  const [emailTemplatePreview, setEmailTemplatePreview] = useState<EmailTemplatePreview | null>(null);
  const [activeDispatchStatusId, setActiveDispatchStatusId] = useState<number | null>(null);
  const [dispatchStatusForm, setDispatchStatusForm] = useState<DispatchStatusForm>(createDispatchStatusForm);

  const activeDispatch = useMemo(
    () => communicationDispatches.find((dispatch) => dispatch.id === activeDispatchStatusId) ?? null,
    [activeDispatchStatusId, communicationDispatches],
  );

  async function saveEmailTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const existingTemplate = emailTemplates.find((template) => template.template_key === emailTemplateForm.template_key);
      const payload = {
        title: emailTemplateForm.title,
        subject: emailTemplateForm.subject,
        html_body: emailTemplateForm.html_body,
        text_body: emailTemplateForm.text_body || null,
        is_active: emailTemplateForm.is_active,
      };
      if (existingTemplate) {
        await apiPatch<EmailTemplate>(`/api/email-templates/${existingTemplate.id}`, payload);
        setMessage("Plantilla de correo actualizada.");
      } else {
        await apiPost<EmailTemplate>("/api/email-templates", {
          template_key: emailTemplateForm.template_key,
          ...payload,
        });
        setMessage("Plantilla de correo creada.");
      }
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la plantilla de correo.");
    }
  }

  async function previewEmailTemplate() {
    setMessage("");
    try {
      const preview = await apiPost<EmailTemplatePreview>("/api/email-templates/preview", {
        subject: emailTemplateForm.subject,
        html_body: emailTemplateForm.html_body,
        text_body: emailTemplateForm.text_body || null,
        variables: {
          app_name: "do-control",
          recipient_name: selectedSummary ? `${selectedSummary.patient.first_name} ${selectedSummary.patient.last_name}` : "Paciente Demo",
          first_name: selectedSummary?.patient.first_name ?? "Paciente",
          last_name: selectedSummary?.patient.last_name ?? "Demo",
          email: selectedSummary?.patient.email ?? currentUserEmail ?? "usuario@demo.com",
          temporary_password: "Temp123456",
          reset_link: `${API_URL}/reset-password-demo`,
          invite_link: `${API_URL}/activate-admin-demo`,
          expires_in_minutes: "60",
        },
      });
      setEmailTemplatePreview(preview);
      setMessage("Vista previa de correo generada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la vista previa del correo.");
    }
  }

  async function resendEmailDispatch(dispatchId: number) {
    setMessage("");
    try {
      await apiPost<EmailDispatch>(`/api/email-dispatches/${dispatchId}/resend`, {});
      await loadData();
      setMessage("Correo reenviado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reenviar el correo.");
    }
  }

  async function sendTestEmail(testEmailRecipient: string) {
    if (!testEmailRecipient.trim()) {
      setMessage("Ingresa un correo de prueba.");
      return;
    }
    setMessage("");
    try {
      await apiPost<EmailDispatch>("/api/email-dispatches/test", {
        recipient_email: testEmailRecipient.trim(),
        template_key: emailTemplateForm.template_key,
      });
      await loadData();
      setMessage("Correo de prueba enviado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el correo de prueba.");
    }
  }

  async function previewTemplate() {
    setMessage("");
    try {
      const preview = await apiPost<CommunicationTemplatePreview>("/api/communication-templates/preview", {
        doctor_id: templateForm.doctor_id ? Number(templateForm.doctor_id) : null,
        channel: templateForm.channel,
        template_key: templateForm.template_key || "preview",
        title: templateForm.title || "Vista previa",
        body: templateForm.body,
        patient_id: selectedPatientId ? Number(selectedPatientId) : null,
        appointment_id: selectedSummary?.appointments[0]?.id ?? null,
        exam_order_id: getFirstExamOrderId(selectedSummary),
      });
      setTemplatePreview(preview);
      setMessage("Vista previa generada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la vista previa.");
    }
  }

  async function previewConfirmationTemplate() {
    setMessage("");
    try {
      const preview = await apiPost<CommunicationTemplatePreview>("/api/communication-templates/preview", {
        doctor_id: currentRoles.includes("doctor") ? (selectedDoctor?.id ?? null) : templateForm.doctor_id ? Number(templateForm.doctor_id) : null,
        channel: "whatsapp",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        title: templateForm.title || "Confirmación de cita",
        body: templateForm.body,
        patient_id: selectedPatientId ? Number(selectedPatientId) : null,
        appointment_id: selectedSummary?.appointments[0]?.id ?? null,
        exam_order_id: getFirstExamOrderId(selectedSummary),
      });
      setTemplatePreview(preview);
      setMessage("Vista previa generada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la vista previa.");
    }
  }

  async function generateDispatchesNow() {
    setMessage("");
    try {
      const result = await apiPost<CommunicationDispatchGeneration>("/api/communication-dispatches/generate", {});
      await loadData();
      setMessage(`Se generaron ${result.created_count} mensajes.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron generar los mensajes.");
    }
  }

  async function requeueDispatch(dispatchId: number) {
    setMessage("");
    try {
      await apiPost<CommunicationDispatch>(`/api/communication-dispatches/${dispatchId}/requeue`, {});
      await loadData();
      setMessage(`Mensaje ${dispatchId} reenviado a cola.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reenviar el mensaje.");
    }
  }

  async function requeueVisibleFailedDispatches() {
    setMessage("");
    try {
      const failedDispatchIds = communicationDispatches.filter((dispatch) => dispatch.status === "failed").map((dispatch) => dispatch.id);
      if (!failedDispatchIds.length) {
        setMessage("No hay mensajes fallidos en la vista actual.");
        return;
      }
      const result = await apiPost<CommunicationDispatchBatchRequeue>("/api/communication-dispatches/requeue-batch", {
        dispatch_ids: failedDispatchIds,
      });
      await loadData();
      setMessage(`Se reenviaron ${result.requeued_count} mensajes fallidos.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reenviar el lote.");
    }
  }

  async function toggleDispatchAttempts(dispatchId: number) {
    if (expandedDispatchId === dispatchId) {
      setExpandedDispatchId(null);
      return;
    }

    setMessage("");
    try {
      if (!dispatchAttempts[dispatchId]) {
        const attempts = await apiGet<CommunicationDispatchAttempt[]>(`/api/communication-dispatches/${dispatchId}/attempts`);
        setDispatchAttempts((current) => ({ ...current, [dispatchId]: attempts }));
      }
      setExpandedDispatchId(dispatchId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los intentos.");
    }
  }

  function updateDispatchStatus(dispatchId: number, status: "sent" | "delivered" | "failed") {
    setDispatchStatusForm({
      ...createDispatchStatusForm(),
      status,
    });
    setActiveDispatchStatusId(dispatchId);
  }

  async function sendAppointmentReminderNow(appointmentId: number) {
    setMessage("");
    try {
      await apiPost<CommunicationDispatch>(`/api/communication-dispatches/appointments/${appointmentId}/send-now`, {});
      await loadData();
      const dispatches = await apiGet<CommunicationDispatch[]>(`/api/communication-dispatches?appointment_id=${appointmentId}&limit=20`);
      setAppointmentDispatches((current) => ({ ...current, [appointmentId]: dispatches }));
      setExpandedAppointmentId(appointmentId);
      setMessage("Recordatorio enviado a cola para este contacto.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el recordatorio.");
    }
  }

  function closeDispatchStatusModal() {
    setActiveDispatchStatusId(null);
    setDispatchStatusForm(createDispatchStatusForm());
  }

  async function submitDispatchStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeDispatch) {
      return;
    }

    setMessage("");
    try {
      const payload: Record<string, string> = { status: dispatchStatusForm.status };
      if (dispatchStatusForm.status === "failed") {
        if (!dispatchStatusForm.error_message.trim()) {
          setMessage("Debes indicar el motivo del fallo.");
          return;
        }
        payload.error_message = dispatchStatusForm.error_message.trim();
      }
      await apiPatch<CommunicationDispatch>(`/api/communication-dispatches/${activeDispatch.id}`, payload);
      closeDispatchStatusModal();
      await loadData();
      setMessage(`Mensaje ${activeDispatch.id} actualizado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el mensaje.");
    }
  }

  async function submitTemplate(
    event: FormEvent<HTMLFormElement>,
    onResetTemplate: () => void,
  ) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<CommunicationTemplate>("/api/communication-templates", {
        doctor_id: templateForm.doctor_id ? Number(templateForm.doctor_id) : null,
        channel: templateForm.channel,
        template_key: templateForm.template_key,
        title: templateForm.title,
        body: templateForm.body,
        is_active: templateForm.is_active,
      });
      onResetTemplate();
      setTemplatePreview(null);
      await loadData();
      setMessage("Plantilla creada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la plantilla.");
    }
  }

  async function saveConfirmationTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const payload = {
        doctor_id: currentRoles.includes("doctor") ? (selectedDoctor?.id ?? null) : templateForm.doctor_id ? Number(templateForm.doctor_id) : null,
        channel: "whatsapp",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        title: templateForm.title || "Confirmación de cita",
        body: templateForm.body,
        is_active: true,
      };

      if (confirmationTemplate) {
        await apiPatch<CommunicationTemplate>(`/api/communication-templates/${confirmationTemplate.id}`, payload);
        setMessage("Mensaje de confirmación actualizado.");
      } else {
        await apiPost<CommunicationTemplate>("/api/communication-templates", payload);
        setMessage("Mensaje de confirmación guardado.");
      }

      await loadData();
      setTemplatePreview(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el mensaje de confirmación.");
    }
  }

  async function toggleTemplate(template: CommunicationTemplate) {
    setMessage("");
    try {
      await apiPatch<CommunicationTemplate>(`/api/communication-templates/${template.id}`, {
        is_active: !template.is_active,
      });
      await loadData();
      setMessage(`Plantilla ${template.is_active ? "desactivada" : "activada"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la plantilla.");
    }
  }

  return {
    activeDispatch,
    closeDispatchStatusModal,
    dispatchAttempts,
    dispatchStatusForm,
    emailTemplatePreview,
    expandedDispatchId,
    generateDispatchesNow,
    previewConfirmationTemplate,
    previewEmailTemplate,
    previewTemplate,
    requeueDispatch,
    requeueVisibleFailedDispatches,
    resendEmailDispatch,
    saveConfirmationTemplate,
    saveEmailTemplate,
    sendAppointmentReminderNow,
    sendTestEmail,
    setTemplatePreview,
    submitDispatchStatusUpdate,
    submitTemplate,
    templatePreview,
    toggleDispatchAttempts,
    toggleTemplate,
    updateDispatchStatus,
    setDispatchStatusForm,
  };
}
