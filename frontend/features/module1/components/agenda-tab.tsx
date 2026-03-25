"use client";

import type { ComponentProps } from "react";

import { AgendaSection } from "@/features/module1/components/agenda-section";

type AgendaTabProps = Omit<
  ComponentProps<typeof AgendaSection>,
  | "onAppointmentDoctorChange"
  | "onAppointmentEndDateChange"
  | "onAppointmentEndTimeChange"
  | "onAppointmentNotifyPatientChange"
  | "onAppointmentPatientChange"
  | "onAppointmentReasonChange"
  | "onAppointmentStartDateChange"
  | "onAppointmentStartTimeChange"
  | "onAppointmentTypeChange"
> & {
  onAppointmentDoctorFieldChange: (value: string) => void;
  onAppointmentEndDateFieldChange: (value: string) => void;
  onAppointmentEndTimeFieldChange: (value: string) => void;
  onAppointmentNotifyPatientFieldChange: (value: boolean) => void;
  onAppointmentPatientFieldChange: (value: string) => void;
  onAppointmentReasonFieldChange: (value: string) => void;
  onAppointmentStartDateFieldChange: (value: string) => void;
  onAppointmentStartTimeFieldChange: (value: string) => void;
  onAppointmentTypeFieldChange: (value: string) => void;
};

export function AgendaTab({
  onAppointmentDoctorFieldChange,
  onAppointmentEndDateFieldChange,
  onAppointmentEndTimeFieldChange,
  onAppointmentNotifyPatientFieldChange,
  onAppointmentPatientFieldChange,
  onAppointmentReasonFieldChange,
  onAppointmentStartDateFieldChange,
  onAppointmentStartTimeFieldChange,
  onAppointmentTypeFieldChange,
  ...sectionProps
}: AgendaTabProps) {
  return (
    <AgendaSection
      {...sectionProps}
      onAppointmentDoctorChange={onAppointmentDoctorFieldChange}
      onAppointmentEndDateChange={onAppointmentEndDateFieldChange}
      onAppointmentEndTimeChange={onAppointmentEndTimeFieldChange}
      onAppointmentNotifyPatientChange={onAppointmentNotifyPatientFieldChange}
      onAppointmentPatientChange={onAppointmentPatientFieldChange}
      onAppointmentReasonChange={onAppointmentReasonFieldChange}
      onAppointmentStartDateChange={onAppointmentStartDateFieldChange}
      onAppointmentStartTimeChange={onAppointmentStartTimeFieldChange}
      onAppointmentTypeChange={onAppointmentTypeFieldChange}
    />
  );
}
