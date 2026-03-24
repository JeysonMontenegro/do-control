"use client";

import type { ComponentProps } from "react";

import { AgendaSection } from "@/features/module1/components/agenda-section";

type AgendaTabProps = Omit<
  ComponentProps<typeof AgendaSection>,
  | "onAppointmentDoctorChange"
  | "onAppointmentEndDateChange"
  | "onAppointmentEndTimeChange"
  | "onAppointmentPatientChange"
  | "onAppointmentStartDateChange"
  | "onAppointmentStartTimeChange"
> & {
  onAppointmentDoctorFieldChange: (value: string) => void;
  onAppointmentEndDateFieldChange: (value: string) => void;
  onAppointmentEndTimeFieldChange: (value: string) => void;
  onAppointmentPatientFieldChange: (value: string) => void;
  onAppointmentStartDateFieldChange: (value: string) => void;
  onAppointmentStartTimeFieldChange: (value: string) => void;
};

export function AgendaTab({
  onAppointmentDoctorFieldChange,
  onAppointmentEndDateFieldChange,
  onAppointmentEndTimeFieldChange,
  onAppointmentPatientFieldChange,
  onAppointmentStartDateFieldChange,
  onAppointmentStartTimeFieldChange,
  ...sectionProps
}: AgendaTabProps) {
  return (
    <AgendaSection
      {...sectionProps}
      onAppointmentDoctorChange={onAppointmentDoctorFieldChange}
      onAppointmentEndDateChange={onAppointmentEndDateFieldChange}
      onAppointmentEndTimeChange={onAppointmentEndTimeFieldChange}
      onAppointmentPatientChange={onAppointmentPatientFieldChange}
      onAppointmentStartDateChange={onAppointmentStartDateFieldChange}
      onAppointmentStartTimeChange={onAppointmentStartTimeFieldChange}
    />
  );
}
