"use client";

import type { ComponentProps } from "react";

import { PatientsSection } from "@/features/module1/components/patients-section";

type PatientsTabProps = Omit<ComponentProps<typeof PatientsSection>, "onEditPatient" | "onGoToAgendaAppointment" | "onShowCreatePatient"> & {
  onEditSelectedPatient: () => void;
  onGoToAgendaFromPatient: (appointmentId: number) => void;
  onShowCreatePatientModal: () => void;
};

export function PatientsTab({
  onEditSelectedPatient,
  onGoToAgendaFromPatient,
  onShowCreatePatientModal,
  ...sectionProps
}: PatientsTabProps) {
  return (
    <PatientsSection
      {...sectionProps}
      onEditPatient={onEditSelectedPatient}
      onGoToAgendaAppointment={onGoToAgendaFromPatient}
      onShowCreatePatient={onShowCreatePatientModal}
    />
  );
}
