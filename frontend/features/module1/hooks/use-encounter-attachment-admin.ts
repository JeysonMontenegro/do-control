"use client";

import { FormEvent, useEffect } from "react";

import { combineDisplayDateTimeToIso } from "@/features/module1/console-utils";
import { apiDelete, apiGet, apiPatch, apiPost, apiPostForm } from "@/lib/api";
import type {
  AttachmentDownload,
  Diagnosis,
  Encounter,
  ExamOrder,
  PrescriptionItem,
} from "@/features/module1/types";

type EncounterFormState = {
  appointment_id: string;
  chief_complaint: string;
  created_by: string;
  doctor_id: string;
  encounter_date: string;
  encounter_time: string;
  encounter_type: string;
  patient_id: string;
};

type UseEncounterAttachmentAdminParams = {
  attachmentEncounterId: string;
  attachmentFile: File | null;
  attachmentType: string;
  diagnoses: Diagnosis[];
  encounterForm: EncounterFormState;
  examOrders: ExamOrder[];
  loadData: () => Promise<void>;
  prescriptionItems: PrescriptionItem[];
  refreshSelectedSummary: () => Promise<unknown>;
  selectedPatientId: string;
  selectedSummary: {
    encounters: Encounter[];
  } | null;
  setAttachmentEncounterId: React.Dispatch<React.SetStateAction<string>>;
  setAttachmentFile: React.Dispatch<React.SetStateAction<File | null>>;
  setDiagnoses: React.Dispatch<React.SetStateAction<Diagnosis[]>>;
  setDownloadingAttachmentId: React.Dispatch<React.SetStateAction<number | null>>;
  setEncounterForm: React.Dispatch<React.SetStateAction<EncounterFormState>>;
  setExamOrders: React.Dispatch<React.SetStateAction<ExamOrder[]>>;
  setMessage: (message: string) => void;
  setPrescriptionItems: React.Dispatch<React.SetStateAction<PrescriptionItem[]>>;
  setSelectedPatientId: React.Dispatch<React.SetStateAction<string>>;
};

export function useEncounterAttachmentAdmin({
  attachmentEncounterId,
  attachmentFile,
  attachmentType,
  diagnoses,
  encounterForm,
  examOrders,
  loadData,
  prescriptionItems,
  refreshSelectedSummary,
  selectedPatientId,
  selectedSummary,
  setAttachmentEncounterId,
  setAttachmentFile,
  setDiagnoses,
  setDownloadingAttachmentId,
  setEncounterForm,
  setExamOrders,
  setMessage,
  setPrescriptionItems,
  setSelectedPatientId,
}: UseEncounterAttachmentAdminParams) {
  useEffect(() => {
    const encounterIds = (selectedSummary?.encounters ?? []).map((encounter) => String(encounter.id));
    if (!encounterIds.length) {
      if (attachmentEncounterId) {
        setAttachmentEncounterId("");
      }
      return;
    }
    if (attachmentEncounterId && encounterIds.includes(attachmentEncounterId)) {
      return;
    }
    setAttachmentEncounterId(encounterIds[0]);
  }, [attachmentEncounterId, selectedSummary, setAttachmentEncounterId]);

  async function submitEncounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const createdEncounter = await apiPost<Encounter>("/api/encounters", {
        ...encounterForm,
        patient_id: Number(encounterForm.patient_id),
        doctor_id: Number(encounterForm.doctor_id),
        appointment_id: encounterForm.appointment_id ? Number(encounterForm.appointment_id) : null,
        encounter_date: combineDisplayDateTimeToIso(encounterForm.encounter_date, encounterForm.encounter_time),
        diagnoses: diagnoses
          .filter((item) => item.diagnosis_text.trim())
          .map((item) => ({
            ...item,
            diagnosis_code: item.diagnosis_code || null,
            notes: item.notes || null,
          })),
        prescription: prescriptionItems.some((item) => item.medication_name.trim())
          ? {
              notes: null,
              items: prescriptionItems
                .filter((item) => item.medication_name.trim())
                .map((item) => ({
                  ...item,
                  dosage: item.dosage || null,
                  frequency: item.frequency || null,
                  duration: item.duration || null,
                  instructions: item.instructions || null,
                })),
            }
          : null,
        exam_orders: examOrders
          .filter((item) => item.exam_name.trim())
          .map((item) => ({
            ...item,
            exam_category: item.exam_category || null,
            instructions: item.instructions || null,
          })),
      });
      await loadData();
      setEncounterForm((current) => ({
        ...current,
        chief_complaint: "",
        appointment_id: "",
      }));
      setDiagnoses([{ diagnosis_text: "", diagnosis_code: null, is_primary: true, notes: null }]);
      setPrescriptionItems([{ medication_name: "", dosage: null, frequency: null, duration: null, instructions: null }]);
      setExamOrders([{ exam_name: "", exam_category: null, instructions: null }]);
      setSelectedPatientId(encounterForm.patient_id);
      setAttachmentEncounterId(String(createdEncounter.id));
      setMessage("Consulta registrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la consulta.");
    }
  }

  async function closeEncounter(encounterId: number) {
    setMessage("");
    try {
      await apiPatch<Encounter>(`/api/encounters/${encounterId}/close`, {
        closed_by: "frontend-demo",
      });
      await loadData();
      if (selectedPatientId) {
        await refreshSelectedSummary();
      }
      setMessage(`Consulta ${encounterId} cerrada.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cerrar la consulta.");
    }
  }

  async function submitAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const targetPatientId = selectedPatientId || encounterForm.patient_id;
    if (!targetPatientId || !attachmentFile) {
      setMessage("Selecciona un paciente y un archivo.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("patient_id", targetPatientId);
      if (attachmentEncounterId) {
        formData.append("encounter_id", attachmentEncounterId);
      }
      formData.append("file_type", attachmentType);
      formData.append("uploaded_by", "frontend-demo");
      formData.append("file", attachmentFile);

      await apiPostForm("/api/attachments", formData);

      setAttachmentFile(null);
      if (targetPatientId) {
        setSelectedPatientId(targetPatientId);
        await refreshSelectedSummary();
      }
      setMessage("Documento adjuntado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo adjuntar el archivo.");
    }
  }

  async function openAttachment(attachmentId: number) {
    setMessage("");
    setDownloadingAttachmentId(attachmentId);
    try {
      const download = await apiGet<AttachmentDownload>(
        `/api/attachments/${attachmentId}/download?requested_by=frontend-demo`,
      );
      window.open(download.download_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo abrir el archivo.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  async function deleteAttachment(attachmentId: number) {
    setMessage("");
    try {
      await apiDelete<{ attachment_id: number; status: string }>(
        `/api/attachments/${attachmentId}?deleted_by=frontend-demo`,
      );
      await refreshSelectedSummary();
      setMessage("Documento eliminado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar el archivo.");
    }
  }

  return {
    closeEncounter,
    deleteAttachment,
    openAttachment,
    submitAttachment,
    submitEncounter,
  };
}
