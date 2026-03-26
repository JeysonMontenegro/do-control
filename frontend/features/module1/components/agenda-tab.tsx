"use client";

import type { ComponentProps } from "react";

import { AgendaSection } from "@/features/module1/components/agenda-section";

type AgendaTabProps = Omit<
  ComponentProps<typeof AgendaSection>,
  | "onAppointmentDoctorChange"
  | "onAppointmentDurationChange"
  | "onAppointmentEndDateChange"
  | "onAppointmentEndTimeChange"
  | "onAppointmentManualEndToggle"
  | "onAppointmentNotifyPatientChange"
  | "onAppointmentNotesChange"
  | "onAppointmentPatientChange"
  | "onAppointmentReasonChange"
  | "onAppointmentStartDateChange"
  | "onAppointmentStartTimeChange"
  | "onAppointmentTypeChange"
  | "onSaveAppointmentNotes"
> & {
  onAppointmentDoctorFieldChange: (value: string) => void;
  onAppointmentDurationFieldChange: (value: string) => void;
  onAppointmentEndDateFieldChange: (value: string) => void;
  onAppointmentEndTimeFieldChange: (value: string) => void;
  onAppointmentManualEndFieldToggle: (value: boolean) => void;
  onAppointmentNotifyPatientFieldChange: (value: boolean) => void;
  onAppointmentNotesFieldChange: (value: string) => void;
  onAppointmentPatientFieldChange: (value: string) => void;
  onAppointmentReasonFieldChange: (value: string) => void;
  onAppointmentStartDateFieldChange: (value: string) => void;
  onAppointmentStartTimeFieldChange: (value: string) => void;
  onAppointmentTypeFieldChange: (value: string) => void;
  onSaveAppointmentNotes: (appointmentId: number, internalNotes: string) => Promise<boolean>;
};

export function AgendaTab({
  onAppointmentDoctorFieldChange,
  onAppointmentDurationFieldChange,
  onAppointmentEndDateFieldChange,
  onAppointmentEndTimeFieldChange,
  onAppointmentManualEndFieldToggle,
  onAppointmentNotifyPatientFieldChange,
  onAppointmentNotesFieldChange,
  onAppointmentPatientFieldChange,
  onAppointmentReasonFieldChange,
  onAppointmentStartDateFieldChange,
  onAppointmentStartTimeFieldChange,
  onAppointmentTypeFieldChange,
  onSaveAppointmentNotes,
  ...sectionProps
}: AgendaTabProps) {
  return (
    <AgendaSection
      {...sectionProps}
      onAppointmentDoctorChange={onAppointmentDoctorFieldChange}
      onAppointmentDurationChange={onAppointmentDurationFieldChange}
      onAppointmentEndDateChange={onAppointmentEndDateFieldChange}
      onAppointmentEndTimeChange={onAppointmentEndTimeFieldChange}
      onAppointmentManualEndToggle={onAppointmentManualEndFieldToggle}
      onAppointmentNotifyPatientChange={onAppointmentNotifyPatientFieldChange}
      onAppointmentNotesChange={onAppointmentNotesFieldChange}
      onAppointmentPatientChange={onAppointmentPatientFieldChange}
      onAppointmentReasonChange={onAppointmentReasonFieldChange}
      onAppointmentStartDateChange={onAppointmentStartDateFieldChange}
      onAppointmentStartTimeChange={onAppointmentStartTimeFieldChange}
      onAppointmentTypeChange={onAppointmentTypeFieldChange}
      onSaveAppointmentNotes={onSaveAppointmentNotes}
    />
  );
}
