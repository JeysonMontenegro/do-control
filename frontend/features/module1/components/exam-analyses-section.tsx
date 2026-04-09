"use client";

import { useMemo, useState } from "react";

import { ClinicalDataGrid, type ClinicalGridColumn } from "@/features/module1/components/clinical-data-grid";
import { EmptyStatePanel } from "@/features/module1/components/empty-state-panel";
import { formatDateTime } from "@/features/module1/console-utils";
import type { ExamAnalysis, FileAttachment, PatientSummary } from "@/features/module1/types";

type AnalysisTab = "resumen" | "anomalias" | "resultados" | "navegacion" | "evidencia";

type AnomalyCard = {
  parameter: string;
  severity: string;
  severityToken: string;
  interpretation: string;
  value: string;
  referenceRange: string;
  evidence: string;
  pages: string;
  primaryPage: number | null;
};

type StructuredResultCard = {
  label: string;
  value: string;
  meta: string;
  primaryPage: number | null;
};

type DocumentNavigationItem = {
  label: string;
  reason: string;
  pagesLabel: string;
  primaryPage: number | null;
};

type EvidenceItem = {
  preview: string;
  pagesLabel: string;
  primaryPage: number | null;
};

type ExamAnalysesSectionProps = {
  chatDraft: string;
  chatMessages: Array<{ role: "user" | "assistant"; content: string }>;
  currentDeepLink: string | null;
  isLoadingAnalyses: boolean;
  isRefreshingViewer: boolean;
  isRequestingAnalysis: boolean;
  onChatDraftChange: (value: string) => void;
  onCopyDeepLink: () => void;
  onOpenPdfPage: (page: number) => void;
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
  viewerPage: number | null;
  viewerUrl: string | null;
  viewerUrlWithPage: string | null;
};

