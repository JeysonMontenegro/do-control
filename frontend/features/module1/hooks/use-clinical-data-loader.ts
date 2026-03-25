"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { apiGet } from "@/lib/api";
import type {
  Appointment,
  AppointmentReviewItem,
  ClinicSetting,
  CommunicationDispatch,
  CommunicationDispatchSummary,
  CommunicationTemplate,
  Doctor,
  EmailWhitelistState,
  EmailDispatch,
  EmailTemplate,
  Encounter,
  MessagingWhitelistState,
  Patient,
  Receptionist,
  ReminderRule,
} from "@/features/module1/types";

type LoadState = {
  appointments: Appointment[];
  doctors: Doctor[];
  encounters: Encounter[];
  patients: Patient[];
};

type DispatchFilters = {
  channel: string;
  query: string;
  status_filter: string;
};

type UseClinicalDataLoaderParams = {
  canViewGestion: boolean;
  canViewGlobalCommunications: boolean;
  canViewReviewQueue: boolean;
  currentRoles: string[];
  data: LoadState;
  dispatchFilters: DispatchFilters;
  doctorFilter: string;
  encounterFormDoctorId: string;
  isAdmin: boolean;
  isAuthenticated: boolean;
  patientSearch: string;
  reminderRuleFormDoctorId: string;
  setAppointmentReviewItems: React.Dispatch<React.SetStateAction<AppointmentReviewItem[]>>;
  setClinicSetting: React.Dispatch<React.SetStateAction<ClinicSetting | null>>;
  setCommunicationDispatchSummary: React.Dispatch<React.SetStateAction<CommunicationDispatchSummary | null>>;
  setCommunicationDispatches: React.Dispatch<React.SetStateAction<CommunicationDispatch[]>>;
  setCommunicationTemplates: React.Dispatch<React.SetStateAction<CommunicationTemplate[]>>;
  setData: React.Dispatch<React.SetStateAction<LoadState>>;
  setDoctorFilter: React.Dispatch<React.SetStateAction<string>>;
  setEmailDispatches: React.Dispatch<React.SetStateAction<EmailDispatch[]>>;
  setEmailWhitelist: React.Dispatch<React.SetStateAction<EmailWhitelistState | null>>;
  setEmailTemplates: React.Dispatch<React.SetStateAction<EmailTemplate[]>>;
  setEncounterDoctorId: (doctorId: string) => void;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setMessage: (message: string) => void;
  setMessagingWhitelist: React.Dispatch<React.SetStateAction<MessagingWhitelistState | null>>;
  setReceptionists: React.Dispatch<React.SetStateAction<Receptionist[]>>;
  setReminderRuleDoctorId: (doctorId: string) => void;
  setReminderRules: React.Dispatch<React.SetStateAction<ReminderRule[]>>;
  setSelectedPatientId: React.Dispatch<React.SetStateAction<string>>;
  setTemplateDoctorId: (doctorId: string) => void;
  templateFormDoctorId: string;
};

