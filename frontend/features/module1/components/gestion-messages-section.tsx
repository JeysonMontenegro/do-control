"use client";

import { useMemo, useState } from "react";

import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import { CONFIRMATION_TEMPLATE_KEY } from "@/features/module1/console-config";
import type { CommunicationTemplate, CommunicationTemplatePreview } from "@/features/module1/types";

type GestionMessagesSectionProps = {
  communicationTemplates: CommunicationTemplate[];
  previewConfirmationTemplate: () => void;
  scopedDoctorId: number | null;
  templatePreview: CommunicationTemplatePreview | null;
};

export function GestionMessagesSection({
  communicationTemplates,
  previewConfirmationTemplate,
  scopedDoctorId,
  templatePreview,
}: GestionMessagesSectionProps) {
  const [templateSearch, setTemplateSearch] = useState("");
  const scopedTemplates = communicationTemplates.filter(
    (template) => scopedDoctorId === null || template.doctor_id === null || template.doctor_id === scopedDoctorId,
  );
  const activeConfirmationTemplate =
    scopedTemplates.find((template) => template.template_key === CONFIRMATION_TEMPLATE_KEY && template.is_active) ??
    scopedTemplates.find((template) => template.template_key === CONFIRMATION_TEMPLATE_KEY) ??
    null;
  const activeTemplates = scopedTemplates.filter((template) => template.is_active);
  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) {
      return activeTemplates;
    }
    return activeTemplates.filter((template) =>
      [template.title, template.template_key, template.body].join(" ").toLowerCase().includes(query),
    );
  }, [activeTemplates, templateSearch]);
  const templateColumns = useMemo<ClinicalGridColumn<CommunicationTemplate>[]>(
    () => [
      {
        headerName: "Título",
        field: "title",
        minWidth: 220,
        flex: 1.2,
        exportValue: (row) => row.title,
      },
      {
        headerName: "Clave",
        field: "template_key",
        minWidth: 180,
        exportValue: (row) => row.template_key,
      },
      {
        headerName: "Uso",
        minWidth: 170,
        valueGetter: ({ data }) => (data?.template_key === CONFIRMATION_TEMPLATE_KEY ? "Mensaje de confirmación" : "Mensaje automático"),
        exportValue: (row) => (row.template_key === CONFIRMATION_TEMPLATE_KEY ? "Mensaje de confirmación" : "Mensaje automático"),
      },
      {
        headerName: "Estado",
        field: "is_active",
        minWidth: 120,
        valueGetter: ({ data }) => (data?.is_active ? "Activo" : "Inactivo"),
        exportValue: (row) => (row.is_active ? "Activo" : "Inactivo"),
      },
      {
        headerName: "Contenido",
        field: "body",
        minWidth: 320,
        flex: 1.8,
        exportValue: (row) => row.body,
      },
    ],
    [],
  );

  return (
    <>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Mensajes</p>
            <h2>Template actual de WhatsApp</h2>
          </div>
        </div>
        <div className="detail-stack">
          <p className="empty-state">
            Los templates de WhatsApp se administran en appoint-me y aquí solo se muestran en modo lectura para evitar desalinear lo aprobado en el canal.
          </p>
          {activeConfirmationTemplate ? (
            <div className="detail-panel">
              <strong>{activeConfirmationTemplate.title}</strong>
              <span>Clave: {activeConfirmationTemplate.template_key}</span>
              <span>{activeConfirmationTemplate.is_active ? "Activo" : "Inactivo"}</span>
              <div className="message-preview">{activeConfirmationTemplate.body}</div>
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={previewConfirmationTemplate}>
                  Ver ejemplo renderizado
                </button>
              </div>
            </div>
          ) : (
            <p className="empty-state">Todavía no hay un template de confirmación visible para este contexto.</p>
          )}
          {templatePreview ? <div className="message-preview">{templatePreview.rendered_message}</div> : null}
        </div>
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Mensajes</p>
            <h2>Templates visibles</h2>
          </div>
        </div>
        <ClinicalDataGrid<CommunicationTemplate>
          columns={templateColumns}
          emptyMessage="No hay templates activos visibles con ese filtro."
          exportFileName="templates-whatsapp-visibles"
          quickFilter={templateSearch}
          rowData={filteredTemplates}
          extraToolbar={
            <input
              className="search-input"
              placeholder="Buscar por título, clave o contenido"
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
            />
          }
        />
      </article>
    </>
  );
}