/* ── Floating chat FAB ─────────────────────────────────────── */
function ChatFab({
  chatDraft,
  chatMessages,
  onChatDraftChange,
  onSendChatMessage,
}: {
  chatDraft: string;
  chatMessages: Array<{ role: "user" | "assistant"; content: string }>;
  onChatDraftChange: (v: string) => void;
  onSendChatMessage: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="exam-ia-chat-fab-panel">
          <div className="exam-ia-chat-fab-header">
            <div className="exam-ia-chat-fab-title">
              <span className="exam-ia-chat-dot" />
              Preguntar al estudio
            </div>
            <button type="button" className="exam-ia-chat-fab-close" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="exam-ia-chat-fab-body">
            {chatMessages.length ? (
              chatMessages.map((msg, i) => (
                <div key={`${msg.role}-${i}`} className={`exam-ia-chat-bubble ${msg.role === "assistant" ? "is-assistant" : "is-user"}`}>
                  {msg.content}
                </div>
              ))
            ) : (
              <p className="exam-ia-chat-placeholder">Prueba: "dame el resumen" o "qué hallazgos hay"</p>
            )}
          </div>
          <div className="exam-ia-chat-fab-input">
            <textarea
              value={chatDraft}
              onChange={(e) => onChatDraftChange(e.target.value)}
              placeholder="Escribe una pregunta..."
              rows={2}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSendChatMessage(); } }}
            />
            <button type="button" className="exam-ia-chat-send-btn" onClick={onSendChatMessage}>↑</button>
          </div>
        </div>
      )}
      <button type="button" className="exam-ia-chat-fab" onClick={() => setOpen((v) => !v)} title="Preguntar al estudio">
        {open ? "✕" : "✦"}
      </button>
    </>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export function ExamAnalysesSection({
  chatDraft,
  chatMessages,
  currentDeepLink,
  isLoadingAnalyses,
  isRefreshingViewer,
  isRequestingAnalysis,
  onChatDraftChange,
  onCopyDeepLink,
  onOpenPdfPage,
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
  viewerPage,
  viewerUrl,
  viewerUrlWithPage,
}: ExamAnalysesSectionProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("resumen");
  const [sourceTab, setSourceTab] = useState<"archivos" | "ejecuciones">("archivos");

  const keyResults = useMemo(() => normalizeStructuredResults(selectedAnalysis?.structured_results), [selectedAnalysis?.structured_results]);
  const anomalyCards = useMemo(() => normalizeAnomalies(selectedAnalysis?.anomalies), [selectedAnalysis?.anomalies]);
  const interpretationNavigation = useMemo(() => normalizeDocumentNavigation(selectedAnalysis), [selectedAnalysis]);
  const evidenceItems = useMemo(() => normalizeEvidence(selectedAnalysis), [selectedAnalysis]);

  const pageBtn = (page: number | null) =>
    page ? (
      <button type="button" className="exam-ia-page-ref" onClick={() => onOpenPdfPage(page)}>
        Pág. {page}
      </button>
    ) : null;

  const anomalyColumns = useMemo<ClinicalGridColumn<AnomalyCard>[]>(
    () => [
      { headerName: "Parámetro", field: "parameter", minWidth: 140, flex: 1 },
      { headerName: "Interpretación", field: "interpretation", minWidth: 180, flex: 1.5 },
      { headerName: "Valor / Rango", valueGetter: ({ data }) => (data ? `${data.value} (${data.referenceRange})` : ""), minWidth: 150 },
      { headerName: "Sev.", field: "severity", minWidth: 90 },
      { headerName: "", minWidth: 72, maxWidth: 72, excludeFromExport: true, cellRenderer: (p: { data: AnomalyCard }) => pageBtn(p.data?.primaryPage) },
    ],
    [onOpenPdfPage],
  );

  const navigationColumns = useMemo<ClinicalGridColumn<DocumentNavigationItem>[]>(
    () => [
      { headerName: "Sección", field: "label", minWidth: 140, flex: 1 },
      { headerName: "Motivo", field: "reason", minWidth: 180, flex: 1.5 },
      { headerName: "Pág.", minWidth: 72, maxWidth: 72, excludeFromExport: true, cellRenderer: (p: { data: DocumentNavigationItem }) => pageBtn(p.data?.primaryPage) },
    ],
    [onOpenPdfPage],
  );

  const resultColumns = useMemo<ClinicalGridColumn<StructuredResultCard>[]>(
    () => [
      { headerName: "Resultado", field: "label", minWidth: 140, flex: 1 },
      { headerName: "Valor", field: "value", minWidth: 130 },
      { headerName: "Meta", field: "meta", minWidth: 180, flex: 1.5 },
      { headerName: "", minWidth: 72, maxWidth: 72, excludeFromExport: true, cellRenderer: (p: { data: StructuredResultCard }) => pageBtn(p.data?.primaryPage) },
    ],
    [onOpenPdfPage],
  );

  const evidenceColumns = useMemo<ClinicalGridColumn<EvidenceItem>[]>(
    () => [
      { headerName: "Vista previa", field: "preview", minWidth: 240, flex: 2 },
      { headerName: "Pág.", minWidth: 72, maxWidth: 72, excludeFromExport: true, cellRenderer: (p: { data: EvidenceItem }) => pageBtn(p.data?.primaryPage) },
    ],
    [onOpenPdfPage],
  );

  if (!selectedPatientId || !selectedSummary) {
    return (
      <section className="tab-layout">
        <article className="card section-card span-two">
          <EmptyStatePanel
            eyebrow="Examenes con IA"
            title="Selecciona un paciente para abrir el workspace"
            body="La vista usa los estudios PDF adjuntados al expediente. Selecciona un paciente para comenzar."
          />
        </article>
      </section>
    );
  }

  const ANALYSIS_TABS: { id: AnalysisTab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "anomalias", label: anomalyCards.length ? `Anomalías · ${anomalyCards.length}` : "Anomalías" },
    { id: "resultados", label: "Resultados" },
    { id: "navegacion", label: "Navegación" },
    { id: "evidencia", label: "Evidencia" },
  ];

  return (
    <section className="tab-layout">
      <div className="exam-ia-workspace span-three">

        {/* ── LEFT: source + analysis ─────────────────────────── */}
        <div className="exam-ia-workspace-left">

          {/* Source selector */}
          <div className="card section-card exam-ia-source-card">
            <div className="exam-ia-source-header">
              {/* mini tab buttons */}
              <div className="exam-ia-source-tabs">
                <button
                  type="button"
                  className={`exam-ia-source-tab${sourceTab === "archivos" ? " is-active" : ""}`}
                  onClick={() => setSourceTab("archivos")}
                >
                  Archivos{studyAttachments.length ? ` · ${studyAttachments.length}` : ""}
                </button>
                <button
                  type="button"
                  className={`exam-ia-source-tab${sourceTab === "ejecuciones" ? " is-active" : ""}`}
                  onClick={() => setSourceTab("ejecuciones")}
                >
                  Ejecuciones{selectedAttachmentAnalyses.length ? ` · ${selectedAttachmentAnalyses.length}` : ""}
                </button>
              </div>
              <div className="exam-ia-source-actions">
                {isLoadingAnalyses && <span className="exam-ia-inline-status">Actualizando…</span>}
                <button
                  type="button"
                  className="exam-ia-request-btn"
                  onClick={onRequestAnalysis}
                  disabled={!selectedAttachment || isRequestingAnalysis}
                >
                  {isRequestingAnalysis ? "Solicitando…" : "+ Solicitar análisis"}
                </button>
              </div>
            </div>

            <div className="table-wrap exam-ia-table-scroll">
              {sourceTab === "archivos" ? (
                studyAttachments.length ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Archivo</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studyAttachments.map((a) => (
                        <tr
                          key={a.id}
                          className={a.id === selectedAttachmentId ? "table-row-active" : ""}
                          onClick={() => onSelectAttachment(a.id)}
                        >
                          <td><strong>{a.file_name}</strong></td>
                          <td>{a.file_type.replaceAll("_", " ")}</td>
                          <td>{a.created_at ? formatDateTime(a.created_at) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="exam-ia-muted">Sin PDFs adjuntos. Adjunta uno desde Consultas.</p>
                )
              ) : selectedAttachment ? (
                selectedAttachmentAnalyses.length ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAttachmentAnalyses.map((an) => (
                        <tr
                          key={an.id}
                          className={selectedAnalysisId === an.id ? "table-row-active" : ""}
                          onClick={() => onSelectAnalysis(an.id)}
                        >
                          <td><strong>#{an.id}</strong></td>
                          <td>{statusLabel(an.status)}</td>
                          <td>{an.completed_at ? formatDateTime(an.completed_at) : an.created_at ? formatDateTime(an.created_at) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="exam-ia-muted">Sin ejecuciones para este estudio.</p>
                )
              ) : (
                <p className="exam-ia-muted">Selecciona un archivo para ver ejecuciones.</p>
              )}
            </div>
          </div>

          {/* Analysis results */}
          <div className="card section-card exam-ia-results-card">
            {selectedAnalysis ? (
              <>
                {/* status bar */}
                <div className="exam-ia-status-bar">
                  <span className={`exam-ia-status-pill is-${selectedAnalysis.status}`}>
                    {statusLabel(selectedAnalysis.status)}
                  </span>
                  <span className="exam-ia-status-meta">
                    {selectedAnalysis.provider_name}
                    {selectedAnalysis.provider_job_id ? ` · #${selectedAnalysis.provider_job_id}` : ""}
                  </span>
                  <span className="exam-ia-status-meta">
                    {reviewStatusLabel(selectedAnalysis.review_status)}
                  </span>
                </div>

                {/* tab bar */}
                <div className="exam-ia-tab-bar">
                  {ANALYSIS_TABS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      className={`exam-ia-tab-btn${activeTab === id ? " is-active" : ""}`}
                      onClick={() => setActiveTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* tab content */}
                <div className="exam-ia-results-body">
                  {activeTab === "resumen" && (
                    <div className="exam-ia-summary-body">
                      <p className="exam-ia-summary-text">
                        {selectedAnalysis.summary ?? "Todavía no hay resumen ejecutivo para este estudio."}
                      </p>
                      {selectedAnalysis.last_callback_at && (
                        <p className="exam-ia-audit-line">
                          Último callback: {formatDateTime(selectedAnalysis.last_callback_at)}
                        </p>
                      )}
                    </div>
                  )}
                  {activeTab === "anomalias" && (
                    <ClinicalDataGrid<AnomalyCard>
                      columns={anomalyColumns}
                      emptyMessage="No se registran hallazgos alterados."
                      exportFileName="hallazgos-alterados"
                      quickFilter=""
                      rowData={anomalyCards}
                      pageSize={8}
                    />
                  )}
                  {activeTab === "resultados" && (
                    <ClinicalDataGrid<StructuredResultCard>
                      columns={resultColumns}
                      emptyMessage="Sin resultados clave estructurados."
                      exportFileName="resultados-clave"
                      quickFilter=""
                      rowData={keyResults}
                      pageSize={8}
                    />
                  )}
                  {activeTab === "navegacion" && (
                    <ClinicalDataGrid<DocumentNavigationItem>
                      columns={navigationColumns}
                      emptyMessage="Sin guía de navegación disponible."
                      exportFileName="guia-navegacion"
                      quickFilter=""
                      rowData={interpretationNavigation}
                      pageSize={8}
                    />
                  )}
                  {activeTab === "evidencia" && (
                    <ClinicalDataGrid<EvidenceItem>
                      columns={evidenceColumns}
                      emptyMessage="Sin evidencia contrastada contra el PDF."
                      exportFileName="evidencia-documento"
                      quickFilter=""
                      rowData={evidenceItems}
                      pageSize={8}
                    />
                  )}
                </div>
              </>
            ) : (
              <EmptyStatePanel
                eyebrow="Pendiente"
                title="Sin análisis seleccionado"
                body="Selecciona un PDF, abre la pestaña Ejecuciones y elige una, o usa + Solicitar análisis."
              />
            )}
          </div>
        </div>

        {/* ── RIGHT: PDF viewer (sticky, hero) ────────────────── */}
        <div className="exam-ia-workspace-right">
          <div className="card exam-ia-viewer-card">
            {/* Compact PDF controls */}
            <div className="exam-ia-pdf-header">
              <span className="exam-ia-pdf-filename">
                {selectedAttachment?.file_name ?? "Sin documento seleccionado"}
              </span>
              <div className="exam-ia-pdf-controls">
                {viewerPage ? <span className="exam-ia-page-badge">Pág. {viewerPage}</span> : null}
                {isRefreshingViewer ? <span className="exam-ia-inline-status">…</span> : null}
                <button
                  type="button"
                  className="exam-ia-icon-btn"
                  onClick={onCopyDeepLink}
                  disabled={!currentDeepLink}
                  title="Copiar enlace"
                >
                  🔗
                </button>
                {viewerUrl ? (
                  <a
                    className="exam-ia-icon-btn"
                    href={viewerUrlWithPage ?? viewerUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir en nueva pestaña"
                  >
                    ↗
                  </a>
                ) : null}
              </div>
            </div>

            {/* PDF iframe */}
            <div className="exam-ia-viewer-shell">
              {viewerUrl ? (
                <iframe
                  key={viewerUrlWithPage ?? viewerUrl}
                  className="exam-ia-pdf-frame"
                  src={viewerUrlWithPage ?? viewerUrl}
                  title={selectedAttachment?.file_name ?? "PDF"}
                />
              ) : (
                <div className="exam-ia-viewer-empty">
                  <p>Selecciona un estudio PDF</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChatFab
        chatDraft={chatDraft}
        chatMessages={chatMessages}
        onChatDraftChange={onChatDraftChange}
        onSendChatMessage={onSendChatMessage}
      />
    </section>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */

function normalizeAnomalies(anomalies: Array<Record<string, unknown>> | null | undefined): AnomalyCard[] {
  return (anomalies ?? []).map((entry, index) => {
    const parameter = String(entry.parameter ?? entry.code ?? `Hallazgo ${index + 1}`);
    const severity = String(entry.severity ?? "Pendiente");
    const pages = toPageNumbers(entry.page_numbers ?? entry.pages ?? entry.relevant_pages);
    return {
      parameter,
      severity,
      severityToken: severity.toLowerCase().replaceAll(/\s+/g, "-"),
      interpretation: String(entry.interpretation ?? entry.summary ?? "Sin interpretacion resumida."),
      value: String(entry.value ?? entry.measured_value ?? "Sin dato"),
      referenceRange: String(entry.reference_range ?? entry.range ?? "No informado"),
      evidence: String(entry.evidence ?? entry.text_preview ?? entry.evidence_snippet ?? "Sin snippet disponible"),
      pages: pages.length ? pages.join(", ") : "No informadas",
      primaryPage: pages[0] ?? null,
    };
  });
}

function normalizeStructuredResults(
  structuredResults: Record<string, unknown> | Array<unknown> | null | undefined,
): StructuredResultCard[] {
  if (!structuredResults) return [];
  if (Array.isArray(structuredResults)) {
    return structuredResults.slice(0, 12).map((entry, index) => {
      const record = isRecord(entry) ? entry : {};
      const label = String(record.label ?? record.name ?? `Resultado ${index + 1}`);
      const value = [record.value, record.unit].filter(Boolean).join(" ") || "Sin dato";
      const metaParts = [
        record.reference_range ? `Rango: ${String(record.reference_range)}` : null,
        record.flag ? `Flag: ${String(record.flag)}` : null,
        record.section ? `Sección: ${String(record.section)}` : null,
      ].filter(Boolean);
      const pages = toPageNumbers(record.page_numbers);
      return { label, value, meta: metaParts.join(" · ") || "Sin metadatos", primaryPage: pages[0] ?? null };
    });
  }
  return Object.entries(structuredResults)
    .slice(0, 8)
    .map(([label, rawValue]) => ({
      label,
      value: typeof rawValue === "object" && rawValue !== null ? JSON.stringify(rawValue) : String(rawValue),
      meta: "Resultado estructurado",
      primaryPage: null,
    }));
}

function normalizeDocumentNavigation(analysis: ExamAnalysis | null): DocumentNavigationItem[] {
  const interpretation = readProviderSection(analysis, "interpretation");
  const navigation = isRecord(interpretation) && Array.isArray(interpretation.document_navigation)
    ? interpretation.document_navigation : [];
  return navigation.map((entry): DocumentNavigationItem => {
    const record = isRecord(entry) ? entry : {};
    const pages = toPageNumbers(record.page_numbers);
    return {
      label: String(record.label ?? "Sección relevante"),
      reason: String(record.reason ?? "Referencia relevante del estudio."),
      pagesLabel: pages.length ? `Pág. ${pages.join(", ")}` : "—",
      primaryPage: pages[0] ?? null,
    };
  });
}

function normalizeEvidence(analysis: ExamAnalysis | null): EvidenceItem[] {
  const evidence = readProviderSection(analysis, "evidence");
  if (!Array.isArray(evidence)) return [];
  return evidence.map((entry): EvidenceItem => {
    const record = isRecord(entry) ? entry : {};
    const pages = toPageNumbers(record.page_numbers);
    return {
      preview: String(record.text_preview ?? record.label ?? "Evidencia sin preview."),
      pagesLabel: pages.length ? `Pág. ${pages.join(", ")}` : "—",
      primaryPage: pages[0] ?? null,
    };
  });
}

function readProviderSection(analysis: ExamAnalysis | null, key: string): unknown {
  if (!analysis || !analysis.raw_provider_payload || Array.isArray(analysis.raw_provider_payload)) return null;
  return analysis.raw_provider_payload[key] ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPageNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number.parseInt(String(item), 10)).filter((item) => Number.isFinite(item) && item > 0);
}

function statusLabel(status: ExamAnalysis["status"]) {
  switch (status) {
    case "pending_submission": return "Pendiente";
    case "submitted": return "Enviado";
    case "processing": return "Procesando";
    case "completed": return "Completado";
    case "failed": return "Fallido";
    default: return status;
  }
}

function reviewStatusLabel(status: ExamAnalysis["review_status"]) {
  switch (status) {
    case "not_ready": return "No listo";
    case "pending_review": return "Pendiente de revisión";
    case "reviewed": return "Revisado";
    default: return status;
  }
}