export function useClinicalDataLoader({
  canViewGestion,
  canViewGlobalCommunications,
  canViewReviewQueue,
  currentRoles,
  data,
  dispatchFilters,
  doctorFilter,
  encounterFormDoctorId,
  isAdmin,
  isAuthenticated,
  patientSearch,
  reminderRuleFormDoctorId,
  setAppointmentReviewItems,
  setClinicSetting,
  setCommunicationDispatchSummary,
  setCommunicationDispatches,
  setCommunicationTemplates,
  setData,
  setDoctorFilter,
  setEmailDispatches,
  setEmailWhitelist,
  setEmailTemplates,
  setEncounterDoctorId,
  setLoading,
  setMessage,
  setMessagingWhitelist,
  setReceptionists,
  setReminderRuleDoctorId,
  setReminderRules,
  setSelectedPatientId,
  setTemplateDoctorId,
  templateFormDoctorId,
}: UseClinicalDataLoaderParams) {
  const rolesKey = currentRoles.join("|");
  const scopedDoctorIdForLoad = useMemo(() => {
    const activeDoctors = data.doctors.filter((doctor) => doctor.is_active);
    if (currentRoles.includes("doctor")) {
      return doctorFilter ? Number(doctorFilter) : activeDoctors[0]?.id ?? null;
    }
    return doctorFilter ? Number(doctorFilter) : null;
  }, [currentRoles, data.doctors, doctorFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const patientPath = patientSearch.trim()
        ? `/api/patients?query=${encodeURIComponent(patientSearch.trim())}`
        : "/api/patients";
      const patientPathWithScope =
        scopedDoctorIdForLoad !== null
          ? `${patientPath}${patientPath.includes("?") ? "&" : "?"}doctor_id=${scopedDoctorIdForLoad}`
          : patientPath;
      const dispatchParams = new URLSearchParams({ limit: "40" });
      if (dispatchFilters.status_filter) {
        dispatchParams.set("status_filter", dispatchFilters.status_filter);
      }
      if (dispatchFilters.channel) {
        dispatchParams.set("channel", dispatchFilters.channel);
      }
      if (dispatchFilters.query.trim()) {
        dispatchParams.set("query", dispatchFilters.query.trim());
      }

      const [doctors, patients, appointments, encounters, loadedClinicSetting] = await Promise.all([
        apiGet<Doctor[]>("/api/doctors"),
        apiGet<Patient[]>(patientPathWithScope),
        apiGet<Appointment[]>("/api/appointments"),
        apiGet<Encounter[]>("/api/encounters"),
        apiGet<ClinicSetting>("/api/clinic-settings"),
      ]);

      setData({ doctors, patients, appointments, encounters });
      setClinicSetting(loadedClinicSetting);

      if (!encounterFormDoctorId && doctors[0]) {
        setEncounterDoctorId(String(doctors[0].id));
      }
      if (patients[0]) {
        setSelectedPatientId((current) => current || String(patients[0].id));
      }
      if (!doctorFilter && doctors[0] && (currentRoles.includes("doctor") || currentRoles.includes("receptionist"))) {
        setDoctorFilter(String(doctors[0].id));
      }
      if (!reminderRuleFormDoctorId && doctors[0] && currentRoles.includes("doctor")) {
        setReminderRuleDoctorId(String(doctors[0].id));
      }
      if (!templateFormDoctorId && doctors[0] && currentRoles.includes("doctor")) {
        setTemplateDoctorId(String(doctors[0].id));
      }

      void (async () => {
        try {
          const [
            loadedReminderRules,
            loadedTemplates,
            loadedDispatches,
            loadedDispatchSummary,
            loadedReviewItems,
            loadedReceptionists,
            loadedEmailTemplates,
            loadedEmailDispatches,
            loadedMessagingWhitelist,
            loadedEmailWhitelist,
          ] = await Promise.all([
            canViewGestion ? apiGet<ReminderRule[]>("/api/reminder-rules") : Promise.resolve([]),
            canViewGestion ? apiGet<CommunicationTemplate[]>("/api/communication-templates") : Promise.resolve([]),
            canViewGlobalCommunications
              ? apiGet<CommunicationDispatch[]>(`/api/communication-dispatches?${dispatchParams.toString()}`)
              : Promise.resolve([]),
            canViewGlobalCommunications
              ? apiGet<CommunicationDispatchSummary>("/api/communication-dispatches/summary")
              : Promise.resolve(null),
            canViewReviewQueue
              ? apiGet<AppointmentReviewItem[]>("/api/appointment-review-items?review_status=pending_review&limit=20")
              : Promise.resolve([]),
            isAdmin ? apiGet<Receptionist[]>("/api/receptionists") : Promise.resolve([]),
            isAdmin ? apiGet<EmailTemplate[]>("/api/email-templates") : Promise.resolve([]),
            isAdmin ? apiGet<EmailDispatch[]>("/api/email-dispatches") : Promise.resolve([]),
            isAdmin ? apiGet<MessagingWhitelistState>("/api/integrations/messaging/whitelist") : Promise.resolve(null),
            isAdmin ? apiGet<EmailWhitelistState>("/api/integrations/email/whitelist") : Promise.resolve(null),
          ]);

          setReminderRules(loadedReminderRules);
          setCommunicationTemplates(loadedTemplates);
          setCommunicationDispatches(loadedDispatches);
          setCommunicationDispatchSummary(loadedDispatchSummary);
          setAppointmentReviewItems(loadedReviewItems);
          setReceptionists(loadedReceptionists);
          setEmailTemplates(loadedEmailTemplates);
          setEmailDispatches(loadedEmailDispatches);
          setMessagingWhitelist(loadedMessagingWhitelist);
          setEmailWhitelist(loadedEmailWhitelist);
        } catch (backgroundError) {
          setMessage(
            backgroundError instanceof Error
              ? backgroundError.message
              : "No se pudo cargar parte de la información complementaria.",
          );
        }
      })();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la información clínica.");
    } finally {
      setLoading(false);
    }
  }, [
    canViewGestion,
    canViewGlobalCommunications,
    canViewReviewQueue,
    currentRoles,
    dispatchFilters,
    doctorFilter,
    encounterFormDoctorId,
    isAdmin,
    patientSearch,
    reminderRuleFormDoctorId,
    scopedDoctorIdForLoad,
    setAppointmentReviewItems,
    setClinicSetting,
    setCommunicationDispatchSummary,
    setCommunicationDispatches,
    setCommunicationTemplates,
    setData,
    setDoctorFilter,
    setEmailDispatches,
    setEmailWhitelist,
    setEmailTemplates,
    setEncounterDoctorId,
    setLoading,
    setMessage,
    setMessagingWhitelist,
    setReceptionists,
    setReminderRuleDoctorId,
    setReminderRules,
    setSelectedPatientId,
    setTemplateDoctorId,
    templateFormDoctorId,
  ]);

  const loadDataRef = useRef(loadData);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadDataRef.current();
    }
  }, [
    dispatchFilters.channel,
    dispatchFilters.query,
    dispatchFilters.status_filter,
    isAuthenticated,
    patientSearch,
    rolesKey,
    scopedDoctorIdForLoad,
  ]);

  return {
    loadData,
  };
}
