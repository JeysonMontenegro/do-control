"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";
import { normalizePhoneWithDefaultCountry } from "@/features/module1/phone-utils";
import type {
  Doctor,
  MessagingConversation,
  MessagingConversationMessage,
  MessagingConversationSendResponse,
  Patient,
} from "@/features/module1/types";

type UseWhatsAppInboxParams = {
  availableDoctors: Doctor[];
  currentRoles: string[];
  doctorFilter: string;
  isAuthenticated: boolean;
  messagesSubtab: "paciente" | "citas" | "operacion";
  patients: Patient[];
  selectedPatientId: string;
  setMessage: (message: string) => void;
  setSelectedPatientId: (value: string) => void;
};

export function useWhatsAppInbox({
  availableDoctors,
  currentRoles,
  doctorFilter,
  isAuthenticated,
  messagesSubtab,
  patients,
  selectedPatientId,
  setMessage,
  setSelectedPatientId,
}: UseWhatsAppInboxParams) {
  const [activeConversationPhone, setActiveConversationPhone] = useState("");
  const [composer, setComposer] = useState("");
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [messages, setMessages] = useState<MessagingConversationMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const targetDoctorId = useMemo(() => {
    if (doctorFilter) {
      return doctorFilter;
    }
    if (currentRoles.includes("doctor") && availableDoctors.length === 1) {
      return String(availableDoctors[0].id);
    }
    return "";
  }, [availableDoctors, currentRoles, doctorFilter]);

  const patientByPhone = useMemo(() => {
    const entries = patients.map((patient) => [normalizePhoneWithDefaultCountry(patient.primary_phone), patient] as const);
    return new Map(entries);
  }, [patients]);
  const conversationPhoneByPatientId = useMemo(() => {
    const entries = patients
      .filter((patient) => patient.primary_phone?.trim())
      .map((patient) => [String(patient.id), normalizePhoneWithDefaultCountry(patient.primary_phone)] as const);
    return new Map(entries);
  }, [patients]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.patient_phone === activeConversationPhone) ?? null,
    [activeConversationPhone, conversations],
  );

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated || messagesSubtab !== "paciente" || !targetDoctorId) {
      setConversations([]);
      return;
    }
    setLoadingConversations(true);
    try {
      const loaded = await apiGet<MessagingConversation[]>(
        `/api/messaging-inbox/conversations?doctor_id=${encodeURIComponent(targetDoctorId)}`,
      );
      setConversations(loaded);
      setActiveConversationPhone((current) => {
        if (current && loaded.some((conversation) => conversation.patient_phone === current)) {
          return current;
        }
        return loaded[0]?.patient_phone ?? "";
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el inbox de WhatsApp.");
    } finally {
      setLoadingConversations(false);
    }
  }, [isAuthenticated, messagesSubtab, setMessage, targetDoctorId]);

  const refreshMessages = useCallback(async () => {
    if (!isAuthenticated || messagesSubtab !== "paciente" || !targetDoctorId || !activeConversationPhone) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    try {
      const loaded = await apiGet<MessagingConversationMessage[]>(
        `/api/messaging-inbox/conversations/${encodeURIComponent(activeConversationPhone)}/messages?doctor_id=${encodeURIComponent(targetDoctorId)}&limit=100`,
      );
      setMessages(loaded);
      const matchedPatient = patientByPhone.get(normalizePhoneWithDefaultCountry(activeConversationPhone));
      if (matchedPatient) {
        setSelectedPatientId(String(matchedPatient.id));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la conversación de WhatsApp.");
    } finally {
      setLoadingMessages(false);
    }
  }, [
    activeConversationPhone,
    isAuthenticated,
    messagesSubtab,
    patientByPhone,
    setMessage,
    setSelectedPatientId,
    targetDoctorId,
  ]);

  const sendMessage = useCallback(async () => {
    if (!targetDoctorId || !activeConversationPhone || !composer.trim()) {
      return false;
    }
    setSendingMessage(true);
    try {
      const response = await apiPost<MessagingConversationSendResponse>("/api/messaging-inbox/messages/send", {
        doctor_id: Number(targetDoctorId),
        patient_phone: activeConversationPhone,
        text: composer.trim(),
      });
      setComposer("");
      setMessage(response.status === "sent" ? "Mensaje enviado por WhatsApp." : "Mensaje registrado.");
      await Promise.all([refreshConversations(), refreshMessages()]);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el mensaje de WhatsApp.");
      return false;
    } finally {
      setSendingMessage(false);
    }
  }, [activeConversationPhone, composer, refreshConversations, refreshMessages, setMessage, targetDoctorId]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);

  useEffect(() => {
    if (!selectedPatientId) {
      return;
    }
    const patientPhone = conversationPhoneByPatientId.get(selectedPatientId);
    if (!patientPhone) {
      return;
    }
    if (conversations.some((conversation) => normalizePhoneWithDefaultCountry(conversation.patient_phone) === patientPhone)) {
      setActiveConversationPhone((current) => (current === patientPhone ? current : patientPhone));
    }
  }, [conversationPhoneByPatientId, conversations, selectedPatientId]);

  useEffect(() => {
    if (!isAuthenticated || messagesSubtab !== "paciente" || !targetDoctorId) {
      return;
    }
    const intervalId = window.setInterval(() => {
      void refreshConversations();
      if (activeConversationPhone) {
        void refreshMessages();
      }
    }, 20000);
    return () => window.clearInterval(intervalId);
  }, [
    activeConversationPhone,
    isAuthenticated,
    messagesSubtab,
    refreshConversations,
    refreshMessages,
    targetDoctorId,
  ]);

  return {
    activeConversation,
    activeConversationPhone,
    composer,
    conversations,
    loadingConversations,
    loadingMessages,
    messages,
    sendingMessage,
    refreshConversations,
    refreshMessages,
    setActiveConversationPhone,
    setComposer,
    sendMessage,
    targetDoctorId,
  };
}
