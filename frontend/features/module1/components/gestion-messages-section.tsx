"use client";

import { CONFIRMATION_TEMPLATE_KEY } from "@/features/module1/console-config";
import type { CommunicationTemplate, CommunicationTemplatePreview } from "@/features/module1/types";

type TemplateFormState = {
  doctor_id: string;
  channel: string;
  template_key: string;
  title: string;
  body: string;
  is_active: boolean;
};

type GestionMessagesSectionProps = {
  communicationTemplates: CommunicationTemplate[];
  confirmationBodyPlaceholder: string;
  confirmationTitlePlaceholder: string;
  previewConfirmationTemplate: () => void;
  saveConfirmationTemplate: (event: React.FormEvent<HTMLFormElement>) => void;
  scopedDoctorId: number | null;
  setTemplateForm: React.Dispatch<React.SetStateAction<TemplateFormState>>;
  templateForm: TemplateFormState;
  templatePreview: CommunicationTemplatePreview | null;
  toggleTemplate: (template: CommunicationTemplate) => void;
};

export function GestionMessagesSection({
  communicationTemplates,
  confirmationBodyPlaceholder,
  confirmationTitlePlaceholder,
  previewConfirmationTemplate,
  saveConfirmationTemplate,
  scopedDoctorId,
  setTemplateForm,
  templateForm,
  templatePreview,
  toggleTemplate,
}: GestionMessagesSectionProps) {
  const scopedTemplates = communicationTemplates.filter(
    (template) => scopedDoctorId === null || template.doctor_id === null || template.doctor_id === scopedDoctorId,
  );

  return (
    <>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Mensajes</p>
            <h2>Mensaje de confirmacion</h2>
          </div>
        </div>
        <form className="form-card compact-form" onSubmit={saveConfirmationTemplate}>
          <label>
            <span>Titulo interno</span>
            <input
              value={templateForm.title}
              onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))}
              placeholder={confirmationTitlePlaceholder}
            />
          </label>
          <label>
            <span>Mensaje</span>
            <textarea
              value={templateForm.body}
              onChange={(event) => setTemplateForm((current) => ({ ...current, body: event.target.value }))}
              placeholder={confirmationBodyPlaceholder}
              required
            />
          </label>
          <p className="empty-state">
            Variables disponibles: {"{patient_name}"}, {"{doctor_name}"}, {"{appointment_date}"} y {"{appointment_time}"}.
          </p>
          {templatePreview ? <div className="message-preview">{templatePreview.rendered_message}</div> : null}
          <div className="row-actions">
            <button type="button" className="secondary-button" onClick={previewConfirmationTemplate}>
              Vista previa
            </button>
            <button type="submit">Guardar mensaje</button>
          </div>
        </form>
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Mensajes</p>
            <h2>Plantillas activas</h2>
          </div>
        </div>
        <div className="table-list">
          {scopedTemplates.map((template) => (
            <div className="simple-list-item" key={`template-${template.id}`}>
              <strong>{template.title}</strong>
              <span>{template.template_key === CONFIRMATION_TEMPLATE_KEY ? "Mensaje de confirmacion" : "Mensaje automatico"}</span>
              <span>{template.is_active ? "Activo" : "Inactivo"}</span>
              <div className="message-preview">{template.body}</div>
              <div className="row-actions">
                <button
                  type="button"
                  className="success-button"
                  onClick={() =>
                    setTemplateForm({
                      doctor_id: template.doctor_id ? String(template.doctor_id) : "",
                      channel: template.channel,
                      template_key: template.template_key,
                      title: template.title,
                      body: template.body,
                      is_active: template.is_active,
                    })
                  }
                >
                  Usar como base
                </button>
                <button
                  type="button"
                  className={template.is_active ? "danger-button" : "success-button"}
                  onClick={() => toggleTemplate(template)}
                >
                  {template.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
          {!communicationTemplates.length ? <p className="empty-state">Todavia no hay mensajes configurados.</p> : null}
        </div>
      </article>
    </>
  );
}
