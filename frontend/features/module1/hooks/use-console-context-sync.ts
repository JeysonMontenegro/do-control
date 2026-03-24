"use client";

import { useEffect } from "react";

import type { CommunicationTemplate, Doctor } from "@/features/module1/types";

type UseConsoleContextSyncParams = {
  appointmentFormDoctorId: string;
  availableDoctors: Doctor[];
  confirmationTemplate: CommunicationTemplate | null;
  currentRoles: string[];
  doctorFilter: string;
  encounterFormDoctorId: string;
  hasSingleDoctorContext: boolean;
  patientFormDoctorId: string;
  reminderRuleFormDoctorId: string;
  selectedDoctor: Doctor | null;
  setConfirmationTemplateDefaults: (template: CommunicationTemplate) => void;
  setDoctorFilter: React.Dispatch<React.SetStateAction<string>>;
  setAppointmentDoctorId: (doctorId: string) => void;
  setEncounterDoctorId: (doctorId: string) => void;
  setPatientDoctorId: (doctorId: string) => void;
  setReminderRuleDoctorId: (doctorId: string) => void;
  setTemplateDoctorId: (doctorId: string) => void;
  templateFormBody: string;
  templateFormDoctorId: string;
};

export function useConsoleContextSync({
  appointmentFormDoctorId,
  availableDoctors,
  confirmationTemplate,
  currentRoles,
  doctorFilter,
  encounterFormDoctorId,
  hasSingleDoctorContext,
  patientFormDoctorId,
  reminderRuleFormDoctorId,
  selectedDoctor,
  setConfirmationTemplateDefaults,
  setAppointmentDoctorId,
  setDoctorFilter,
  setEncounterDoctorId,
  setPatientDoctorId,
  setReminderRuleDoctorId,
  setTemplateDoctorId,
  templateFormBody,
  templateFormDoctorId,
}: UseConsoleContextSyncParams) {
  useEffect(() => {
    if (!currentRoles.includes("doctor") || !selectedDoctor) {
      return;
    }
    if (reminderRuleFormDoctorId !== String(selectedDoctor.id)) {
      setReminderRuleDoctorId(String(selectedDoctor.id));
    }
    if (templateFormDoctorId !== String(selectedDoctor.id)) {
      setTemplateDoctorId(String(selectedDoctor.id));
    }
  }, [currentRoles, reminderRuleFormDoctorId, selectedDoctor, setReminderRuleDoctorId, setTemplateDoctorId, templateFormDoctorId]);

  useEffect(() => {
    if (!availableDoctors.length || !hasSingleDoctorContext) {
      return;
    }
    const onlyDoctorId = String(availableDoctors[0].id);
    if (doctorFilter !== onlyDoctorId) {
      setDoctorFilter(onlyDoctorId);
    }
    if (appointmentFormDoctorId !== onlyDoctorId) {
      setAppointmentDoctorId(onlyDoctorId);
    }
    if (encounterFormDoctorId !== onlyDoctorId) {
      setEncounterDoctorId(onlyDoctorId);
    }
    if (patientFormDoctorId !== onlyDoctorId) {
      setPatientDoctorId(onlyDoctorId);
    }
  }, [
    appointmentFormDoctorId,
    availableDoctors,
    doctorFilter,
    encounterFormDoctorId,
    hasSingleDoctorContext,
    patientFormDoctorId,
    setAppointmentDoctorId,
    setDoctorFilter,
    setEncounterDoctorId,
    setPatientDoctorId,
  ]);

  useEffect(() => {
    if (!confirmationTemplate || templateFormBody.trim()) {
      return;
    }
    setConfirmationTemplateDefaults(confirmationTemplate);
  }, [confirmationTemplate, setConfirmationTemplateDefaults, templateFormBody]);
}
