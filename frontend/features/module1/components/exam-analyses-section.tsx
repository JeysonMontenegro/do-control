"use client";

import { useMemo } from "react";

import { EmptyStatePanel } from "@/features/module1/components/empty-state-panel";
import { formatDateTime } from "@/features/module1/console-utils";
import type { ExamAnalysis, FileAttachment, PatientSummary } from "@/features/module1/types";

type ExamAnalysesSectionProps = {
  chatDraft: string;
  chatMessages: Array<{ role: "user" | "assistant"; content: string }>;
  isLoadingAnalyses: boolean;
  isRefreshingViewer: boolean;
  isRequestingAnalysis: boolean;
  onChatDraftChange: (value: string) => void;
  onRequestAnalysis: () => void;
  onSelectAnalysis: (analysisId: number) => void;
  onSelectAttachment: (attachmentId: number) => void;
  onSendChatMessage: () => void;
  selectedAnalysis: ExamAnalysis | null;
  selectedAnalysisId: number | null;
  selectedAttachmentAnalyses: ExamAnalysis[];
  selectedAttachment: FileAttachment | null;
  selectedAttachmentId: number | null;
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  studyAttachments: FileAttachment[];
  viewerUrl: string | null;
};

export function ExamAnalysesSection({
  chatDraft,
  chatMessages,
  isLoadingAnalyses,
  isRefreshingViewer,
  isRequestingAnalysis,
  onChatDraftChange,
  onRequestAnalysis,
  onSelectAnalysis,
  onSelectAttachment,
  onSendChatMessage,
  selectedAnalysis,
  selectedAnalysisId,
  selectedAttachmentAnalyses,
  selectedAttachment,
  selectedAttachmentId,
  selectedPatientId,
  selectedSummary,
  studyAttachments,
  viewerUrl,
}: ExamAnalysesSectionProps) {
  const keyResults = useMemo(() => normalizeStructuredResults(selectedAnalysis?.structured_results), [selectedAnalysis?.structured_results]);
  const anomalyCards = useMemo(() => normalizeAnomalies(selectedAnalysis?.anomalies), [selectedAnalysis?.anomalies]);

  if (!selectedPatientId || !selectedSummary) {
    return (
      <section className="tab-layout">
        <article className="card section-card span-two">
          <EmptyStatePanel
            eyebrow="Examenes con IA"
            title="Selecciona un paciente para abrir el workspace"
            body="La vista usa los estudios PDF ya adjuntados al expediente del paciente. Desde aqui podras pedir el analisis, revisar hallazgos, validar evidencia y consultar el documento."
          />
        </article>
      </section>
    );
  }

  return (
    <section className="tab-layout">
      <article className="card section-card span-two exam-ia-hero">
        <div>
          <p className="eyebrow">Examenes con IA</p>
          <h2>Lectura estructurada del estudio clinico</h2>
          <p className="exam-ia-hero-copy">
            Usa el expediente de {selectedSummary.patient.first_name} {selectedSummary.patient.last_name} para procesar PDFs, revisar hallazgos alterados y contrastar evidencia contra el documento original.
          </p>
        </div>
        <div className="exam-ia-hero-metrics">
          <div className="exam-ia-metric">
            <strong>{studyAttachments.length}</strong>
            <span>Estudios disponibles</span>
          </div>
          <div className="exam-ia-metric">
            <strong>{selectedAnalysis ? statusLabel(selectedAnalysis.status) : "Sin analisis"}</strong>
            <span>Estado tecnico</span>
          </div>
          <div className="exam-ia-metric">
            <strong>{selectedAnalysis ? reviewStatusLabel(selectedAnalysis.review_status) : "No listo"}</strong>
            <span>Revision clinica</span>
          </div>
        </div>
      </article>

      <article className="card section-card exam-ia-left">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Flujo</p>
            <h2>Workspace de analisis</h2>
          </div>
          <button type="button" className="secondary-button" onClick={onRequestAnalysis} disabled={!selectedAttachment || isRequestingAnalysis}>
            {isRequestingAnalysis ? "Solicitando..." : "Solicitar analisis"}
          </button>
        </div>

        <div className="exam-ia-stepper">
          <div className={`exam-ia-step ${selectedAttachment ? "is-complete" : ""}`}>
            <strong>1. Estudio cargado</strong>
            <span>{selectedAttachment ? selectedAttachment.file_name : "Selecciona un PDF del expediente."}</span>
          </div>
          <div className={`exam-ia-step ${selectedAnalysis ? "is-complete" : ""}`}>
            <strong>2. Orquestacion tecnica</strong>
            <span>{selectedAnalysis ? statusLabel(selectedAnalysis.status) : "Pendiente de solicitud."}</span>
          </div>
          <div className={`exam-ia-step ${selectedAnalysis?.status === "completed" ? "is-complete" : ""}`}>
            <strong>3. Lectura estructurada</strong>
            <span>{selectedAnalysis?.summary ? "Resumen y hallazgos listos." : "Esperando resultado estructurado."}</span>
          </div>
          <div className={`exam-ia-step ${selectedAnalysis?.review_status === "reviewed" ? "is-complete" : ""}`}>
            <strong>4. Validacion medica</strong>
            <span>{selectedAnalysis ? reviewStatusLabel(selectedAnalysis.review_status) : "Aun no disponible."}</span>
          </div>
        </div>

        <div className="exam-ia-upload-strip">
          <div>
            <p className="eyebrow">Estudios PDF</p>
            <h3>Selecciona la fuente del analisis</h3>
          </div>
          {isLoadingAnalyses ? <span className="exam-ia-inline-status">Actualizando analisis...</span> : null}
        </div>

        {studyAttachments.length ? (
          <div className="exam-ia-study-list">
            {studyAttachments.map((attachment) => {
              const isActive = attachment.id === selectedAttachmentId;
              return (
                <button
                  key={attachment.id}
                  type="button"
                  className={`exam-ia-study-card ${isActive ? "is-active" : ""}`}
                  onClick={() => onSelectAttachment(attachment.id)}
                >
                  <strong>{attachment.file_name}</strong>
                  <span>{attachment.file_type.replaceAll("_", " ")}</span>
                  <span>{attachment.created_at ? formatDateTime(attachment.created_at) : "Sin fecha"}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyStatePanel
            eyebrow="Sin estudios"
            title="No hay PDFs de laboratorio en este expediente"
            body="Adjunta primero un PDF desde Consultas para activar el flujo de Examenes con IA."
          />
        )}

        <div className="exam-ia-analysis-list">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Ejecuciones</p>
              <h3>Historial por estudio</h3>
            </div>
          </div>
          {selectedAttachment ? (
            <AttachmentAnalysisList
              analyses={selectedAttachmentAnalyses}
              onSelectAnalysis={onSelectAnalysis}
              selectedAnalysisId={selectedAnalysisId}
            />
          ) : <p className="exam-ia-muted">Selecciona un estudio para ver sus ejecuciones.</p>}
        </div>
      </article>

      <article className="card section-card exam-ia-main">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Resumen Ejecutivo</p>
            <h2>{selectedAnalysis?.summary ? "Lectura consolidada" : "Resultado estructurado pendiente"}</h2>
          </div>
          {selectedAnalysis ? <span className={`exam-ia-status-pill status-${selectedAnalysis.status}`}>{statusLabel(selectedAnalysis.status)}</span> : null}
        </div>

        {selectedAnalysis ? (
          <div className="exam-ia-detail-grid">
            <section className="exam-ia-block">
              <h3>Resumen Ejecutivo</h3>
              <p>{selectedAnalysis.summary ?? "Todavia no hay resumen ejecutivo para este estudio."}</p>
            </section>
            <section className="exam-ia-block">
              <h3>Hallazgos Alterados</h3>
              {anomalyCards.length ? (
                <div className="exam-ia-card-list">
                  {anomalyCards.map((item, index) => (
                    <article className="exam-ia-finding-card" key={`${item.parameter}-${index}`}>
                      <div className="exam-ia-finding-head">
                        <strong>{item.parameter}</strong>
                        <span className={`exam-ia-severity severity-${item.severityToken}`}>{item.severity}</span>
                      </div>
                      <p>{item.interpretation}</p>
                      <div className="exam-ia-finding-meta">
                        <span>Valor: {item.value}</span>
                        <span>Rango: {item.referenceRange}</span>
                      </div>
                      <div className="exam-ia-evidence-stack">
                        <div>
                          <strong>Evidencia</strong>
                          <span>{item.evidence}</span>
                        </div>
                        <div>
                          <strong>Paginas relevantes</strong>
                          <span>{item.pages}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="exam-ia-muted">No se registran hallazgos alterados en la estructura cargada.</p>
              )}
            </section>
            <section className="exam-ia-block">
              <h3>Resultados Clave</h3>
              {keyResults.length ? (
                <div className="exam-ia-key-results">
                  {keyResults.map((item) => (
                    <div className="exam-ia-key-result" key={item.label}>
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="exam-ia-muted">El payload todavia no incluye resultados clave legibles para esta vista.</p>
              )}
            </section>
            <section className="exam-ia-block">
              <h3>Evidencia del Documento</h3>
              <p>
                Contrasta el resumen con el PDF original del lado derecho. Esta vista funciona como apoyo clinico y no reemplaza la interpretacion
                final del medico tratante.
              </p>
              <div className="exam-ia-audit-grid">
                <div>
                  <strong>Ultimo callback</strong>
                  <span>{selectedAnalysis.last_callback_at ? formatDateTime(selectedAnalysis.last_callback_at) : "Sin callback"}</span>
                </div>
                <div>
                  <strong>Revision</strong>
                  <span>{reviewStatusLabel(selectedAnalysis.review_status)}</span>
                </div>
                <div>
                  <strong>Proveedor</strong>
                  <span>{selectedAnalysis.provider_name}</span>
                </div>
                <div>
                  <strong>Job</strong>
                  <span>{selectedAnalysis.provider_job_id ?? "Pendiente"}</span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <EmptyStatePanel
            eyebrow="Pendiente"
            title="Todavia no hay analisis para este estudio"
            body="Selecciona un PDF y usa Solicitar analisis para iniciar el pipeline. La vista se ira llenando a medida que llegue el callback tecnico."
          />
        )}
      </article>

      <article className="card section-card exam-ia-right">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Documento y chat</p>
            <h2>Visor PDF y Preguntar al Estudio</h2>
          </div>
          {isRefreshingViewer ? <span className="exam-ia-inline-status">Preparando visor...</span> : null}
        </div>
        <div className="exam-ia-viewer-shell">
          {viewerUrl ? (
            <iframe className="exam-ia-pdf-frame" src={viewerUrl} title={selectedAttachment?.file_name ?? "PDF"} />
          ) : (
            <div className="exam-ia-viewer-empty">Selecciona un estudio PDF para abrir el visor.</div>
          )}
        </div>
        <div className="exam-ia-chat-shell">
          <div className="exam-ia-chat-header">
            <strong>Preguntar al Estudio</strong>
            <span>Secundario al resumen estructurado</span>
          </div>
          <div className="exam-ia-chat-log">
            {chatMessages.length ? (
              chatMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`exam-ia-chat-bubble ${message.role === "assistant" ? "is-assistant" : "is-user"}`}>
                  {message.content}
                </div>
              ))
            ) : (
              <div className="exam-ia-chat-placeholder">
                Prueba preguntas como "dame el resumen", "que hallazgos alterados hay" o "que evidencia tengo".
              </div>
            )}
          </div>
          <div className="exam-ia-chat-composer">
            <textarea
              value={chatDraft}
              onChange={(event) => onChatDraftChange(event.target.value)}
              placeholder="Escribe una pregunta contextual sobre el estudio"
              rows={3}
            />
            <button type="button" className="secondary-button" onClick={onSendChatMessage}>
              Consultar
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

function AttachmentAnalysisList({ analyses, onSelectAnalysis, selectedAnalysisId }: { analyses: ExamAnalysis[]; onSelectAnalysis?: (analysisId: number) => void; selectedAnalysisId?: number | null }) {
  if (!analyses.length) {
    return <p className="exam-ia-muted">Este estudio aun no tiene ejecuciones registradas.</p>;
  }
  return (
    <div className="exam-ia-run-list">
      {analyses.map((analysis) => (
        <button
          key={analysis.id}
          type="button"
          className={`exam-ia-run-card ${selectedAnalysisId === analysis.id ? "is-active" : ""}`}
          onClick={() => onSelectAnalysis?.(analysis.id)}
        >
          <strong>Analisis #{analysis.id}</strong>
          <span>{statusLabel(analysis.status)}</span>
          <span>{analysis.completed_at ? formatDateTime(analysis.completed_at) : analysis.created_at ? formatDateTime(analysis.created_at) : "Sin fecha"}</span>
        </button>
      ))}
    </div>
  );
}

function normalizeAnomalies(anomalies: Array<Record<string, unknown>> | null | undefined) {
  return (anomalies ?? []).map((entry, index) => {
    const parameter = String(entry.parameter ?? entry.code ?? `Hallazgo ${index + 1}`);
    const severity = String(entry.severity ?? "Pendiente");
    return {
      parameter,
      severity,
      severityToken: severity.toLowerCase().replaceAll(/\s+/g, "-"),
      interpretation: String(entry.interpretation ?? entry.summary ?? "Sin interpretacion resumida."),
      value: String(entry.value ?? entry.measured_value ?? "Sin dato"),
      referenceRange: String(entry.reference_range ?? entry.range ?? "No informado"),
      evidence: String(entry.evidence ?? entry.evidence_snippet ?? "Sin snippet disponible"),
      pages: String(entry.pages ?? entry.relevant_pages ?? "No informadas"),
    };
  });
}

function normalizeStructuredResults(structuredResults: Record<string, unknown> | Array<unknown> | null | undefined) {
  if (!structuredResults || Array.isArray(structuredResults)) {
    return [];
  }
  return Object.entries(structuredResults)
    .slice(0, 8)
    .map(([label, rawValue]) => ({
      label,
      value: typeof rawValue === "object" && rawValue !== null ? JSON.stringify(rawValue) : String(rawValue),
    }));
}

function statusLabel(status: ExamAnalysis["status"]) {
  switch (status) {
    case "pending_submission":
      return "Pendiente";
    case "submitted":
      return "Enviado";
    case "processing":
      return "Procesando";
    case "completed":
      return "Completado";
    case "failed":
      return "Fallido";
    default:
      return status;
  }
}

function reviewStatusLabel(status: ExamAnalysis["review_status"]) {
  switch (status) {
    case "not_ready":
      return "No listo";
    case "pending_review":
      return "Pendiente de revision";
    case "reviewed":
      return "Revisado";
    default:
      return status;
  }
}
