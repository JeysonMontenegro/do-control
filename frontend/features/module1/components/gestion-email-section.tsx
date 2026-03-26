"use client";

import { useState } from "react";

import { EmailDispatchesGrid } from "@/features/module1/components/email-dispatches-grid";
import { formatDateTime } from "@/features/module1/console-utils";
import type {
  ClinicSetting,
  EmailDispatch,
  EmailTemplate,
  EmailTemplatePreview,
} from "@/features/module1/types";

type EmailTemplateFormState = {
  template_key: string;
  title: string;
  subject: string;
  html_body: string;
  text_body: string;
  is_active: boolean;
};

type EmailProcessKey =
  | "welcome_doctor_email_enabled"
  | "welcome_receptionist_email_enabled"
  | "password_reset_email_enabled"
  | "admin_invite_email_enabled"
  | "manual_test_email_enabled"
  | "manual_resend_email_enabled";

type GestionEmailSectionProps = {
  clinicSetting: ClinicSetting | null;
  emailDispatches: EmailDispatch[];
  emailTemplateForm: EmailTemplateFormState;
  emailTemplatePreview: EmailTemplatePreview | null;
  emailTemplates: EmailTemplate[];
  previewEmailTemplate: () => void;
  resendEmailDispatch: (dispatchId: number) => void;
  saveEmailTemplate: (event: React.FormEvent<HTMLFormElement>) => void;
  sendTestEmail: (recipientEmail: string) => void;
  setEmailTemplateForm: React.Dispatch<React.SetStateAction<EmailTemplateFormState>>;
  setTestEmailRecipient: React.Dispatch<React.SetStateAction<string>>;
  testEmailRecipient: string;
  toggleEmailDelivery: (enabled: boolean) => void;
  toggleEmailProcessSetting: (field: keyof ClinicSetting, enabled: boolean) => void;
};

const emailProcesses: Array<{
  key: EmailProcessKey;
  title: string;
  description: string;
}> = [
  {
    key: "welcome_doctor_email_enabled",
    title: "Bienvenida a doctor",
    description: "Se usa al crear un doctor con usuario de acceso.",
  },
  {
    key: "welcome_receptionist_email_enabled",
    title: "Bienvenida a recepcion",
    description: "Se usa al crear una recepcionista con acceso.",
  },
  {
    key: "password_reset_email_enabled",
    title: "Recuperacion de contrasena",
    description: "Se usa cuando un usuario solicita reset de password.",
  },
  {
    key: "admin_invite_email_enabled",
    title: "Invitacion de administrador",
    description: "Se usa cuando se invita a un nuevo admin por correo.",
  },
  {
    key: "manual_test_email_enabled",
    title: "Correo de prueba",
    description: "Se usa desde este panel para verificar plantillas y entrega.",
  },
  {
    key: "manual_resend_email_enabled",
    title: "Reenvio manual",
    description: "Se usa al reenviar dispatches desde el historial.",
  },
];

