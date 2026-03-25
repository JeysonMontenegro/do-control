"use client";

import { useState } from "react";

import { formatDateTime } from "@/features/module1/console-utils";
import type {
  ClinicSetting,
  EmailWhitelistState,
  EmailDispatch,
  EmailTemplate,
  EmailTemplatePreview,
  MessagingWhitelistState,
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
  emailWhitelist: EmailWhitelistState | null;
  messagingWhitelist: MessagingWhitelistState | null;
  onAddEmailWhitelistAddress: (email: string) => void;
  onAddMessagingWhitelistPhone: (phone: string) => void;
  onRemoveEmailWhitelistAddress: (email: string) => void;
  onRemoveMessagingWhitelistPhone: (phone: string) => void;
  onToggleEmailWhitelist: (enabled: boolean) => void;
  onToggleMessagingWhitelist: (enabled: boolean) => void;
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
  emailWhitelist,
  messagingWhitelist,
  onAddEmailWhitelistAddress,
  onAddMessagingWhitelistPhone,
  onRemoveEmailWhitelistAddress,
  onRemoveMessagingWhitelistPhone,
  onToggleEmailWhitelist,
  onToggleMessagingWhitelist,
  setEmailTemplateForm,
  setTestEmailRecipient,
  testEmailRecipient,
  toggleEmailDelivery,
  toggleEmailProcessSetting,
}: GestionEmailSectionProps) {
  const [newWhitelistPhone, setNewWhitelistPhone] = useState("");
  const [newWhitelistEmail, setNewWhitelistEmail] = useState("");

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
            <p className="eyebrow">Whitelist</p>
            <h2>Destinatarios autorizados</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card">
            <small>WhatsApp</small>
            <strong>{messagingWhitelist?.enabled ? "Protegida" : "Libre"}</strong>
            <span>{messagingWhitelist?.phones.length ?? 0} número(s) autorizados.</span>
          </div>
          <div className="metric-card">
            <small>Correo</small>
            <strong>{emailWhitelist?.enabled ? "Protegido" : "Libre"}</strong>
            <span>{emailWhitelist?.addresses.length ?? 0} correo(s) autorizados.</span>
          </div>
          <div className="metric-card">
            <small>Mantenimiento</small>
            <strong>QA seguro</strong>
            <span>Úsalo para controlar exactamente quién puede recibir pruebas.</span>
          </div>
        </div>

        <div className="table-list">
          <div className="simple-list-item">
            <div className="toggle-row">
              <div className="toggle-copy">
                <strong>Whitelist de WhatsApp</strong>
                <span>Cuando está encendida, solo los números de esta lista pueden recibir mensajes.</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={messagingWhitelist?.enabled ?? false}
                className={`switch-button ${(messagingWhitelist?.enabled ?? false) ? "switch-button-active" : ""}`}
                onClick={() => onToggleMessagingWhitelist(!(messagingWhitelist?.enabled ?? false))}
              >
                <span className="switch-track">
                  <span className="switch-thumb" />
                </span>
                <span className="switch-label">{messagingWhitelist?.enabled ? "Encendido" : "Apagado"}</span>
              </button>
            </div>
            <div className="form-card compact-form whitelist-maintenance-card">
              <label>
                <span>Agregar número</span>
                <input
                  value={newWhitelistPhone}
                  onChange={(event) => setNewWhitelistPhone(event.target.value)}
                  placeholder="50252827538"
                />
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="success-button"
                  disabled={!newWhitelistPhone.trim()}
                  onClick={() => {
                    onAddMessagingWhitelistPhone(newWhitelistPhone);
                    setNewWhitelistPhone("");
                  }}
                >
                  Agregar número
                </button>
              </div>
              <div className="table-list">
                {messagingWhitelist?.phones.length ? (
                  messagingWhitelist.phones.map((phone) => (
                    <div className="simple-list-item whitelist-list-item" key={`messaging-whitelist-${phone}`}>
                      <strong>{phone}</strong>
                      <button type="button" className="secondary-button" onClick={() => onRemoveMessagingWhitelistPhone(phone)}>
                        Quitar
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Todavía no hay números autorizados.</p>
                )}
              </div>
            </div>
          </div>

          <div className="simple-list-item">
            <div className="toggle-row">
              <div className="toggle-copy">
                <strong>Whitelist de correos</strong>
                <span>Cuando está encendida, solo los correos de esta lista pueden recibir envíos.</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailWhitelist?.enabled ?? false}
                className={`switch-button ${(emailWhitelist?.enabled ?? false) ? "switch-button-active" : ""}`}
                onClick={() => onToggleEmailWhitelist(!(emailWhitelist?.enabled ?? false))}
              >
                <span className="switch-track">
                  <span className="switch-thumb" />
                </span>
                <span className="switch-label">{emailWhitelist?.enabled ? "Encendido" : "Apagado"}</span>
              </button>
            </div>
            <div className="form-card compact-form whitelist-maintenance-card">
              <label>
                <span>Agregar correo</span>
                <input
                  type="email"
                  value={newWhitelistEmail}
                  onChange={(event) => setNewWhitelistEmail(event.target.value)}
                  placeholder="qa@dominio.com"
                />
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="success-button"
                  disabled={!newWhitelistEmail.trim()}
                  onClick={() => {
                    onAddEmailWhitelistAddress(newWhitelistEmail);
                    setNewWhitelistEmail("");
                  }}
                >
                  Agregar correo
                </button>
              </div>
              <div className="table-list">
                {emailWhitelist?.addresses.length ? (
                  emailWhitelist.addresses.map((email) => (
                    <div className="simple-list-item whitelist-list-item" key={`email-whitelist-${email}`}>
                      <strong>{email}</strong>
                      <button type="button" className="secondary-button" onClick={() => onRemoveEmailWhitelistAddress(email)}>
                        Quitar
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">Todavía no hay correos autorizados.</p>
                )}
              </div>
            </div>
          </div>
        </div>
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
        </div>
        <div className="table-list">
          {emailDispatches.map((dispatch) => (
            <div className="simple-list-item" key={`email-dispatch-${dispatch.id}`}>
              <strong>{dispatch.subject}</strong>
              <span>{dispatch.recipient_email}</span>
              <span>{dispatch.template_key ?? "Correo libre"}</span>
              <span>{dispatch.status}</span>
              <span>{formatDateTime(dispatch.created_at)}</span>
              {dispatch.error_message ? <span>{dispatch.error_message}</span> : null}
              <div className="row-actions">
                <button type="button" className="success-button" onClick={() => resendEmailDispatch(dispatch.id)}>
                  Reenviar correo
                </button>
              </div>
            </div>
          ))}
          {!emailDispatches.length ? <p className="empty-state">Todavia no hay correos enviados.</p> : null}
        </div>
      </article>
    </>
  );
}
