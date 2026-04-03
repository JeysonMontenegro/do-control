"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AttachmentDownload, ExamAnalysis, FileAttachment, PatientSummary } from "@/features/module1/types";
import { apiGet, apiPost } from "@/lib/api";

type UseExamAnalysisConsoleParams = {
  selectedPatientId: string;
  selectedSummary: PatientSummary | null;
  setMessage: (message: string) => void;
};

export function useExamAnalysisConsole({
  selectedPatientId,
  selectedSummary,
  setMessage,
}: UseExamAnalysisConsoleParams) {
  const [analysesByAttachment, setAnalysesByAttachment] = useState<Record<number, ExamAnalysis[]>>({});
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<number | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);
  const [isRefreshingViewer, setIsRefreshingViewer] = useState(false);
  const [isRequestingAnalysis, setIsRequestingAnalysis] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const studyAttachments = useMemo(
    () =>
      (selectedSummary?.attachments ?? []).filter((attachment) => {
        const contentType = (attachment.content_type ?? "").toLowerCase();
        return attachment.file_type === "lab_result" || contentType === "application/pdf" || attachment.file_name.toLowerCase().endsWith(".pdf");
      }),
    [selectedSummary],
  );

  const selectedAttachment = useMemo(
    () => studyAttachments.find((attachment) => attachment.id === selectedAttachmentId) ?? null,
    [selectedAttachmentId, studyAttachments],
  );

  const selectedAttachmentAnalyses = useMemo(
    () => (selectedAttachmentId ? analysesByAttachment[selectedAttachmentId] ?? [] : []),
    [analysesByAttachment, selectedAttachmentId],
  );

  const selectedAnalysis = useMemo(
    () => selectedAttachmentAnalyses.find((analysis) => analysis.id === selectedAnalysisId) ?? selectedAttachmentAnalyses[0] ?? null,
    [selectedAnalysisId, selectedAttachmentAnalyses],
  );

  const refreshAnalyses = useCallback(async () => {
    if (!selectedPatientId || !studyAttachments.length) {
      setAnalysesByAttachment({});
      return;
    }
    setIsLoadingAnalyses(true);
    try {
      const entries = await Promise.all(
        studyAttachments.map(async (attachment) => {
          const analyses = await apiGet<ExamAnalysis[]>(`/api/attachments/${attachment.id}/analyses`);
          return [attachment.id, analyses] as const;
        }),
      );
      setAnalysesByAttachment(Object.fromEntries(entries));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los analisis del estudio.");
    } finally {
      setIsLoadingAnalyses(false);
    }
  }, [selectedPatientId, setMessage, studyAttachments]);

  const refreshViewerUrl = useCallback(async (attachment: FileAttachment | null) => {
    if (!attachment) {
      setViewerUrl(null);
      return;
    }
    setIsRefreshingViewer(true);
    try {
      const download = await apiGet<AttachmentDownload>(
        `/api/attachments/${attachment.id}/download?requested_by=frontend-demo`,
      );
      setViewerUrl(download.download_url);
    } catch (error) {
      setViewerUrl(null);
      setMessage(error instanceof Error ? error.message : "No se pudo preparar la vista del PDF.");
    } finally {
      setIsRefreshingViewer(false);
    }
  }, [setMessage]);

  useEffect(() => {
    if (!studyAttachments.length) {
      setSelectedAttachmentId(null);
      setSelectedAnalysisId(null);
      setViewerUrl(null);
      return;
    }
    if (!selectedAttachmentId || !studyAttachments.some((attachment) => attachment.id === selectedAttachmentId)) {
      setSelectedAttachmentId(studyAttachments[0].id);
    }
  }, [selectedAttachmentId, studyAttachments]);

  useEffect(() => {
    void refreshAnalyses();
  }, [refreshAnalyses]);

  useEffect(() => {
    if (!selectedAttachment) {
      setSelectedAnalysisId(null);
      setChatMessages([]);
      void refreshViewerUrl(null);
      return;
    }
    void refreshViewerUrl(selectedAttachment);
  }, [refreshViewerUrl, selectedAttachment]);

  useEffect(() => {
    if (!selectedAttachmentAnalyses.length) {
      setSelectedAnalysisId(null);
      return;
    }
    if (!selectedAnalysisId || !selectedAttachmentAnalyses.some((analysis) => analysis.id === selectedAnalysisId)) {
      setSelectedAnalysisId(selectedAttachmentAnalyses[0].id);
    }
  }, [selectedAnalysisId, selectedAttachmentAnalyses]);

  useEffect(() => {
    setChatMessages([]);
    setChatDraft("");
  }, [selectedAnalysisId]);

  const requestAnalysis = useCallback(async () => {
    if (!selectedAttachment) {
      setMessage("Selecciona un estudio PDF antes de solicitar el analisis.");
      return;
    }
    setIsRequestingAnalysis(true);
    try {
      const created = await apiPost<ExamAnalysis>(`/api/attachments/${selectedAttachment.id}/analyses`, {
        encounter_id: selectedAttachment.encounter_id,
        requested_by: "frontend-demo",
        source: "console",
      });
      setSelectedAnalysisId(created.id);
      await refreshAnalyses();
      setMessage("Analisis solicitado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo solicitar el analisis.");
    } finally {
      setIsRequestingAnalysis(false);
    }
  }, [refreshAnalyses, selectedAttachment, setMessage]);

  const sendChatMessage = useCallback(() => {
    const prompt = chatDraft.trim();
    if (!prompt) {
      return;
    }
    const analysis = selectedAnalysis;
    const assistantReply = buildAssistantReply(prompt, analysis);
    setChatMessages((current) => [
      ...current,
      { role: "user", content: prompt },
      { role: "assistant", content: assistantReply },
    ]);
    setChatDraft("");
  }, [chatDraft, selectedAnalysis]);

  return {
    analysesByAttachment,
    chatDraft,
    chatMessages,
    isLoadingAnalyses,
    isRefreshingViewer,
    isRequestingAnalysis,
    requestAnalysis,
    selectedAnalysis,
    selectedAnalysisId,
    selectedAttachment,
    selectedAttachmentAnalyses,
    selectedAttachmentId,
    sendChatMessage,
    setChatDraft,
    setSelectedAnalysisId,
    setSelectedAttachmentId,
    studyAttachments,
    viewerUrl,
  };
}

