"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppointmentBadges } from "@/features/module1/components/appointment-badges";
import { AgendaSection } from "@/features/module1/components/agenda-section";
import { AgendaCalendar } from "@/features/module1/components/agenda-calendar";
import {
  createDispatchStatusForm,
  createEmailTemplateForm,
  createPatientEditForm,
  createPatientForm,
  createReceptionistForm,
  createReminderRuleForm,
  createTemplateForm,
} from "@/features/module1/clinical-console-defaults";
import { DispatchStatusModal } from "@/features/module1/components/dispatch-status-modal";
import { DoctorsSection } from "@/features/module1/components/doctors-section";
import { EncountersSection } from "@/features/module1/components/encounters-section";
import { GestionEmailSection } from "@/features/module1/components/gestion-email-section";
import { DateField, PhoneField, RequiredLabel } from "@/features/module1/components/form-fields";
import { GestionMessagesSection } from "@/features/module1/components/gestion-messages-section";
import { GestionReceptionSection } from "@/features/module1/components/gestion-reception-section";
import { GestionRemindersSection } from "@/features/module1/components/gestion-reminders-section";
import { GestionSummarySection } from "@/features/module1/components/gestion-summary-section";
import { LoginPanel } from "@/features/module1/components/login-panel";
import { MessagesSection } from "@/features/module1/components/messages-section";
import { PatientActionModal } from "@/features/module1/components/patient-action-modal";
import { PatientsSection } from "@/features/module1/components/patients-section";
import { PendingReviewSection } from "@/features/module1/components/pending-review-section";
import { ReceptionistModal } from "@/features/module1/components/receptionist-modal";
import { ReviewResolutionModal } from "@/features/module1/components/review-resolution-modal";
import { useCommunicationsConsole } from "@/features/module1/hooks/use-communications-console";
import { useAppointmentAdmin } from "@/features/module1/hooks/use-appointment-admin";
import { useClinicalSession } from "@/features/module1/hooks/use-clinical-session";
import { useDoctorAdmin } from "@/features/module1/hooks/use-doctor-admin";
import { usePatientAdmin } from "@/features/module1/hooks/use-patient-admin";
import { useReceptionistAdmin } from "@/features/module1/hooks/use-receptionist-admin";
import { useReviewQueue } from "@/features/module1/hooks/use-review-queue";
import {
  CONFIRMATION_TEMPLATE_KEY,
  DEFAULT_CONFIRMATION_BODY,
  DEFAULT_CONFIRMATION_TITLE,
  type CalendarView,
  type ConsoleTab,
  consoleTabs,
  slotLabels,
} from "@/features/module1/console-config";
import {
  addDays,
  appointmentTypeLabel,
  calendarRangeLabel,
  communicationKindLabel,
  confirmationLabel,
  dispatchStatusLabel,
  encounterTypeLabel,
  combineDisplayDateTimeToIso,
  formatDate,
  formatDateTime,
  hasAnyRole,
  lastDispatchStatus,
  nowPlusMinutes,
  reminderLeadTimeLabel,
  reviewReasonLabel,
  splitDateTimeLocal,
  startOfDay,
  startOfMonthGrid,
  startOfWeek,
} from "@/features/module1/console-utils";
import { getMessageTone } from "@/features/module1/message-utils";
import { getFirstExamOrderId } from "@/features/module1/review-utils";
import { API_URL, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  Appointment,
  AppointmentReviewItem,
  CommunicationDispatchGeneration,
  CommunicationDispatch,
  CommunicationDispatchSummary,
  CommunicationTemplate,
  ClinicSetting,
  Diagnosis,
  Doctor,
  EmailDispatch,
  EmailTemplate,
  Encounter,
  ExamOrder,
  Patient,
  PatientSummary,
  PrescriptionItem,
  Receptionist,
  ReminderRule,
} from "@/features/module1/types";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

type LoadState = {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  encounters: Encounter[];
};

type GestionSubtab = "resumen" | "mensajes" | "recordatorios" | "correos" | "recepcion";
type MessagesSubtab = "paciente" | "citas" | "operacion";
type ReviewResolutionAction = "reject" | "link_existing" | "create_appointment";

const initialLoadState: LoadState = {
  doctors: [],
  patients: [],
  appointments: [],
  encounters: [],
};