export function GestionEmailSection({
  clinicSetting,
  emailDispatches,
  emailTemplateForm,
  emailTemplatePreview,
  emailTemplates,
  previewEmailTemplate,
  resendEmailDispatch,
  saveEmailTemplate,
  sendTestEmail,
  setEmailTemplateForm,
  setTestEmailRecipient,
  testEmailRecipient,
  toggleEmailDelivery,
  toggleEmailProcessSetting,
}: GestionEmailSectionProps) {
  const [dispatchSearch, setDispatchSearch] = useState("");
  const [dispatchStatusFilter, setDispatchStatusFilter] = useState("all");
  const [activeDispatch, setActiveDispatch] = useState<EmailDispatch | null>(null);

  return (
    <>
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Correos</p>
            <h2>Estado de envio</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card">
            <small>Configuracion de clinica</small>
            <strong>{clinicSetting?.email_delivery_enabled ? "Habilitada" : "Deshabilitada"}</strong>
            <span>Este switch lo controla administracion desde la app.</span>
          </div>
          <div className="metric-card">
            <small>Entorno</small>
            <strong>{clinicSetting?.email_delivery_available ? "Disponible" : "Bloqueado"}</strong>
            <span>Depende del `.env` y de la API key configurada en el servidor.</span>
          </div>
          <div className="metric-card">
            <small>Estado efectivo</small>
            <strong>{clinicSetting?.email_delivery_active ? "Enviando" : "Pausado"}</strong>
            <span>Solo se envia correo real cuando clinica y entorno estan habilitados.</span>
          </div>
        </div>
        <div className="detail-panel compact-panel">
          <strong>Procesos que usan correo</strong>
          <span>Configura cada proceso por separado abajo.</span>
        </div>
        <div className="toggle-row">
          <div className="toggle-copy">
            <strong>Envio global de correos</strong>
            <span>Controla si la clinica puede mandar correos reales en todos los procesos.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={clinicSetting?.email_delivery_enabled ?? false}
            className={`switch-button ${(clinicSetting?.email_delivery_enabled ?? false) ? "switch-button-active" : ""}`}
            onClick={() => toggleEmailDelivery(!(clinicSetting?.email_delivery_enabled ?? false))}
          >
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">{clinicSetting?.email_delivery_enabled ? "Encendido" : "Apagado"}</span>
          </button>
        </div>
        {!clinicSetting?.email_delivery_available ? (
          <p className="empty-state">
            El entorno actual tiene bloqueado el envio real. Aunque habilites la clinica, los dispatches quedaran pausados o skipped hasta que el servidor reactive `EMAIL_DELIVERY_ENABLED=true`.
          </p>
        ) : null}
      </article>

      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Correos</p>
            <h2>Procesos habilitados</h2>
          </div>
        </div>
        <div className="table-list">
          {emailProcesses.map((item) => (
            <div className="simple-list-item" key={`email-process-${item.key}`}>
              <div className="toggle-row">
                <div className="toggle-copy">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={clinicSetting?.[item.key] ?? false}
                  className={`switch-button ${(clinicSetting?.[item.key] ?? false) ? "switch-button-active" : ""}`}
                  onClick={() => toggleEmailProcessSetting(item.key, !(clinicSetting?.[item.key] ?? false))}
                >
                  <span className="switch-track">
                    <span className="switch-thumb" />
                  </span>
                  <span className="switch-label">{clinicSetting?.[item.key] ? "Encendido" : "Apagado"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Correos</p>
            <h2>Plantillas transaccionales</h2>
          </div>
        </div>
        <form className="form-card compact-form" onSubmit={saveEmailTemplate}>
          <label>
            <span>Tipo de correo</span>
            <select
              value={emailTemplateForm.template_key}
              onChange={(event) => {
                const template = emailTemplates.find((item) => item.template_key === event.target.value);
                if (template) {
                  setEmailTemplateForm({
                    template_key: template.template_key,
                    title: template.title,
                    subject: template.subject,
                    html_body: template.html_body,
                    text_body: template.text_body ?? "",
                    is_active: template.is_active,
                  });
                } else {
                  setEmailTemplateForm((current) => ({ ...current, template_key: event.target.value }));
                }
              }}
            >
              <option value="welcome_email">Bienvenida</option>
              <option value="password_reset_email">Recuperacion de contrasena</option>
              <option value="admin_invite_email">Invitacion de administrador</option>
            </select>
          </label>
          <label>
            <span>Titulo interno</span>
            <input value={emailTemplateForm.title} onChange={(event) => setEmailTemplateForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Asunto</span>
            <input value={emailTemplateForm.subject} onChange={(event) => setEmailTemplateForm((current) => ({ ...current, subject: event.target.value }))} />
          </label>
          <label>
            <span>HTML</span>
            <textarea value={emailTemplateForm.html_body} onChange={(event) => setEmailTemplateForm((current) => ({ ...current, html_body: event.target.value }))} />
          </label>
          <label>
            <span>Texto plano</span>
            <textarea value={emailTemplateForm.text_body} onChange={(event) => setEmailTemplateForm((current) => ({ ...current, text_body: event.target.value }))} />
          </label>
          <p className="empty-state">
            Variables disponibles: {"{app_name}"}, {"{recipient_name}"}, {"{email}"}, {"{temporary_password}"}, {"{reset_link}"}, {"{invite_link}"} y {"{expires_in_minutes}"}.
          </p>
          {emailTemplatePreview ? (
            <div className="detail-stack">
              <strong>{emailTemplatePreview.rendered_subject}</strong>
              <div className="message-preview">{emailTemplatePreview.rendered_html_body}</div>
              {emailTemplatePreview.rendered_text_body ? <div className="message-preview">{emailTemplatePreview.rendered_text_body}</div> : null}
            </div>
          ) : null}
          <div className="row-actions">
            <button type="button" className="secondary-button" onClick={previewEmailTemplate}>
              Vista previa
            </button>
            <button type="submit">Guardar plantilla</button>
          </div>
        </form>
        <div className="form-card compact-form">
          <label>
            <span>Correo de prueba</span>
            <input
              type="email"
              value={testEmailRecipient}
              onChange={(event) => setTestEmailRecipient(event.target.value)}
              placeholder="tu-correo@dominio.com"
            />
          </label>
          <div className="row-actions">
            <button type="button" className="success-button" onClick={() => sendTestEmail(testEmailRecipient)}>
              Enviar correo de prueba
            </button>
          </div>
        </div>
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Correos</p>
            <h2>Envios recientes</h2>
          </div>
          <div className="section-tools-panel email-dispatch-toolbar">
            <select
              value={dispatchStatusFilter}
              onChange={(event) => {
                setDispatchStatusFilter(event.target.value);
              }}
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="sent">Enviados</option>
              <option value="delivered">Entregados</option>
              <option value="failed">Fallidos</option>
              <option value="skipped">Omitidos</option>
            </select>
            <input
              className="search-input"
              placeholder="Buscar destinatario, asunto, template o error"
              value={dispatchSearch}
              onChange={(event) => setDispatchSearch(event.target.value)}
            />
          </div>
        </div>
        <EmailDispatchesGrid
          dispatches={emailDispatches}
          quickFilter={dispatchSearch}
          statusFilter={dispatchStatusFilter}
          onOpenDispatch={setActiveDispatch}
          onResendDispatch={resendEmailDispatch}
        />
      </article>
      {activeDispatch ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card email-dispatch-modal">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Correo</p>
                <h2>{activeDispatch.subject}</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setActiveDispatch(null)}>
                Cerrar
              </button>
            </div>
            <div className="detail-stack">
              <div className="detail-panel">
                <strong>{activeDispatch.recipient_email}</strong>
                <span>Estado: {activeDispatch.status}</span>
                <span>Template: {activeDispatch.template_key ?? "Correo libre"}</span>
                <span>Proveedor: {activeDispatch.provider || "Sin proveedor"}</span>
                <span>Creado: {formatDateTime(activeDispatch.created_at)}</span>
                {activeDispatch.provider_message_id ? <span>Id proveedor: {activeDispatch.provider_message_id}</span> : null}
                {activeDispatch.error_message ? <span>Error: {activeDispatch.error_message}</span> : null}
              </div>
              <div className="detail-panel">
                <strong>Asunto</strong>
                <div className="message-preview">{activeDispatch.subject}</div>
              </div>
              <div className="detail-panel">
                <strong>Texto plano</strong>
                <div className="message-preview">{activeDispatch.text_body ?? "Sin versión en texto plano."}</div>
              </div>
              <div className="detail-panel">
                <strong>HTML renderizado</strong>
                <div className="message-preview">{activeDispatch.html_body}</div>
              </div>
              <div className="row-actions">
                <button type="button" className="success-button" onClick={() => resendEmailDispatch(activeDispatch.id)}>
                  Reenviar correo
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
