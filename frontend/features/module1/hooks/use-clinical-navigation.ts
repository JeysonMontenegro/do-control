"use client";

import type { ConsoleTab } from "@/features/module1/console-config";

type UseClinicalNavigationParams = {
  setActiveTab: React.Dispatch<React.SetStateAction<ConsoleTab>>;
  setMessagesSubtab: (tab: "paciente" | "citas" | "operacion") => void;
  setSelectedPatientId: React.Dispatch<React.SetStateAction<string>>;
  toggleAppointmentHistory: (appointmentId: number) => void;
};

export function useClinicalNavigation({
  setActiveTab,
  setMessagesSubtab,
  setSelectedPatientId,
  toggleAppointmentHistory,
}: UseClinicalNavigationParams) {
  const goToAgenda = () => setActiveTab("agenda");

  const goToAgendaAppointment = (appointmentId: number) => {
    setActiveTab("agenda");
    toggleAppointmentHistory(appointmentId);
  };

  const goToPatient = (patientId: number | string) => {
    setSelectedPatientId(String(patientId));
    setActiveTab("pacientes");
  };

  const clearPatientFocus = () => {
    setSelectedPatientId("");
  };

  const goToMessages = () => {
    setActiveTab("mensajes");
  };

  const goToMessagesForAppointment = (appointmentId: number, patientId: number) => {
    setSelectedPatientId(String(patientId));
    setMessagesSubtab("citas");
    setActiveTab("mensajes");
    toggleAppointmentHistory(appointmentId);
  };

  const goToEncounters = () => {
    setActiveTab("consultas");
  };

  const goToExamAnalyses = () => {
    setActiveTab("examenes");
  };

  return {
    clearPatientFocus,
    goToAgenda,
    goToAgendaAppointment,
    goToEncounters,
    goToExamAnalyses,
    goToMessages,
    goToMessagesForAppointment,
    goToPatient,
  };
}