export function ClinicalConsole() {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  const [data, setData] = useState<LoadState>(initialLoadState);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ConsoleTab>("agenda");
  const [gestionSubtab, setGestionSubtab] = useState<GestionSubtab>("resumen");
  const [messagesSubtab, setMessagesSubtab] = useState<MessagesSubtab>("paciente");
  const [calendarView, setCalendarView] = useState<CalendarView>("semana");
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()));
  const [doctorFilter, setDoctorFilter] = useState("");
  const [topbarSearch, setTopbarSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<PatientSummary | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState("lab_result");
  const [attachmentEncounterId, setAttachmentEncounterId] = useState("");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
  const [clinicSetting, setClinicSetting] = useState<ClinicSetting | null>(null);
  const [communicationTemplates, setCommunicationTemplates] = useState<CommunicationTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailDispatches, setEmailDispatches] = useState<EmailDispatch[]>([]);
  const [communicationDispatches, setCommunicationDispatches] = useState<CommunicationDispatch[]>([]);
  const [communicationDispatchSummary, setCommunicationDispatchSummary] = useState<CommunicationDispatchSummary | null>(null);
  const [selectedPatientDispatches, setSelectedPatientDispatches] = useState<CommunicationDispatch[]>([]);
  const [expandedEncounterId, setExpandedEncounterId] = useState<number | null>(null);
  const [appointmentReviewItems, setAppointmentReviewItems] = useState<AppointmentReviewItem[]>([]);
  const [dispatchFilters, setDispatchFilters] = useState({
    status_filter: "",
    channel: "",
    query: "",
  });
  const [reminderRuleForm, setReminderRuleForm] = useState(createReminderRuleForm);
  const [templateForm, setTemplateForm] = useState(createTemplateForm);
  const [emailTemplateForm, setEmailTemplateForm] = useState(createEmailTemplateForm);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [encounterForm, setEncounterForm] = useState({
    patient_id: "",
    doctor_id: "",
    appointment_id: "",
    encounter_date: splitDateTimeLocal(nowPlusMinutes(0)).date,
    encounter_time: splitDateTimeLocal(nowPlusMinutes(0)).time,
    encounter_type: "general_consultation",
    chief_complaint: "",
    created_by: "frontend-demo",
  });
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([
    { diagnosis_text: "", diagnosis_code: null, is_primary: true, notes: null },
  ]);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    { medication_name: "", dosage: null, frequency: null, duration: null, instructions: null },
  ]);
  const [examOrders, setExamOrders] = useState<ExamOrder[]>([
    { exam_name: "", exam_category: null, instructions: null },
  ]);
  const [activeReceptionistPage, setActiveReceptionistPage] = useState(1);
  const [inactiveReceptionistPage, setInactiveReceptionistPage] = useState(1);

  const {
    currentRoles,
    currentUserDisplayName,
    currentUserEmail,
    currentUserFirstName,
    currentUserGender,
    currentUserLastName,
    currentUserPhoneNumber,
    currentUserProfilePhotoUrl,
    isAuthenticated,
    loginForm,
    logout,
    profileForm,
    profilePhotoFile,
    setLoginForm,
    setProfileForm,
    setProfilePhotoFile,
    submitLogin,
    updateCurrentProfile,
    uploadCurrentProfilePhoto,
  } = useClinicalSession({
    recaptchaSiteKey,
    setMessage,
    onLogout: () => {
      setData(initialLoadState);
      setSelectedSummary(null);
      setSelectedPatientDispatches([]);
    },
  });

  const {
    activeReviewItem,
    closeReviewResolutionModal,
    resolveReviewItem,
    reviewAppointmentOptions,
    reviewPatientOptions,
    reviewResolutionForm,
    setReviewResolutionForm,
    submitReviewResolution,
  } = useReviewQueue({
    appointmentReviewItems,
    appointments: data.appointments,
    currentUserEmail,
    patients: data.patients,
    selectedPatientId,
    setMessage,
    onResolved: loadData,
  });

  const canManagePatients = hasAnyRole(currentRoles, ["admin", "doctor", "receptionist"]);
  const canManageAppointments = hasAnyRole(currentRoles, ["admin", "doctor", "receptionist"]);
  const canManageEncounters = hasAnyRole(currentRoles, ["admin", "doctor"]);
  const canViewPatientTimeline = hasAnyRole(currentRoles, ["admin", "doctor", "receptionist"]);
  const canViewMessages = hasAnyRole(currentRoles, ["admin", "receptionist", "doctor"]);
  const canViewGlobalCommunications = hasAnyRole(currentRoles, ["admin", "receptionist"]);
  const canViewReviewQueue = hasAnyRole(currentRoles, ["admin", "doctor", "receptionist"]);
  const canViewGestion = hasAnyRole(currentRoles, ["admin", "doctor", "receptionist"]);
  const isAdmin = hasAnyRole(currentRoles, ["admin"]);
  const isReceptionist = hasAnyRole(currentRoles, ["receptionist"]);

  async function loadData() {
    setLoading(true);
    try {
      const patientPath = patientSearch.trim()
        ? `/api/patients?query=${encodeURIComponent(patientSearch.trim())}`
        : "/api/patients";
      const patientPathWithScope =
        scopedDoctorId !== null ? `${patientPath}${patientPath.includes("?") ? "&" : "?"}doctor_id=${scopedDoctorId}` : patientPath;
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

      const [
        doctors,
        patients,
        appointments,
        encounters,
        loadedReminderRules,
        loadedTemplates,
        loadedDispatches,
        loadedDispatchSummary,
        loadedReviewItems,
        loadedReceptionists,
        loadedClinicSetting,
        loadedEmailTemplates,
        loadedEmailDispatches,
      ] = await Promise.all([
        apiGet<Doctor[]>("/api/doctors"),
        apiGet<Patient[]>(patientPathWithScope),
        apiGet<Appointment[]>("/api/appointments"),
        apiGet<Encounter[]>("/api/encounters"),
        canViewGestion ? apiGet<ReminderRule[]>("/api/reminder-rules") : Promise.resolve([]),
        canViewGestion ? apiGet<CommunicationTemplate[]>("/api/communication-templates") : Promise.resolve([]),
        canViewGlobalCommunications
          ? apiGet<CommunicationDispatch[]>(`/api/communication-dispatches?${dispatchParams.toString()}`)
          : Promise.resolve([]),
        canViewGlobalCommunications ? apiGet<CommunicationDispatchSummary>("/api/communication-dispatches/summary") : Promise.resolve(null),
        canViewReviewQueue ? apiGet<AppointmentReviewItem[]>("/api/appointment-review-items?review_status=pending_review&limit=20") : Promise.resolve([]),
        isAdmin ? apiGet<Receptionist[]>("/api/receptionists") : Promise.resolve([]),
        apiGet<ClinicSetting>("/api/clinic-settings"),
        isAdmin ? apiGet<EmailTemplate[]>("/api/email-templates") : Promise.resolve([]),
        isAdmin ? apiGet<EmailDispatch[]>("/api/email-dispatches") : Promise.resolve([]),
      ]);

      setData({ doctors, patients, appointments, encounters });
      setReminderRules(loadedReminderRules);
      setCommunicationTemplates(loadedTemplates);
      setCommunicationDispatches(loadedDispatches);
      setCommunicationDispatchSummary(loadedDispatchSummary);
      setAppointmentReviewItems(loadedReviewItems);
      setReceptionists(loadedReceptionists);
      setClinicSetting(loadedClinicSetting);
      setEmailTemplates(loadedEmailTemplates);
      setEmailDispatches(loadedEmailDispatches);
      if (!appointmentForm.doctor_id && doctors[0]) {
        setAppointmentForm((current) => ({ ...current, doctor_id: String(doctors[0].id) }));
      }
      if (!encounterForm.doctor_id && doctors[0]) {
        setEncounterForm((current) => ({ ...current, doctor_id: String(doctors[0].id) }));
      }
      if (!selectedPatientId && patients[0]) {
        setSelectedPatientId(String(patients[0].id));
      }
      if (!doctorFilter && doctors[0] && (currentRoles.includes("doctor") || currentRoles.includes("receptionist"))) {
        setDoctorFilter(String(doctors[0].id));
      }
      if (!reminderRuleForm.doctor_id && doctors[0] && currentRoles.includes("doctor")) {
        setReminderRuleForm((current) => ({ ...current, doctor_id: String(doctors[0].id) }));
      }
      if (!templateForm.doctor_id && doctors[0] && currentRoles.includes("doctor")) {
        setTemplateForm((current) => ({ ...current, doctor_id: String(doctors[0].id) }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la información clínica.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, patientSearch, currentRoles, dispatchFilters, doctorFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadSummary() {
      if (!selectedPatientId) {
        setSelectedSummary(null);
        return;
      }

      try {
        const summaryPath =
          scopedDoctorId !== null
            ? `/api/patients/${selectedPatientId}/summary?doctor_id=${scopedDoctorId}`
            : `/api/patients/${selectedPatientId}/summary`;
        const summary = await apiGet<PatientSummary>(summaryPath);
        setSelectedSummary(summary);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "No se pudo cargar el resumen del paciente.";
        if (errorMessage.includes("Patient not found")) {
          setSelectedSummary(null);
          setSelectedPatientDispatches([]);
          return;
        }
        setMessage(errorMessage);
      }
    }

    loadSummary();
  }, [isAuthenticated, selectedPatientId, doctorFilter, currentRoles]);

  useEffect(() => {
    if (!selectedPatientId) {
      return;
    }
    const patientStillVisible = data.patients.some((patient) => String(patient.id) === selectedPatientId);
    if (patientStillVisible) {
      return;
    }
    setSelectedPatientId("");
    setSelectedSummary(null);
    setSelectedPatientDispatches([]);
  }, [data.patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedSummary) {
      setPatientEditForm(createPatientEditForm());
      return;
    }

    setPatientEditForm({
      first_name: selectedSummary.patient.first_name ?? "",
      last_name: selectedSummary.patient.last_name ?? "",
      primary_phone: selectedSummary.patient.primary_phone ?? "",
      national_id: selectedSummary.patient.national_id ?? "",
      tax_id: selectedSummary.patient.tax_id ?? "",
      email: selectedSummary.patient.email ?? "",
      address: selectedSummary.patient.address ?? "",
      notes: selectedSummary.patient.notes ?? "",
      is_active: selectedSummary.patient.is_active,
    });
  }, [selectedSummary]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (!selectedPatientId || !canViewPatientTimeline) {
      setSelectedPatientDispatches([]);
      return;
    }

    async function loadPatientDispatches() {
      try {
        const dispatches = await apiGet<CommunicationDispatch[]>(
          `/api/communication-dispatches?patient_id=${selectedPatientId}&limit=12`,
        );
        setSelectedPatientDispatches(dispatches);
      } catch (error) {
        setSelectedPatientDispatches([]);
        setMessage(error instanceof Error ? error.message : "No se pudo cargar el historial de mensajes.");
      }
    }

    loadPatientDispatches();
  }, [isAuthenticated, selectedPatientId, canViewPatientTimeline]);
  async function toggleEmailDelivery(enabled: boolean) {
    setMessage("");
    try {
      const updated = await apiPatch<ClinicSetting>("/api/clinic-settings", {
        email_delivery_enabled: enabled,
      });
      setClinicSetting(updated);
      setMessage(enabled ? "Envío de correos habilitado." : "Envío de correos deshabilitado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la configuración de correos.");
    }
  }

  async function toggleEmailProcessSetting(field: keyof ClinicSetting, enabled: boolean) {
    setMessage("");
    try {
      const updated = await apiPatch<ClinicSetting>("/api/clinic-settings", {
        [field]: enabled,
      });
      setClinicSetting(updated);
      setMessage(enabled ? "Proceso de correo habilitado." : "Proceso de correo deshabilitado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el proceso de correo.");
    }
  }

  async function submitEncounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<Encounter>("/api/encounters", {
        ...encounterForm,
        patient_id: Number(encounterForm.patient_id),
        doctor_id: Number(encounterForm.doctor_id),
        appointment_id: encounterForm.appointment_id ? Number(encounterForm.appointment_id) : null,
        encounter_date: combineDisplayDateTimeToIso(encounterForm.encounter_date, encounterForm.encounter_time),
        diagnoses: diagnoses
          .filter((item) => item.diagnosis_text.trim())
          .map((item) => ({
            ...item,
            diagnosis_code: item.diagnosis_code || null,
            notes: item.notes || null,
          })),
        prescription: prescriptionItems.some((item) => item.medication_name.trim())
          ? {
              notes: null,
              items: prescriptionItems
                .filter((item) => item.medication_name.trim())
                .map((item) => ({
                  ...item,
                  dosage: item.dosage || null,
                  frequency: item.frequency || null,
                  duration: item.duration || null,
                  instructions: item.instructions || null,
                })),
            }
          : null,
        exam_orders: examOrders
          .filter((item) => item.exam_name.trim())
          .map((item) => ({
            ...item,
            exam_category: item.exam_category || null,
            instructions: item.instructions || null,
          })),
      });
      await loadData();
      setEncounterForm((current) => ({ ...current, chief_complaint: "", appointment_id: "" }));
      setDiagnoses([{ diagnosis_text: "", diagnosis_code: null, is_primary: true, notes: null }]);
      setPrescriptionItems([{ medication_name: "", dosage: null, frequency: null, duration: null, instructions: null }]);
      setExamOrders([{ exam_name: "", exam_category: null, instructions: null }]);
      setSelectedPatientId(encounterForm.patient_id);
      setMessage("Consulta registrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la consulta.");
    }
  }

  async function closeEncounter(encounterId: number) {
    setMessage("");
    try {
      await apiPatch<Encounter>(`/api/encounters/${encounterId}/close`, {
        closed_by: "frontend-demo",
      });
      await loadData();
      if (selectedPatientId) {
        setSelectedSummary(
          await apiGet<PatientSummary>(
            scopedDoctorId !== null
              ? `/api/patients/${selectedPatientId}/summary?doctor_id=${scopedDoctorId}`
              : `/api/patients/${selectedPatientId}/summary`,
          ),
        );
      }
      setMessage(`Consulta ${encounterId} cerrada.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cerrar la consulta.");
    }
  }

  async function submitAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!selectedPatientId || !attachmentFile) {
      setMessage("Selecciona un paciente y un archivo.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("patient_id", selectedPatientId);
      if (attachmentEncounterId) {
        formData.append("encounter_id", attachmentEncounterId);
      }
      formData.append("file_type", attachmentType);
      formData.append("uploaded_by", "frontend-demo");
      formData.append("file", attachmentFile);

      const response = await fetch(`${API_URL}/api/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      setAttachmentFile(null);
      setAttachmentEncounterId("");
      if (selectedPatientId) {
        setSelectedSummary(
          await apiGet<PatientSummary>(
            scopedDoctorId !== null
              ? `/api/patients/${selectedPatientId}/summary?doctor_id=${scopedDoctorId}`
              : `/api/patients/${selectedPatientId}/summary`,
          ),
        );
      }
      setMessage("Documento adjuntado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo adjuntar el archivo.");
    }
  }

  async function openAttachment(attachmentId: number) {
    setMessage("");
    setDownloadingAttachmentId(attachmentId);
    try {
      window.open(
        `${API_URL}/api/attachments/${attachmentId}/content?requested_by=frontend-demo`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo abrir el archivo.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  async function submitReminderRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<ReminderRule>("/api/reminder-rules", {
        doctor_id: reminderRuleForm.doctor_id ? Number(reminderRuleForm.doctor_id) : null,
        channel: reminderRuleForm.channel,
        trigger_type: reminderRuleForm.trigger_type,
        minutes_before: Number(reminderRuleForm.minutes_before),
        template_key: reminderRuleForm.template_key,
        is_active: reminderRuleForm.is_active,
      });
      setReminderRuleForm(createReminderRuleForm());
      await loadData();
      setMessage("Regla de recordatorio creada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la regla.");
    }
  }

  async function activateDefault24HourReminder() {
    setMessage("");
    try {
      const templatePayload = {
        doctor_id: null,
        channel: "whatsapp",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        title: templateForm.title || DEFAULT_CONFIRMATION_TITLE,
        body: templateForm.body || DEFAULT_CONFIRMATION_BODY,
        is_active: true,
      };

      const generalConfirmationTemplate = communicationTemplates.find(
        (template) => template.template_key === CONFIRMATION_TEMPLATE_KEY && template.doctor_id === null,
      );

      if (generalConfirmationTemplate) {
        await apiPatch<CommunicationTemplate>(`/api/communication-templates/${generalConfirmationTemplate.id}`, templatePayload);
      } else {
        await apiPost<CommunicationTemplate>("/api/communication-templates", templatePayload);
      }

      const generalRule = reminderRules.find((rule) => rule.doctor_id === null && rule.trigger_type === "before_appointment");
      const rulePayload = {
        doctor_id: null,
        channel: "whatsapp",
        trigger_type: "before_appointment",
        minutes_before: 1440,
        template_key: CONFIRMATION_TEMPLATE_KEY,
        is_active: true,
      };

      if (generalRule) {
        await apiPatch<ReminderRule>(`/api/reminder-rules/${generalRule.id}`, rulePayload);
      } else {
        await apiPost<ReminderRule>("/api/reminder-rules", rulePayload);
      }

      setReminderRuleForm((current) => ({
        ...current,
        doctor_id: "",
        minutes_before: "1440",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        is_active: true,
      }));
      await loadData();
      setMessage("La regla general de 24 horas quedó activa.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo activar la regla general de 24 horas.");
    }
  }

  async function toggleReminderRule(rule: ReminderRule) {
    setMessage("");
    try {
      await apiPatch<ReminderRule>(`/api/reminder-rules/${rule.id}`, {
        is_active: !rule.is_active,
      });
      await loadData();
      setMessage(`Regla ${rule.is_active ? "desactivada" : "activada"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la regla.");
    }
  }

  const activeReceptionists = useMemo(() => receptionists.filter((receptionist) => receptionist.is_active), [receptionists]);
  const inactiveReceptionists = useMemo(() => receptionists.filter((receptionist) => !receptionist.is_active), [receptionists]);
  const teamPageSize = 6;
  const allowMultiDoctorVisibility = clinicSetting?.allow_multi_doctor_visibility ?? false;
  const canChooseAmongMultipleDoctors = isAdmin || isReceptionist || allowMultiDoctorVisibility;
  const currentUserDisplay = useMemo(() => {
    const fullName = `${currentUserFirstName} ${currentUserLastName}`.trim();
    const alias = currentUserDisplayName?.trim() || "";
    const baseName = fullName || alias || currentUserEmail;
    if (currentRoles.includes("doctor")) {
      return `${currentUserGender === "female" ? "Dra." : "Dr."} ${baseName}`;
    }
    if (currentRoles.includes("receptionist")) {
      return `Recepción ${baseName}`;
    }
    return baseName;
  }, [currentRoles, currentUserDisplayName, currentUserEmail, currentUserFirstName, currentUserGender, currentUserLastName]);
  const {
    activeDoctorPage,
    activeDoctors,
    addDoctorClinic,
    doctorAdminForm,
    doctorDirectorySearch,
    doctorRosterTab,
    editingDoctorId,
    filteredActiveDoctors,
    filteredInactiveDoctors,
    inactiveDoctorPage,
    inactiveDoctors,
    removeDoctorClinic,
    resetDoctorAdminForm,
    setActiveDoctorPage,
    setDoctorAdminForm,
    setDoctorRosterTab,
    setInactiveDoctorPage,
    startDoctorEdit,
    submitDoctorAdmin,
    toggleDoctorActive,
    toggleMultiDoctorVisibility,
    updateDoctorClinic,
    updateDoctorDirectorySearch,
  } = useDoctorAdmin({
    doctors: data.doctors,
    loadData,
    setClinicSetting,
    setMessage,
  });
  const paginatedActiveDoctors = useMemo(
    () => filteredActiveDoctors.slice((activeDoctorPage - 1) * teamPageSize, activeDoctorPage * teamPageSize),
    [activeDoctorPage, filteredActiveDoctors, teamPageSize],
  );
  const paginatedInactiveDoctors = useMemo(
    () => filteredInactiveDoctors.slice((inactiveDoctorPage - 1) * teamPageSize, inactiveDoctorPage * teamPageSize),
    [inactiveDoctorPage, filteredInactiveDoctors, teamPageSize],
  );
  const paginatedActiveReceptionists = useMemo(
    () => activeReceptionists.slice((activeReceptionistPage - 1) * teamPageSize, activeReceptionistPage * teamPageSize),
    [activeReceptionistPage, activeReceptionists, teamPageSize],
  );
  const paginatedInactiveReceptionists = useMemo(
    () => inactiveReceptionists.slice((inactiveReceptionistPage - 1) * teamPageSize, inactiveReceptionistPage * teamPageSize),
    [inactiveReceptionistPage, inactiveReceptionists, teamPageSize],
  );
  const {
    editingReceptionistId,
    filteredDoctorOptions,
    receptionistDoctorSearch,
    receptionistForm,
    resetReceptionistForm,
    selectedReceptionist,
    setReceptionistDoctorSearch,
    setReceptionistForm,
    setSelectedReceptionistId,
    setShowReceptionistModal,
    showReceptionistModal,
    startReceptionistEdit,
    submitReceptionist,
    toggleReceptionistActive,
  } = useReceptionistAdmin({
    activeReceptionists,
    doctors: data.doctors,
    loadData,
    receptionists,
    setMessage,
  });
  const scopedDoctorId = useMemo(() => {
    if (currentRoles.includes("doctor")) {
      return doctorFilter ? Number(doctorFilter) : activeDoctors[0]?.id ?? null;
    }
    return doctorFilter ? Number(doctorFilter) : null;
  }, [activeDoctors, currentRoles, doctorFilter]);
  const {
    appointmentDispatches,
    appointmentFilter,
    appointmentForm,
    appointmentHistory,
    expandedAppointmentId,
    setAppointmentDispatches,
    setAppointmentFilter,
    setAppointmentForm,
    setExpandedAppointmentId,
    submitAppointment,
    toggleAppointmentHistory,
    updateAppointmentStatus,
  } = useAppointmentAdmin({
    loadData,
    scopedDoctorId,
    selectedPatientId,
    setMessage,
    setSelectedPatientId,
    setSelectedSummary,
  });
  const focusedAppointment = useMemo(
    () => data.appointments.find((appointment) => appointment.id === expandedAppointmentId) ?? null,
    [data.appointments, expandedAppointmentId],
  );
  const selectedDoctor = useMemo(
    () =>
      activeDoctors.find(
        (doctor) => String(doctor.id) === doctorFilter || String(doctor.id) === appointmentForm.doctor_id || String(doctor.id) === encounterForm.doctor_id,
      ) ?? activeDoctors[0] ?? null,
    [activeDoctors, appointmentForm.doctor_id, doctorFilter, encounterForm.doctor_id],
  );
  const availableDoctors = activeDoctors;
  const hasSingleDoctorContext = availableDoctors.length === 1;
  const doctorNameById = useMemo(
    () =>
      new Map(
        data.doctors.map((doctor) => [
          doctor.id,
          `Dr. ${doctor.first_name} ${doctor.last_name}`.trim(),
        ]),
      ),
    [data.doctors],
  );
  const reviewQueueByAppointmentId = useMemo(
    () =>
      new Map(
        appointmentReviewItems
          .filter((item) => item.existing_appointment_id !== null)
          .map((item) => [item.existing_appointment_id as number, item]),
      ),
    [appointmentReviewItems],
  );
  const filteredAppointments = useMemo(() => {
    return data.appointments.filter((appointment) => {
      if (doctorFilter && String(appointment.doctor_id) !== doctorFilter) {
        return false;
      }

      const relatedDispatches = communicationDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
      const latestDispatchStatus = lastDispatchStatus(relatedDispatches);
      const needsAttention =
        appointment.confirmation_status === "pending" ||
        latestDispatchStatus === "failed" ||
        reviewQueueByAppointmentId.has(appointment.id);

      if (appointmentFilter === "ws") {
        return appointment.source === "appoint-me";
      }
      if (appointmentFilter === "confirmed") {
        return appointment.confirmation_status === "confirmed";
      }
      if (appointmentFilter === "pending_confirmation") {
        return appointment.confirmation_status === "pending";
      }
      if (appointmentFilter === "needs_attention") {
        return needsAttention;
      }
      return true;
    });
  }, [appointmentFilter, communicationDispatches, data.appointments, doctorFilter, reviewQueueByAppointmentId]);
  const agendaDays = useMemo(() => {
    if (calendarView === "dia") {
      return [startOfDay(calendarDate)];
    }
    if (calendarView === "semana") {
      const start = startOfWeek(calendarDate);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    return [];
  }, [calendarDate, calendarView]);
  const monthDays = useMemo(() => {
    if (calendarView !== "mes") {
      return [];
    }
    const start = startOfMonthGrid(calendarDate);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [calendarDate, calendarView]);
  const appointmentsByDayKey = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of filteredAppointments) {
      const dayKey = startOfDay(new Date(appointment.scheduled_start)).toISOString();
      const current = map.get(dayKey) ?? [];
      current.push(appointment);
      map.set(dayKey, current);
    }
    for (const entries of map.values()) {
      entries.sort((left, right) => new Date(left.scheduled_start).getTime() - new Date(right.scheduled_start).getTime());
    }
    return map;
  }, [filteredAppointments]);

  const {
    activeSectionAction,
    patientEditForm,
    patientForm,
    setActiveSectionAction,
    setPatientEditForm,
    setPatientForm,
    submitPatient,
    submitPatientUpdate,
  } = usePatientAdmin({
    availableDoctors,
    hasSingleDoctorContext,
    loadData,
    scopedDoctorId,
    selectedPatientId,
    setMessage,
    setSelectedSummary,
  });

  const scopedReminderRules = useMemo(
    () =>
      reminderRules.filter((rule) => rule.is_active && (scopedDoctorId === null || rule.doctor_id === null || rule.doctor_id === scopedDoctorId)),
    [reminderRules, scopedDoctorId],
  );
  const generalReminderRule = useMemo(
    () => reminderRules.find((rule) => rule.doctor_id === null && rule.trigger_type === "before_appointment") ?? null,
    [reminderRules],
  );

  const scopedUpcomingAppointments = useMemo(() => {
    const now = Date.now();
    return data.appointments.filter((appointment) => {
      if (scopedDoctorId !== null && appointment.doctor_id !== scopedDoctorId) {
        return false;
      }
      if (appointment.status === "cancelled" || appointment.confirmation_status === "cancelled") {
        return false;
      }
      return new Date(appointment.scheduled_start).getTime() >= now;
    });
  }, [data.appointments, scopedDoctorId]);

  const remindersScheduledCount = scopedReminderRules.length ? scopedUpcomingAppointments.length : 0;
  const confirmedUpcomingCount = scopedUpcomingAppointments.filter((appointment) => appointment.confirmation_status === "confirmed").length;
  const unconfirmedUpcomingCount = scopedUpcomingAppointments.filter((appointment) => appointment.confirmation_status !== "confirmed").length;
  const cancelledUpcomingCount = data.appointments.filter((appointment) => {
    if (scopedDoctorId !== null && appointment.doctor_id !== scopedDoctorId) {
      return false;
    }
    const startsAt = new Date(appointment.scheduled_start).getTime();
    return startsAt >= Date.now() && (appointment.status === "cancelled" || appointment.confirmation_status === "cancelled");
  }).length;

  const confirmationTemplate = useMemo(
    () =>
      communicationTemplates.find(
        (template) => template.template_key === CONFIRMATION_TEMPLATE_KEY && scopedDoctorId !== null && template.doctor_id === scopedDoctorId,
      ) ??
      communicationTemplates.find((template) => template.template_key === CONFIRMATION_TEMPLATE_KEY && template.doctor_id === null) ??
      null,
    [communicationTemplates, scopedDoctorId],
  );

  const {
    activeDispatch,
    closeDispatchStatusModal,
    dispatchAttempts,
    dispatchStatusForm,
    emailTemplatePreview,
    expandedDispatchId,
    generateDispatchesNow,
    previewConfirmationTemplate,
    previewEmailTemplate,
    previewTemplate,
    requeueDispatch,
    requeueVisibleFailedDispatches,
    resendEmailDispatch,
    saveConfirmationTemplate,
    saveEmailTemplate,
    sendAppointmentReminderNow,
    sendTestEmail,
    submitDispatchStatusUpdate,
    submitTemplate,
    templatePreview,
    toggleDispatchAttempts,
    toggleTemplate,
    updateDispatchStatus,
    setDispatchStatusForm,
  } = useCommunicationsConsole({
    appointmentDispatches,
    communicationDispatches,
    communicationTemplates,
    confirmationTemplate,
    currentRoles,
    currentUserEmail,
    emailTemplateForm,
    emailTemplates,
    loadData,
    selectedDoctor,
    selectedPatientId,
    selectedSummary,
    setAppointmentDispatches,
    setClinicSetting,
    setExpandedAppointmentId,
    setMessage,
    templateForm,
  });

  const sortedPatientEncounters = useMemo(() => {
    if (!selectedSummary) {
      return [];
    }
    return [...selectedSummary.encounters].sort(
      (left, right) => new Date(right.encounter_date).getTime() - new Date(left.encounter_date).getTime(),
    );
  }, [selectedSummary]);

  const selectedPatient = selectedSummary?.patient ?? null;

  useEffect(() => {
    if (!currentRoles.includes("doctor") || !selectedDoctor) {
      return;
    }
    if (reminderRuleForm.doctor_id !== String(selectedDoctor.id)) {
      setReminderRuleForm((current) => ({ ...current, doctor_id: String(selectedDoctor.id) }));
    }
    if (templateForm.doctor_id !== String(selectedDoctor.id)) {
      setTemplateForm((current) => ({ ...current, doctor_id: String(selectedDoctor.id) }));
    }
  }, [currentRoles, reminderRuleForm.doctor_id, selectedDoctor, templateForm.doctor_id]);

  useEffect(() => {
    if (!availableDoctors.length) {
      return;
    }
    if (hasSingleDoctorContext) {
      const onlyDoctorId = String(availableDoctors[0].id);
      if (doctorFilter !== onlyDoctorId) {
        setDoctorFilter(onlyDoctorId);
      }
      if (appointmentForm.doctor_id !== onlyDoctorId) {
        setAppointmentForm((current) => ({ ...current, doctor_id: onlyDoctorId }));
      }
      if (encounterForm.doctor_id !== onlyDoctorId) {
        setEncounterForm((current) => ({ ...current, doctor_id: onlyDoctorId }));
      }
      if (patientForm.doctor_id !== onlyDoctorId) {
        setPatientForm((current) => ({ ...current, doctor_id: onlyDoctorId }));
      }
    }
  }, [appointmentForm.doctor_id, availableDoctors, doctorFilter, encounterForm.doctor_id, hasSingleDoctorContext, patientForm.doctor_id]);

  useEffect(() => {
    if (!confirmationTemplate || templateForm.body.trim()) {
      return;
    }
    setTemplateForm((current) => ({
      ...current,
      doctor_id: confirmationTemplate.doctor_id ? String(confirmationTemplate.doctor_id) : current.doctor_id,
      channel: confirmationTemplate.channel,
      template_key: confirmationTemplate.template_key,
      title: confirmationTemplate.title,
      body: confirmationTemplate.body,
      is_active: confirmationTemplate.is_active,
    }));
  }, [confirmationTemplate, templateForm.body]);

  const calendarMetrics = (appointment: Appointment) => {
    const start = new Date(appointment.scheduled_start);
    const end = new Date(appointment.scheduled_end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const dayStart = 6 * 60;
    const dayEnd = 20 * 60;
    const clampedStart = Math.max(startMinutes, dayStart);
    const clampedEnd = Math.min(endMinutes, dayEnd);
    const rowStart = Math.max(2, Math.floor((clampedStart - dayStart) / 30) + 2);
    const rowEnd = Math.max(rowStart + 1, Math.ceil((clampedEnd - dayStart) / 30) + 2);
    return { rowStart, rowEnd };
  };

  const goToPreviousRange = () => {
    setCalendarDate((current) => {
      if (calendarView === "dia") {
        return addDays(current, -1);
      }
      if (calendarView === "semana") {
        return addDays(current, -7);
      }
      return new Date(current.getFullYear(), current.getMonth() - 1, 1);
    });
  };

  const goToNextRange = () => {
    setCalendarDate((current) => {
      if (calendarView === "dia") {
        return addDays(current, 1);
      }
      if (calendarView === "semana") {
        return addDays(current, 7);
      }
      return new Date(current.getFullYear(), current.getMonth() + 1, 1);
    });
  };

  const goToToday = () => setCalendarDate(startOfDay(new Date()));

  const renderAppointmentBadges = (appointment: Appointment) => {
    const relatedDispatches = communicationDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
    const latestMessageStatus = lastDispatchStatus(relatedDispatches);
    const reviewItem = reviewQueueByAppointmentId.get(appointment.id);

    return <AppointmentBadges appointment={appointment} latestMessageStatus={latestMessageStatus} reviewItem={reviewItem} />;
  };

  const renderAgendaTab = () => (
    <AgendaSection
      agendaDays={agendaDays}
      allowMultiDoctorVisibility={allowMultiDoctorVisibility}
      appointmentDispatches={appointmentDispatches}
      appointmentFilter={appointmentFilter}
      appointmentForm={appointmentForm}
      appointmentHistory={appointmentHistory}
      appointmentReviewItems={appointmentReviewItems}
      appointmentsByDayKey={appointmentsByDayKey}
      availableDoctors={availableDoctors}
      calendarDate={calendarDate}
      calendarMetrics={calendarMetrics}
      calendarView={calendarView}
      canChooseAmongMultipleDoctors={canChooseAmongMultipleDoctors}
      canManageAppointments={canManageAppointments}
      canViewGlobalCommunications={canViewGlobalCommunications}
      data={{ appointments: data.appointments, encounters: data.encounters, patients: data.patients }}
      dispatchAttempts={dispatchAttempts}
      doctorFilter={doctorFilter}
      expandedDispatchId={expandedDispatchId}
      filteredAppointments={filteredAppointments}
      focusedAppointment={focusedAppointment}
      goToNextRange={goToNextRange}
      goToPreviousRange={goToPreviousRange}
      goToToday={goToToday}
      isAdmin={isAdmin}
      monthDays={monthDays}
      onAppointmentDoctorChange={(value) => setAppointmentForm((current) => ({ ...current, doctor_id: value }))}
      onAppointmentEndDateChange={(value) => setAppointmentForm((current) => ({ ...current, scheduled_end_date: value }))}
      onAppointmentEndTimeChange={(value) => setAppointmentForm((current) => ({ ...current, scheduled_end_time: value }))}
      onAppointmentFilterChange={setAppointmentFilter}
      onAppointmentPatientChange={(value) => setAppointmentForm((current) => ({ ...current, patient_id: value }))}
      onAppointmentStartDateChange={(value) => setAppointmentForm((current) => ({ ...current, scheduled_start_date: value }))}
      onAppointmentStartTimeChange={(value) => setAppointmentForm((current) => ({ ...current, scheduled_start_time: value }))}
      onCalendarViewChange={setCalendarView}
      onDoctorFilterChange={setDoctorFilter}
      onSelectAppointment={toggleAppointmentHistory}
      openDispatchAttempts={toggleDispatchAttempts}
      reminderNow={sendAppointmentReminderNow}
      renderAppointmentBadges={renderAppointmentBadges}
      selectedDoctor={selectedDoctor}
      selectedSummary={selectedSummary}
      slotLabels={slotLabels}
      submitAppointment={submitAppointment}
      updateAppointmentStatus={updateAppointmentStatus}
    />
  );

  const renderPacientesTab = () => (
    <PatientsSection
      canManagePatients={canManagePatients}
      expandedEncounterId={expandedEncounterId}
      isAdmin={isAdmin}
      onEditPatient={() => selectedSummary && setActiveSectionAction("patient_edit")}
      onGoToAgendaAppointment={(appointmentId) => {
        setActiveTab("agenda");
        toggleAppointmentHistory(appointmentId);
      }}
      onOpenAttachment={openAttachment}
      onPatientSearchChange={setPatientSearch}
      onSelectPatient={setSelectedPatientId}
      onShowCreatePatient={() => setActiveSectionAction("patient_create")}
      patientSearch={patientSearch}
      patients={data.patients}
      selectedPatientId={selectedPatientId}
      selectedSummary={selectedSummary}
      setExpandedEncounterId={setExpandedEncounterId}
      sortedPatientEncounters={sortedPatientEncounters}
    />
  );

  const renderConsultasTab = () => (
    <EncountersSection
      appointments={data.appointments}
      attachmentEncounterId={attachmentEncounterId}
      attachmentType={attachmentType}
      availableDoctors={availableDoctors}
      canChooseAmongMultipleDoctors={canChooseAmongMultipleDoctors}
      canManageEncounters={canManageEncounters}
      closeEncounter={closeEncounter}
      diagnoses={diagnoses}
      downloadingAttachmentId={downloadingAttachmentId}
      encounters={data.encounters}
      encounterForm={encounterForm}
      examOrders={examOrders}
      isAdmin={isAdmin}
      openAttachment={openAttachment}
      patients={data.patients}
      prescriptionItems={prescriptionItems}
      selectedDoctor={selectedDoctor}
      selectedSummary={selectedSummary}
      setAttachmentEncounterId={setAttachmentEncounterId}
      setAttachmentFile={setAttachmentFile}
      setAttachmentType={setAttachmentType}
      setDiagnoses={setDiagnoses}
      setEncounterForm={setEncounterForm}
      setExamOrders={setExamOrders}
      setPrescriptionItems={setPrescriptionItems}
      submitAttachment={submitAttachment}
      submitEncounter={submitEncounter}
    />
  );

  const renderMensajesTab = () => (
    <MessagesSection
      canViewGlobalCommunications={canViewGlobalCommunications}
      communicationDispatchSummary={communicationDispatchSummary}
      communicationDispatches={communicationDispatches}
      data={{ patients: data.patients }}
      dispatchAttempts={dispatchAttempts}
      dispatchFilters={dispatchFilters}
      expandedDispatchId={expandedDispatchId}
      generateDispatchesNow={generateDispatchesNow}
      isAdmin={isAdmin}
      messagesSubtab={messagesSubtab}
      requeueDispatch={requeueDispatch}
      requeueVisibleFailedDispatches={requeueVisibleFailedDispatches}
      selectedPatientDispatches={selectedPatientDispatches}
      selectedPatientId={selectedPatientId}
      selectedSummary={selectedSummary}
      setActiveTab={setActiveTab}
      setDispatchFilters={setDispatchFilters}
      setMessagesSubtab={setMessagesSubtab}
      setSelectedPatientId={setSelectedPatientId}
      toggleAppointmentHistory={toggleAppointmentHistory}
      toggleDispatchAttempts={toggleDispatchAttempts}
      updateDispatchStatus={updateDispatchStatus}
    />
  );

  const renderPendientesTab = () => {
    const attentionAppointments = filteredAppointments.filter((appointment) => {
      const relatedDispatches = communicationDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
      return (
        appointment.confirmation_status === "pending" ||
        lastDispatchStatus(relatedDispatches) === "failed" ||
        reviewQueueByAppointmentId.has(appointment.id)
      );
    });

    const sortedReviewItems = [...appointmentReviewItems].sort(
      (left, right) => new Date(left.scheduled_start).getTime() - new Date(right.scheduled_start).getTime(),
    );
    const reviewGroups = [
      {
        key: "reschedule_request",
        title: "Solicitudes de reagendar",
        description: "Pacientes que pidieron cambiar día u hora y necesitan una nueva propuesta.",
        items: sortedReviewItems.filter((item) => item.review_reason === "reschedule_request"),
      },
      {
        key: "patient_resolution",
        title: "Pacientes por identificar",
        description: "Casos donde todavía hay que confirmar a qué paciente corresponde la solicitud.",
        items: sortedReviewItems.filter((item) => item.review_reason === "patient_resolution"),
      },
      {
        key: "doctor_resolution",
        title: "Doctor por resolver",
        description: "Solicitudes donde falta definir el doctor correcto antes de crear o vincular la cita.",
        items: sortedReviewItems.filter((item) => item.review_reason === "doctor_resolution"),
      },
      {
        key: "validation_rejected",
        title: "Casos rechazados por validación",
        description: "Mensajes que no pasaron las reglas automáticas y necesitan revisión humana.",
        items: sortedReviewItems.filter((item) => item.review_reason === "validation_rejected"),
      },
    ].filter((group) => group.items.length > 0);

    return (
      <PendingReviewSection
        appointmentReviewItems={appointmentReviewItems}
        attentionAppointments={attentionAppointments}
        onGoToAgendaAppointment={(appointmentId) => {
          setActiveTab("agenda");
          toggleAppointmentHistory(appointmentId);
        }}
        renderAppointmentBadges={renderAppointmentBadges}
        resolveReviewItem={resolveReviewItem}
        reviewGroups={reviewGroups}
      />
    );
  };

  const renderPager = (page: number, totalItems: number, onChange: (page: number) => void) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / teamPageSize));
    if (totalPages <= 1) {
      return null;
    }
    return (
      <div className="pagination-bar">
        <button type="button" className="secondary-button" onClick={() => onChange(page - 1)} disabled={page <= 1}>
          Anterior
        </button>
        <span>
          Página {page} de {totalPages}
        </span>
        <button type="button" className="secondary-button" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
          Siguiente
        </button>
      </div>
    );
  };

  const renderDoctoresTab = () => {
    if (!isAdmin) {
      return renderAgendaTab();
    }

    return (
      <DoctorsSection
        activeDoctors={activeDoctors}
        activePager={renderPager(activeDoctorPage, filteredActiveDoctors.length, setActiveDoctorPage)}
        addDoctorClinic={addDoctorClinic}
        doctorAdminForm={doctorAdminForm}
        doctorDirectorySearch={doctorDirectorySearch}
        doctorRosterTab={doctorRosterTab}
        editingDoctorId={editingDoctorId}
        filteredActiveDoctorsCount={filteredActiveDoctors.length}
        filteredInactiveDoctorsCount={filteredInactiveDoctors.length}
        inactiveDoctors={inactiveDoctors}
        inactivePager={renderPager(inactiveDoctorPage, filteredInactiveDoctors.length, setInactiveDoctorPage)}
        isAdmin={isAdmin}
        onDoctorDirectorySearchChange={updateDoctorDirectorySearch}
        paginatedActiveDoctors={paginatedActiveDoctors}
        paginatedInactiveDoctors={paginatedInactiveDoctors}
        removeDoctorClinic={removeDoctorClinic}
        resetDoctorAdminForm={resetDoctorAdminForm}
        setDoctorAdminForm={setDoctorAdminForm}
        setDoctorRosterTab={setDoctorRosterTab}
        startDoctorEdit={startDoctorEdit}
        submitDoctorAdmin={submitDoctorAdmin}
        toggleDoctorActive={toggleDoctorActive}
        updateDoctorClinic={updateDoctorClinic}
      />
    );
  };

  const renderGestionTab = () => {
    const gestionTabs: Array<{ id: GestionSubtab; label: string }> = [
      { id: "resumen", label: "Resumen" },
      { id: "mensajes", label: "Mensajes" },
      { id: "recordatorios", label: "Recordatorios" },
      ...(isAdmin ? [{ id: "correos" as GestionSubtab, label: "Correos" }, { id: "recepcion" as GestionSubtab, label: "Recepción" }] : []),
    ];

    return (
      <section className="tab-layout">
        <article className="card section-card span-three">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Configuración</p>
              <h2>Centro de administración</h2>
            </div>
            {selectedDoctor ? <div className="context-pill">Contexto: {selectedDoctor.first_name} {selectedDoctor.last_name}</div> : null}
          </div>
          <div className="chip-row">
            {gestionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-chip ${gestionSubtab === tab.id ? "filter-chip-active" : ""}`}
                onClick={() => setGestionSubtab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </article>

        {gestionSubtab === "resumen" ? (
          <GestionSummarySection
            activeDoctorsCount={activeDoctors.length}
            activeReceptionistsCount={activeReceptionists.length}
            allowMultiDoctorVisibility={allowMultiDoctorVisibility}
            cancelledUpcomingCount={cancelledUpcomingCount}
            confirmedUpcomingCount={confirmedUpcomingCount}
            currentUserDisplay={currentUserDisplay}
            currentUserEmail={currentUserEmail}
            currentUserProfilePhotoUrl={currentUserProfilePhotoUrl}
            inactiveUsersCount={inactiveDoctors.length + inactiveReceptionists.length}
            isAdmin={isAdmin}
            onGoToAgendaAppointment={(appointmentId) => {
              setActiveTab("agenda");
              toggleAppointmentHistory(appointmentId);
            }}
            onProfilePhotoChange={setProfilePhotoFile}
            profileForm={profileForm}
            remindersScheduledCount={remindersScheduledCount}
            scopedUpcomingAppointments={scopedUpcomingAppointments}
            setProfileForm={setProfileForm}
            toggleMultiDoctorVisibility={toggleMultiDoctorVisibility}
            unconfirmedUpcomingCount={unconfirmedUpcomingCount}
            updateCurrentProfile={updateCurrentProfile}
            uploadCurrentProfilePhoto={uploadCurrentProfilePhoto}
          />
        ) : null}

        {gestionSubtab === "mensajes" ? (
          <GestionMessagesSection
            communicationTemplates={communicationTemplates}
            confirmationBodyPlaceholder={DEFAULT_CONFIRMATION_BODY}
            confirmationTitlePlaceholder={DEFAULT_CONFIRMATION_TITLE}
            previewConfirmationTemplate={previewConfirmationTemplate}
            saveConfirmationTemplate={saveConfirmationTemplate}
            scopedDoctorId={scopedDoctorId}
            setTemplateForm={setTemplateForm}
            templateForm={templateForm}
            templatePreview={templatePreview}
            toggleTemplate={toggleTemplate}
          />
        ) : null}

        {gestionSubtab === "recordatorios" ? (
          <GestionRemindersSection
            activateDefault24HourReminder={activateDefault24HourReminder}
            availableDoctors={data.doctors}
            doctorNameById={doctorNameById}
            generalReminderRule={generalReminderRule}
            isAdmin={isAdmin}
            reminderRuleForm={reminderRuleForm}
            reminderRules={reminderRules}
            scopedDoctorId={scopedDoctorId}
            scopedUpcomingAppointmentsCount={scopedUpcomingAppointments.length}
            selectedDoctor={selectedDoctor}
            setReminderRuleForm={setReminderRuleForm}
            submitReminderRule={submitReminderRule}
            toggleReminderRule={toggleReminderRule}
          />
        ) : null}

        {gestionSubtab === "correos" && isAdmin ? (
          <GestionEmailSection
            clinicSetting={clinicSetting}
            emailDispatches={emailDispatches}
            emailTemplateForm={emailTemplateForm}
            emailTemplatePreview={emailTemplatePreview}
            emailTemplates={emailTemplates}
            previewEmailTemplate={previewEmailTemplate}
            resendEmailDispatch={resendEmailDispatch}
            saveEmailTemplate={saveEmailTemplate}
            sendTestEmail={sendTestEmail}
            setEmailTemplateForm={setEmailTemplateForm}
            setTestEmailRecipient={setTestEmailRecipient}
            testEmailRecipient={testEmailRecipient}
            toggleEmailDelivery={toggleEmailDelivery}
            toggleEmailProcessSetting={toggleEmailProcessSetting}
          />
        ) : null}

        {gestionSubtab === "recepcion" && isAdmin ? (
          <GestionReceptionSection
            activeReceptionists={activeReceptionists}
            activeReceptionistsPager={renderPager(activeReceptionistPage, activeReceptionists.length, setActiveReceptionistPage)}
            inactiveReceptionists={inactiveReceptionists}
            inactiveReceptionistsPager={renderPager(inactiveReceptionistPage, inactiveReceptionists.length, setInactiveReceptionistPage)}
            onAddReceptionist={() => {
              resetReceptionistForm();
              setShowReceptionistModal(true);
            }}
            onEditReceptionist={startReceptionistEdit}
            onSelectReceptionist={setSelectedReceptionistId}
            paginatedActiveReceptionists={paginatedActiveReceptionists}
            paginatedInactiveReceptionists={paginatedInactiveReceptionists}
            selectedReceptionist={selectedReceptionist}
            toggleReceptionistActive={toggleReceptionistActive}
          />
        ) : null}
      </section>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === "agenda") {
      return renderAgendaTab();
    }
    if (activeTab === "doctores") {
      return isAdmin ? renderDoctoresTab() : renderAgendaTab();
    }
    if (activeTab === "pacientes") {
      return renderPacientesTab();
    }
    if (activeTab === "consultas") {
      return renderConsultasTab();
    }
    if (activeTab === "mensajes") {
      return renderMensajesTab();
    }
    if (activeTab === "pendientes") {
      return renderPendientesTab();
    }
    return canViewGestion ? renderGestionTab() : renderAgendaTab();
  };

  return (
    <main className="page-shell">
      {!isAuthenticated ? (
        <LoginPanel
          loginForm={loginForm}
          message={message}
          onSubmit={submitLogin}
          setLoginForm={setLoginForm}
          tone={getMessageTone(message)}
        />
      ) : (
        <section className="app-shell-auth">
          <aside className="app-sidebar">
            <div className="sidebar-brand">
              <p className="eyebrow">Do-Control</p>
              <h1>Panel médico</h1>
              <span>{currentRoles.join(", ")}</span>
            </div>
            <nav className="sidebar-nav">
              {consoleTabs
                .filter((tab) => tab.id !== "doctores" || isAdmin)
                .filter((tab) => tab.id !== "gestion" || canViewGestion)
                .filter((tab) => tab.id !== "mensajes" || canViewMessages)
                .filter((tab) => tab.id !== "pendientes" || canViewReviewQueue)
                .map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`sidebar-link ${activeTab === tab.id ? "sidebar-link-active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
            </nav>
            <div className="sidebar-summary">
              <div className="sidebar-stat">
                <strong>{data.appointments.length}</strong>
                <span>Citas</span>
              </div>
              <div className="sidebar-stat">
                <strong>{data.patients.length}</strong>
                <span>Pacientes</span>
              </div>
              <div className="sidebar-stat">
                <strong>{appointmentReviewItems.length}</strong>
                <span>Seguimiento</span>
              </div>
            </div>
            <button type="button" className="secondary-button sidebar-logout" onClick={logout}>
              Cerrar sesión
            </button>
          </aside>

          <div className="app-content">
            <header className="topbar">
              <div className="topbar-copy">
                <p className="eyebrow">Vista actual</p>
                <h2>{consoleTabs.find((tab) => tab.id === activeTab)?.label ?? "Agenda"}</h2>
                <span>{currentUserDisplay}</span>
              </div>
              <div className="topbar-actions">
                {isReceptionist && availableDoctors.length > 1 ? (
                  <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>
                    {availableDoctors.map((doctor) => (
                      <option key={`topbar-doctor-${doctor.id}`} value={doctor.id}>
                        Gestionando pacientes de Dr. {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  className="search-input topbar-search"
                  placeholder="Buscar paciente o expediente"
                  value={topbarSearch}
                  onChange={(event) => setTopbarSearch(event.target.value)}
                />
              </div>
            </header>

            {message ? <p className={`message-box message-box-${getMessageTone(message)}`}>{message}</p> : null}
            {loading ? <p className="message-box message-box-info">Cargando información clínica...</p> : null}

            {renderActiveTab()}
          </div>
          <PatientActionModal
            activeSectionAction={activeSectionAction}
            availableDoctors={availableDoctors}
            patientEditForm={patientEditForm}
            patientForm={patientForm}
            setActiveSectionAction={setActiveSectionAction}
            setPatientEditForm={setPatientEditForm}
            setPatientForm={setPatientForm}
            submitPatient={submitPatient}
            submitPatientUpdate={submitPatientUpdate}
          />
          <ReviewResolutionModal
            activeReviewItem={activeReviewItem}
            allAppointments={data.appointments}
            allPatients={data.patients}
            availableDoctors={availableDoctors}
            closeReviewResolutionModal={closeReviewResolutionModal}
            reviewAppointmentOptions={reviewAppointmentOptions}
            reviewPatientOptions={reviewPatientOptions}
            reviewResolutionForm={reviewResolutionForm}
            setReviewResolutionForm={setReviewResolutionForm}
            submitReviewResolution={submitReviewResolution}
          />
          <DispatchStatusModal
            activeDispatch={activeDispatch}
            closeDispatchStatusModal={closeDispatchStatusModal}
            dispatchStatusForm={dispatchStatusForm}
            setDispatchStatusForm={setDispatchStatusForm}
            submitDispatchStatusUpdate={submitDispatchStatusUpdate}
          />
          <ReceptionistModal
            editingReceptionistId={editingReceptionistId}
            filteredDoctorOptions={filteredDoctorOptions}
            isAdmin={isAdmin}
            receptionistDoctorSearch={receptionistDoctorSearch}
            receptionistForm={receptionistForm}
            resetReceptionistForm={resetReceptionistForm}
            setReceptionistDoctorSearch={setReceptionistDoctorSearch}
            setReceptionistForm={setReceptionistForm}
            showReceptionistModal={showReceptionistModal}
            submitReceptionist={submitReceptionist}
          />
        </section>
      )}
    </main>
  );
}