function buildAssistantReply(prompt: string, analysis: ExamAnalysis | null) {
  if (!analysis) {
    return "Todavia no hay un analisis estructurado para este estudio. Solicita el procesamiento y vuelve a consultar.";
  }

  const normalizedPrompt = prompt.toLowerCase();
  const anomalies = analysis.anomalies ?? [];
  if (normalizedPrompt.includes("alter") || normalizedPrompt.includes("anom")) {
    if (!anomalies.length) {
      return "El analisis no reporta hallazgos alterados en la carga actual.";
    }
    return `Hallazgos alterados detectados: ${anomalies
      .map((item) => {
        const record = item as Record<string, unknown>;
        return [record.code, record.severity].filter(Boolean).join(" · ");
      })
      .join("; ")}.`;
  }

  if (normalizedPrompt.includes("resumen")) {
    return analysis.summary ?? "Aun no hay resumen ejecutivo disponible para este estudio.";
  }

  if (normalizedPrompt.includes("pagina") || normalizedPrompt.includes("evid")) {
    return "La evidencia visible en esta version proviene del payload estructurado cargado. Usa las tarjetas de hallazgos y el visor PDF para confirmar paginas y contexto.";
  }

  return analysis.summary
    ? `Resumen contextual: ${analysis.summary}`
    : "No hay suficiente estructura cargada para responder con precision. Revisa el PDF y los bloques de evidencia.";
}
