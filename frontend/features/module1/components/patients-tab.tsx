"use client";

import type { ComponentProps } from "react";

import { PatientsSection } from "@/features/module1/components/patients-section";

type PatientsTabProps = Omit<ComponentProps<typeof PatientsSection>, "onEditPatient" | "onGoToAgendaAppointment" | "onShowCreatePatient" | "onTogglePatientActive"> & {
  onEditSelectedPatient: () => void;
  onGoToAgenda: () => void;
  onGoToAgendaFromPatient: (appointmentId: number) => void;
  onGoToEncounters: () => void;
  onGoToExamAnalyses: () => void;
  onGoToMessages: () => void;
  onShowCreatePatientModal: () => void;
  onToggleSelectedPatientActive: () => void;
};

export function PatientsTab({
  onEditSelectedPatient,
  onGoToAgenda,
  onGoToAgendaFromPatient,
  onGoToEncounters,
  onGoToExamAnalyses,
  onGoToMessages,
  onShowCreatePatientModal,
  onToggleSelectedPatientActive,
  ...sectionProps
}: PatientsTabProps) {
  return (
    <PatientsSection
      {...sectionProps}
      onEditPatient={onEditSelectedPatient}
      onGoToAgenda={onGoToAgenda}
      onGoToAgendaAppointment={onGoToAgendaFromPatient}
      onGoToEncounters={onGoToEncounters}
      onGoToExamAnalyses={onGoToExamAnalyses}
      onGoToMessages={onGoToMessages}
      onShowCreatePatient={onShowCreatePatientModal}
      onTogglePatientActive={onToggleSelectedPatientActive}
    />
  );
}
