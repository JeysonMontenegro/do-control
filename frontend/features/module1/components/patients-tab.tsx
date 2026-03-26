"use client";

import type { ComponentProps } from "react";

import { PatientsSection } from "@/features/module1/components/patients-section";

type PatientsTabProps = Omit<ComponentProps<typeof PatientsSection>, "onEditPatient" | "onGoToAgendaAppointment" | "onShowCreatePatient" | "onTogglePatientActive"> & {
  onEditSelectedPatient: () => void;
  onGoToAgenda: () => void;
  onGoToAgendaFromPatient: (appointmentId: number) => void;
  onGoToEncounters: () => void;
  onGoToMessages: () => void;
  onShowCreatePatientModal: () => void;
  onToggleSelectedPatientActive: () => void;
};

export function PatientsTab({
  onEditSelectedPatient,
  onGoToAgenda,
  onGoToAgendaFromPatient,
  onGoToEncounters,
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
      onGoToMessages={onGoToMessages}
      onShowCreatePatient={onShowCreatePatientModal}
      onTogglePatientActive={onToggleSelectedPatientActive}
    />
  );
}
