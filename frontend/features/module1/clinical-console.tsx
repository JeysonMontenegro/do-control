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
import { GestionEmailSection } from "@/features/module1/components/gestion-email-section";
import { DateField, PhoneField, RequiredLabel } from "@/features/module1/components/form-fields";
import { GestionMessagesSection } from "@/features/module1/components/gestion-messages-section";
import { GestionReceptionSection } from "@/features/module1/components/gestion-reception-section";
import { GestionRemindersSection } from "@/features/module1/components/gestion-reminders-section";
import { GestionSummarySection } from "@/features/module1/components/gestion-summary-section";
import { LoginPanel } from "@/features/module1/components/login-panel";
import { MessagesSection } from "@/features/module1/components/messages-section";
import { PatientSummarySection } from "@/features/module1/components/patient-summary-section";
import { PendingReviewSection } from "@/features/module1/components/pending-review-section";
import { ReviewResolutionModal } from "@/features/module1/components/review-resolution-modal";
import { useCommunicationsConsole } from "@/features/module1/hooks/use-communications-console";
import { useClinicalSession } from "@/features/module1/hooks/use-clinical-session";
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
  appointmentStatusLabel,
  appointmentTypeLabel,
  calendarRangeLabel,
  communicationKindLabel,
  confirmationLabel,
  dispatchStatusLabel,
  encounterTypeLabel,
  combineDisplayDateTimeToIso,
  formatDate,
  formatDateTime,
  formatEditableDate,
  hasAnyRole,
  lastDispatchStatus,
  nowPlusMinutes,
  parseDisplayDate,
  reminderLeadTimeLabel,
  reviewReasonLabel,
  splitDateTimeLocal,
  startOfDay,
  startOfMonthGrid,
  startOfWeek,
} from "@/features/module1/console-utils";
import { getMessageTone } from "@/features/module1/message-utils";
import { DEFAULT_COUNTRY_DIAL_CODE, normalizePhoneWithDefaultCountry } from "@/features/module1/phone-utils";
import { getFirstExamOrderId } from "@/features/module1/review-utils";
import { API_URL, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  Appointment,
  AppointmentHistory,
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
type DoctorRosterTab = "activos" | "inactivos";
type ReviewResolutionAction = "reject" | "link_existing" | "create_appointment";
type DoctorClinicForm = {
  clinic_name: string;
  address: string;
  phone_number: string;
  notes: string;
  is_primary: boolean;
};
type DoctorAdminForm = {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  specialty: string;
  license_number: string;
  primary_phone: string;
  user_email: string;
  user_password: string;
  clinics: DoctorClinicForm[];
};

const initialLoadState: LoadState = {
  doctors: [],
  patients: [],
  appointments: [],
  encounters: [],
};

const emptyDoctorClinic = (): DoctorClinicForm => ({
  clinic_name: "",
  address: "",
  phone_number: "",
  notes: "",
  is_primary: false,
});

const createDoctorAdminForm = (): DoctorAdminForm => ({
  first_name: "",
  last_name: "",
  gender: "male",
  date_of_birth: "",
  specialty: "",
  license_number: "",
  primary_phone: DEFAULT_COUNTRY_DIAL_CODE,
  user_email: "",
  user_password: "",
  clinics: [emptyDoctorClinic()],
});

export function ClinicalConsole() {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  const [data, setData] = useState<LoadState>(initialLoadState);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ConsoleTab>("agenda");
  const [gestionSubtab, setGestionSubtab] = useState<GestionSubtab>("resumen");
  const [messagesSubtab, setMessagesSubtab] = useState<MessagesSubtab>("paciente");
  const [doctorRosterTab, setDoctorRosterTab] = useState<DoctorRosterTab>("activos");
  const [doctorDirectorySearch, setDoctorDirectorySearch] = useState("");
  const [activeSectionAction, setActiveSectionAction] = useState<"patient_create" | "patient_edit" | null>(null);
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
  const [appointmentHistory, setAppointmentHistory] = useState<Record<number, AppointmentHistory[]>>({});
  const [appointmentDispatches, setAppointmentDispatches] = useState<Record<number, CommunicationDispatch[]>>({});
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<number | null>(null);
  const [expandedEncounterId, setExpandedEncounterId] = useState<number | null>(null);
  const [appointmentReviewItems, setAppointmentReviewItems] = useState<AppointmentReviewItem[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "ws" | "confirmed" | "pending_confirmation" | "needs_attention">("all");
  const [dispatchFilters, setDispatchFilters] = useState({
    status_filter: "",
    channel: "",
    query: "",
  });
  const [reminderRuleForm, setReminderRuleForm] = useState(createReminderRuleForm);
  const [templateForm, setTemplateForm] = useState(createTemplateForm);
  const [emailTemplateForm, setEmailTemplateForm] = useState(createEmailTemplateForm);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [patientForm, setPatientForm] = useState(() => createPatientForm());
  const [patientEditForm, setPatientEditForm] = useState(createPatientEditForm);
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: "",
    doctor_id: "",
    scheduled_start_date: splitDateTimeLocal(nowPlusMinutes(60)).date,
    scheduled_start_time: splitDateTimeLocal(nowPlusMinutes(60)).time,
    scheduled_end_date: splitDateTimeLocal(nowPlusMinutes(90)).date,
    scheduled_end_time: splitDateTimeLocal(nowPlusMinutes(90)).time,
    appointment_type: "follow_up",
    reason: "",
    source: "receptionist",
    created_by: "frontend-demo",
  });
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
  const [doctorAdminForm, setDoctorAdminForm] = useState<DoctorAdminForm>(createDoctorAdminForm());
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [activeDoctorPage, setActiveDoctorPage] = useState(1);
  const [inactiveDoctorPage, setInactiveDoctorPage] = useState(1);
  const [receptionistForm, setReceptionistForm] = useState(createReceptionistForm);
  const [editingReceptionistId, setEditingReceptionistId] = useState<number | null>(null);
  const [showReceptionistModal, setShowReceptionistModal] = useState(false);
  const [selectedReceptionistId, setSelectedReceptionistId] = useState<number | null>(null);
  const [receptionistDoctorSearch, setReceptionistDoctorSearch] = useState("");
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


  async function submitPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<Patient>("/api/patients", {
        ...patientForm,
        national_id: patientForm.national_id || null,
        doctor_id: patientForm.doctor_id ? Number(patientForm.doctor_id) : scopedDoctorId,
      });
      setPatientForm(createPatientForm(hasSingleDoctorContext ? String(availableDoctors[0]?.id ?? "") : ""));
      setActiveSectionAction(null);
      await loadData();
      setMessage("Paciente creado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el paciente.");
    }
  }

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

  async function submitPatientUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatientId) {
      setMessage("Selecciona un paciente para editar.");
      return;
    }

    setMessage("");
    try {
      const updatePath =
        scopedDoctorId !== null ? `/api/patients/${selectedPatientId}?doctor_id=${scopedDoctorId}` : `/api/patients/${selectedPatientId}`;
      await apiPatch<Patient>(updatePath, {
        first_name: patientEditForm.first_name,
        last_name: patientEditForm.last_name,
        primary_phone: patientEditForm.primary_phone,
        national_id: patientEditForm.national_id || null,
        tax_id: patientEditForm.tax_id || null,
        email: patientEditForm.email || null,
        address: patientEditForm.address || null,
        notes: patientEditForm.notes || null,
        is_active: patientEditForm.is_active,
      });
      await loadData();
      setSelectedSummary(
        await apiGet<PatientSummary>(
          scopedDoctorId !== null
            ? `/api/patients/${selectedPatientId}/summary?doctor_id=${scopedDoctorId}`
            : `/api/patients/${selectedPatientId}/summary`,
        ),
      );
      setActiveSectionAction(null);
      setMessage("Paciente actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el paciente.");
    }
  }

  async function submitAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<Appointment>("/api/appointments", {
        ...appointmentForm,
        patient_id: Number(appointmentForm.patient_id),
        doctor_id: Number(appointmentForm.doctor_id),
        scheduled_start: combineDisplayDateTimeToIso(appointmentForm.scheduled_start_date, appointmentForm.scheduled_start_time),
        scheduled_end: combineDisplayDateTimeToIso(appointmentForm.scheduled_end_date, appointmentForm.scheduled_end_time),
      });
      await loadData();
      setSelectedPatientId(appointmentForm.patient_id);
      setMessage("Cita creada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la cita.");
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

  async function updateAppointmentStatus(appointmentId: number, status: string) {
    setMessage("");
    try {
      await apiPatch<Appointment>(`/api/appointments/${appointmentId}/status`, {
        status,
        changed_by: "frontend-demo",
        change_reason: `Cambio manual a ${status}`,
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
      setMessage(`Cita ${appointmentId} actualizada a ${appointmentStatusLabel(status)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la cita.");
    }
  }

  async function toggleAppointmentHistory(appointmentId: number) {
    if (expandedAppointmentId === appointmentId) {
      setExpandedAppointmentId(null);
      return;
    }

    setMessage("");
    try {
      const [history, dispatches] = await Promise.all([
        appointmentHistory[appointmentId]
          ? Promise.resolve(appointmentHistory[appointmentId])
          : apiGet<AppointmentHistory[]>(`/api/appointments/${appointmentId}/history`),
        appointmentDispatches[appointmentId]
          ? Promise.resolve(appointmentDispatches[appointmentId])
          : apiGet<CommunicationDispatch[]>(`/api/communication-dispatches?appointment_id=${appointmentId}&limit=20`),
      ]);
      if (!appointmentHistory[appointmentId]) {
        setAppointmentHistory((current) => ({ ...current, [appointmentId]: history }));
      }
      if (!appointmentDispatches[appointmentId]) {
        setAppointmentDispatches((current) => ({ ...current, [appointmentId]: dispatches }));
      }
      setExpandedAppointmentId(appointmentId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el detalle de la cita.");
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

  async function submitDoctorAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const payload = {
        first_name: doctorAdminForm.first_name,
        last_name: doctorAdminForm.last_name,
        gender: doctorAdminForm.gender,
        date_of_birth: parseDisplayDate(doctorAdminForm.date_of_birth) || null,
        specialty: doctorAdminForm.specialty || null,
        license_number: doctorAdminForm.license_number || null,
        primary_phone: doctorAdminForm.primary_phone.trim() ? normalizePhoneWithDefaultCountry(doctorAdminForm.primary_phone) : null,
        clinics: doctorAdminForm.clinics
          .filter((clinic) => clinic.clinic_name.trim())
          .map((clinic, index) => ({
            clinic_name: clinic.clinic_name.trim(),
            address: clinic.address.trim() || null,
            phone_number: clinic.phone_number.trim() || null,
            notes: clinic.notes.trim() || null,
            is_primary: clinic.is_primary || index === 0,
          })),
        ...(editingDoctorId
          ? { user_password: doctorAdminForm.user_password || undefined }
          : { user_email: doctorAdminForm.user_email || null, user_password: doctorAdminForm.user_password || null }),
      };
      if (editingDoctorId) {
        await apiPatch<Doctor>(`/api/doctors/${editingDoctorId}`, payload);
      } else {
        await apiPost<Doctor>("/api/doctors", payload);
      }
      resetDoctorAdminForm();
      await loadData();
      setMessage(editingDoctorId ? "Doctor actualizado." : "Doctor registrado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el doctor.");
    }
  }

  async function submitReceptionist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const payload = {
        first_name: receptionistForm.first_name,
        last_name: receptionistForm.last_name,
        gender: receptionistForm.gender,
        phone_number: receptionistForm.phone_number || null,
        email: receptionistForm.email,
        ...(editingReceptionistId ? { password: receptionistForm.password || undefined } : { password: receptionistForm.password }),
        doctor_ids: receptionistForm.doctor_ids,
      };
      if (editingReceptionistId) {
        await apiPatch<Receptionist>(`/api/receptionists/${editingReceptionistId}`, payload);
      } else {
      await apiPost<Receptionist>("/api/receptionists", payload);
      }
      setSelectedReceptionistId(editingReceptionistId);
      resetReceptionistForm();
      await loadData();
      setMessage(editingReceptionistId ? "Recepcionista actualizada." : "Recepcionista registrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la recepcionista.");
    }
  }

  async function toggleDoctorActive(doctor: Doctor) {
    setMessage("");
    try {
      await apiPatch<Doctor>(`/api/doctors/${doctor.id}`, { is_active: !doctor.is_active });
      await loadData();
      setMessage(`Doctor ${doctor.is_active ? "desactivado" : "activado"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el doctor.");
    }
  }

  async function toggleReceptionistActive(receptionist: Receptionist) {
    setMessage("");
    try {
      await apiPatch<Receptionist>(`/api/receptionists/${receptionist.id}`, { is_active: !receptionist.is_active });
      await loadData();
      setMessage(`Recepcionista ${receptionist.is_active ? "desactivada" : "activada"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la recepcionista.");
    }
  }

  async function toggleMultiDoctorVisibility(enabled: boolean) {
    setMessage("");
    try {
      const updatedSetting = await apiPatch<ClinicSetting>("/api/clinic-settings", {
        allow_multi_doctor_visibility: enabled,
      });
      setClinicSetting(updatedSetting);
      await loadData();
      setMessage(enabled ? "La visibilidad de varios doctores fue habilitada." : "La visibilidad de varios doctores fue ocultada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la configuración de clínica.");
    }
  }

  function startDoctorEdit(doctor: Doctor) {
    setEditingDoctorId(doctor.id);
    setDoctorAdminForm({
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      gender: doctor.gender ?? "other",
      date_of_birth: formatEditableDate(doctor.date_of_birth ?? null),
      specialty: doctor.specialty ?? "",
      license_number: doctor.license_number ?? "",
      primary_phone: doctor.phone_numbers?.find((phone) => phone.is_primary)?.phone_number ?? DEFAULT_COUNTRY_DIAL_CODE,
      user_email: doctor.linked_user_email ?? "",
      user_password: "",
      clinics: doctor.clinics?.length
        ? doctor.clinics.map((clinic) => ({
            clinic_name: clinic.clinic_name,
            address: clinic.address ?? "",
            phone_number: clinic.phone_number ?? "",
            notes: clinic.notes ?? "",
            is_primary: clinic.is_primary,
          }))
        : [emptyDoctorClinic()],
    });
  }

  function resetDoctorAdminForm() {
    setEditingDoctorId(null);
    setDoctorAdminForm(createDoctorAdminForm());
  }

  function updateDoctorClinic(index: number, field: keyof DoctorClinicForm, value: string | boolean) {
    setDoctorAdminForm((current) => {
      const clinics = current.clinics.map((clinic, clinicIndex) => {
        if (clinicIndex !== index) {
          return clinic;
        }
        if (field === "is_primary" && value === true) {
          return { ...clinic, is_primary: true };
        }
        return { ...clinic, [field]: value };
      });
      if (field === "is_primary" && value === true) {
        return {
          ...current,
          clinics: clinics.map((clinic, clinicIndex) => ({ ...clinic, is_primary: clinicIndex === index })),
        };
      }
      return { ...current, clinics };
    });
  }

  function addDoctorClinic() {
    setDoctorAdminForm((current) => ({
      ...current,
      clinics: [...current.clinics, emptyDoctorClinic()],
    }));
  }

  function removeDoctorClinic(index: number) {
    setDoctorAdminForm((current) => {
      const nextClinics = current.clinics.filter((_, clinicIndex) => clinicIndex !== index);
      return {
        ...current,
        clinics: nextClinics.length ? nextClinics : [emptyDoctorClinic()],
      };
    });
  }

  function startReceptionistEdit(receptionist: Receptionist) {
    setSelectedReceptionistId(receptionist.id);
    setEditingReceptionistId(receptionist.id);
    setReceptionistForm({
      ...createReceptionistForm(),
      first_name: receptionist.first_name,
      last_name: receptionist.last_name,
      gender: receptionist.gender ?? "other",
      phone_number: receptionist.phone_number ?? "",
      email: receptionist.email,
      doctor_ids: receptionist.assigned_doctors.map((doctor) => doctor.id),
    });
    setReceptionistDoctorSearch("");
    setShowReceptionistModal(true);
  }

  function resetReceptionistForm() {
    setEditingReceptionistId(null);
    setReceptionistForm(createReceptionistForm());
    setReceptionistDoctorSearch("");
    setShowReceptionistModal(false);
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

  const focusedAppointment = useMemo(
    () => data.appointments.find((appointment) => appointment.id === expandedAppointmentId) ?? null,
    [data.appointments, expandedAppointmentId],
  );
  const activeDoctors = useMemo(() => data.doctors.filter((doctor) => doctor.is_active), [data.doctors]);
  const inactiveDoctors = useMemo(() => data.doctors.filter((doctor) => !doctor.is_active), [data.doctors]);
  const normalizedDoctorDirectorySearch = doctorDirectorySearch.trim().toLowerCase();
  const filteredActiveDoctors = useMemo(() => {
    if (!normalizedDoctorDirectorySearch) {
      return activeDoctors;
    }
    return activeDoctors.filter((doctor) =>
      `${doctor.first_name} ${doctor.last_name} ${doctor.specialty ?? ""} ${doctor.linked_user_email ?? ""}`
        .toLowerCase()
        .includes(normalizedDoctorDirectorySearch),
    );
  }, [activeDoctors, normalizedDoctorDirectorySearch]);
  const filteredInactiveDoctors = useMemo(() => {
    if (!normalizedDoctorDirectorySearch) {
      return inactiveDoctors;
    }
    return inactiveDoctors.filter((doctor) =>
      `${doctor.first_name} ${doctor.last_name} ${doctor.specialty ?? ""} ${doctor.linked_user_email ?? ""}`
        .toLowerCase()
        .includes(normalizedDoctorDirectorySearch),
    );
  }, [inactiveDoctors, normalizedDoctorDirectorySearch]);
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
  const selectedReceptionist = useMemo(
    () => receptionists.find((receptionist) => receptionist.id === selectedReceptionistId) ?? activeReceptionists[0] ?? null,
    [activeReceptionists, receptionists, selectedReceptionistId],
  );
  const filteredDoctorOptions = useMemo(() => {
    const search = receptionistDoctorSearch.trim().toLowerCase();
    if (!search) {
      return data.doctors;
    }
    return data.doctors.filter((doctor) =>
      `${doctor.first_name} ${doctor.last_name} ${doctor.specialty ?? ""}`.toLowerCase().includes(search),
    );
  }, [data.doctors, receptionistDoctorSearch]);
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

  const scopedDoctorId = useMemo(() => {
    if (currentRoles.includes("doctor")) {
      return selectedDoctor?.id ?? null;
    }
    return doctorFilter ? Number(doctorFilter) : null;
  }, [currentRoles, doctorFilter, selectedDoctor]);

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
    <section className="tab-layout patients-layout">
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Pacientes</p>
            <h2>Listado</h2>
          </div>
          <div className="section-tools-panel">
            {canManagePatients ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setActiveSectionAction("patient_create")}
              >
                Agregar paciente
              </button>
            ) : null}
            <input
              className="search-input"
              placeholder="Buscar por nombre, teléfono, DPI o expediente"
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Expediente</th>
                <th>Paciente</th>
                <th>{isAdmin ? "Doctor(es)" : "Doctor"}</th>
                <th>Teléfono</th>
                <th>Creado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.patients.map((patient) => (
                <tr
                  key={`patient-${patient.id}`}
                  className={selectedPatientId === String(patient.id) ? "table-row-active" : ""}
                  onClick={() => setSelectedPatientId(String(patient.id))}
                >
                  <td>{patient.medical_record_number}</td>
                  <td>
                    {patient.first_name} {patient.last_name}
                  </td>
                  <td>
                    {patient.assigned_doctors?.length
                      ? patient.assigned_doctors.map((doctor) => `${doctor.first_name} ${doctor.last_name}`).join(", ")
                      : "Sin asignación"}
                  </td>
                  <td>{patient.primary_phone}</td>
                  <td>{patient.created_at ? formatDateTime(patient.created_at) : "Sin fecha"}</td>
                  <td>{patient.is_active ? "Activo" : "Inactivo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.patients.length ? <p className="empty-state">No hay pacientes en la vista actual.</p> : null}
        </div>
      </article>
      <PatientSummarySection
        canManagePatients={canManagePatients}
        expandedEncounterId={expandedEncounterId}
        onEditPatient={() => selectedSummary && setActiveSectionAction("patient_edit")}
        onGoToAgendaAppointment={(appointmentId) => {
          setActiveTab("agenda");
          toggleAppointmentHistory(appointmentId);
        }}
        onOpenAttachment={openAttachment}
        selectedSummary={selectedSummary}
        setExpandedEncounterId={setExpandedEncounterId}
        sortedPatientEncounters={sortedPatientEncounters}
      />
    </section>
  );

  const renderConsultasTab = () => (
    <section className="tab-layout">
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Consultas</p>
            <h2>Registro clínico</h2>
          </div>
        </div>
        {canManageEncounters ? (
          <form className="form-card" onSubmit={submitEncounter}>
            <div className="two-column-grid">
              <label>
                <RequiredLabel>Paciente</RequiredLabel>
                <select
                  value={encounterForm.patient_id}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, patient_id: event.target.value }))}
                  required
                >
                  <option value="">Seleccionar</option>
                  {data.patients.map((patient) => (
                    <option key={`encounter-patient-${patient.id}`} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </label>
              {isAdmin || (canChooseAmongMultipleDoctors && availableDoctors.length > 1) ? (
                <label>
                  <RequiredLabel>Doctor</RequiredLabel>
                  <select
                    value={encounterForm.doctor_id}
                    onChange={(event) => setEncounterForm((current) => ({ ...current, doctor_id: event.target.value }))}
                    required
                  >
                    <option value="">{isAdmin ? "Seleccionar" : "Selecciona doctor"}</option>
                    {availableDoctors.map((doctor) => (
                      <option key={`encounter-doctor-${doctor.id}`} value={doctor.id}>
                        {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : !isAdmin && availableDoctors.length > 1 ? (
                <p className="empty-state">No puedes elegir entre varios doctores hasta que administración habilite esa visibilidad.</p>
              ) : selectedDoctor ? (
                <label>
                  <span>Doctor</span>
                  <input value={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`} readOnly />
                </label>
              ) : null}
              <label>
                <span>Cita relacionada</span>
                <select
                  value={encounterForm.appointment_id}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, appointment_id: event.target.value }))}
                >
                  <option value="">Sin cita</option>
                  {data.appointments.map((appointment) => (
                    <option key={`encounter-appointment-${appointment.id}`} value={appointment.id}>
                      {appointment.patient_name ?? `Paciente ${appointment.patient_id}`} · {formatDateTime(appointment.scheduled_start)}
                    </option>
                  ))}
                </select>
              </label>
              <DateField
                label="Fecha"
                value={encounterForm.encounter_date}
                onChange={(nextValue) => setEncounterForm((current) => ({ ...current, encounter_date: nextValue }))}
                required
              />
              <label>
                <RequiredLabel>Hora</RequiredLabel>
                <input
                  type="time"
                  value={encounterForm.encounter_time}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, encounter_time: event.target.value }))}
                  required
                />
              </label>
            </div>
            <label>
              <RequiredLabel>Motivo de consulta</RequiredLabel>
              <textarea
                value={encounterForm.chief_complaint}
                onChange={(event) => setEncounterForm((current) => ({ ...current, chief_complaint: event.target.value }))}
                required
              />
            </label>
            <div className="subsection">
              <div className="subsection-header">
                <h3>Diagnósticos</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDiagnoses((current) => [...current, { diagnosis_text: "", diagnosis_code: null, is_primary: false, notes: null }])}
                >
                  Agregar
                </button>
              </div>
              {diagnoses.map((diagnosis, index) => (
                <div className="stacked-fields" key={`diagnosis-${index}`}>
                  <input
                    placeholder="Diagnóstico"
                    value={diagnosis.diagnosis_text}
                    onChange={(event) =>
                      setDiagnoses((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, diagnosis_text: event.target.value } : item)),
                      )
                    }
                  />
                  <input
                    placeholder="Código"
                    value={diagnosis.diagnosis_code ?? ""}
                    onChange={(event) =>
                      setDiagnoses((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? { ...item, diagnosis_code: event.target.value } : item)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="subsection">
              <div className="subsection-header">
                <h3>Receta</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setPrescriptionItems((current) => [
                      ...current,
                      { medication_name: "", dosage: null, frequency: null, duration: null, instructions: null },
                    ])
                  }
                >
                  Agregar
                </button>
              </div>
              {prescriptionItems.map((item, index) => (
                <div className="stacked-fields" key={`medication-${index}`}>
                  <input
                    placeholder="Medicamento"
                    value={item.medication_name}
                    onChange={(event) =>
                      setPrescriptionItems((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, medication_name: event.target.value } : entry)),
                      )
                    }
                  />
                  <input
                    placeholder="Dosis"
                    value={item.dosage ?? ""}
                    onChange={(event) =>
                      setPrescriptionItems((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, dosage: event.target.value } : entry)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="subsection">
              <div className="subsection-header">
                <h3>Órdenes de examen</h3>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setExamOrders((current) => [...current, { exam_name: "", exam_category: null, instructions: null }])}
                >
                  Agregar
                </button>
              </div>
              {examOrders.map((item, index) => (
                <div className="stacked-fields" key={`exam-${index}`}>
                  <input
                    placeholder="Examen"
                    value={item.exam_name}
                    onChange={(event) =>
                      setExamOrders((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, exam_name: event.target.value } : entry)),
                      )
                    }
                  />
                  <input
                    placeholder="Categoría"
                    value={item.exam_category ?? ""}
                    onChange={(event) =>
                      setExamOrders((current) =>
                        current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, exam_category: event.target.value } : entry)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <button type="submit">Guardar consulta</button>
          </form>
        ) : (
          <p className="empty-state">Tu perfil puede revisar consultas, pero no registrar nuevas.</p>
        )}
      </article>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Historial</p>
            <h2>Consultas recientes</h2>
          </div>
        </div>
        <div className="table-list">
          {data.encounters.map((encounter) => (
            <div className="simple-list-item" key={`encounter-${encounter.id}`}>
              <strong>{encounterTypeLabel(encounter.encounter_type)}</strong>
              <span>{formatDateTime(encounter.encounter_date)}</span>
              <span>{encounter.chief_complaint}</span>
              {encounter.status !== "closed" && canManageEncounters ? (
                <div className="row-actions">
                  <button type="button" className="danger-button" onClick={() => closeEncounter(encounter.id)}>
                    Cerrar
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {selectedSummary ? (
          <form className="form-card compact-form" onSubmit={submitAttachment}>
            <h3>Adjuntar documento</h3>
            <label>
              <span>Tipo</span>
              <select value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)}>
                <option value="lab_result">Resultado de laboratorio</option>
                <option value="ultrasound">Ultrasonido</option>
                <option value="image">Imagen</option>
                <option value="clinical_document">Documento clínico</option>
              </select>
            </label>
            <label>
              <span>Consulta</span>
              <select value={attachmentEncounterId} onChange={(event) => setAttachmentEncounterId(event.target.value)}>
                <option value="">Sin consulta</option>
                {selectedSummary.encounters.map((encounter) => (
                  <option key={`attachment-encounter-${encounter.id}`} value={encounter.id}>
                    {encounterTypeLabel(encounter.encounter_type)} · {formatDateTime(encounter.encounter_date)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Archivo</span>
              <input type="file" onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)} required />
            </label>
            <button type="submit">Adjuntar</button>
            <div className="table-list">
              {selectedSummary.attachments.map((attachment) => (
                <div className="simple-list-item" key={`attachment-${attachment.id}`}>
                  <strong>{attachment.file_name}</strong>
                  <span>{attachment.file_type}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openAttachment(attachment.id)}
                    disabled={downloadingAttachmentId === attachment.id}
                  >
                    {downloadingAttachmentId === attachment.id ? "Preparando..." : "Abrir"}
                  </button>
                </div>
              ))}
            </div>
          </form>
        ) : null}
      </article>
    </section>
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
      <section className="tab-layout">
        <article className="card section-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Equipo clínico</p>
              <h2>{editingDoctorId ? "Editar doctor" : "Registrar doctor"}</h2>
            </div>
          </div>
          <form className="form-card compact-form" onSubmit={submitDoctorAdmin}>
            <div className="two-column-grid">
              <label>
                <RequiredLabel>Nombres</RequiredLabel>
                <input value={doctorAdminForm.first_name} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, first_name: event.target.value }))} required />
              </label>
              <label>
                <RequiredLabel>Apellidos</RequiredLabel>
                <input value={doctorAdminForm.last_name} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, last_name: event.target.value }))} required />
              </label>
              <label>
                <span>Género</span>
                <select value={doctorAdminForm.gender} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <DateField
                label="Fecha de nacimiento"
                value={doctorAdminForm.date_of_birth}
                onChange={(nextValue) => setDoctorAdminForm((current) => ({ ...current, date_of_birth: nextValue }))}
              />
              <PhoneField
                label="Teléfono principal"
                value={doctorAdminForm.primary_phone}
                onChange={(nextValue) => setDoctorAdminForm((current) => ({ ...current, primary_phone: nextValue }))}
                placeholder="58420737"
              />
              <label>
                <span>Especialidad</span>
                <input value={doctorAdminForm.specialty} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, specialty: event.target.value }))} />
              </label>
              <label>
                <span>Colegiado</span>
                <input value={doctorAdminForm.license_number} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, license_number: event.target.value }))} />
              </label>
              <label>
                <span>Correo de acceso</span>
                <input type="email" value={doctorAdminForm.user_email} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, user_email: event.target.value }))} disabled={editingDoctorId !== null} />
              </label>
              <label>
                <span>{editingDoctorId ? "Nueva contraseña" : "Contraseña inicial"}</span>
                <input type="password" value={doctorAdminForm.user_password} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, user_password: event.target.value }))} />
              </label>
            </div>
            <div className="stack-block">
              <div className="subsection-header">
                <div>
                  <p className="eyebrow">Sedes</p>
                  <h3>Clínicas del doctor</h3>
                </div>
                <button type="button" className="success-button" onClick={addDoctorClinic}>
                  Agregar clínica
                </button>
              </div>
              <div className="table-list">
                {doctorAdminForm.clinics.map((clinic, index) => (
                  <div className="simple-list-item" key={`doctor-clinic-form-${index}`}>
                    <div className="two-column-grid">
                      <label>
                        <span>Nombre de clínica</span>
                        <input value={clinic.clinic_name} onChange={(event) => updateDoctorClinic(index, "clinic_name", event.target.value)} />
                      </label>
                      <label>
                        <span>Teléfono</span>
                        <input value={clinic.phone_number} onChange={(event) => updateDoctorClinic(index, "phone_number", event.target.value)} />
                      </label>
                      <label>
                        <span>Dirección</span>
                        <input value={clinic.address} onChange={(event) => updateDoctorClinic(index, "address", event.target.value)} />
                      </label>
                      <label>
                        <span>Notas</span>
                        <input value={clinic.notes} onChange={(event) => updateDoctorClinic(index, "notes", event.target.value)} />
                      </label>
                    </div>
                    <div className="row-actions">
                      <label className="inline-check">
                        <input
                          type="checkbox"
                          checked={clinic.is_primary}
                          onChange={(event) => updateDoctorClinic(index, "is_primary", event.target.checked)}
                        />
                        <span>Sede principal</span>
                      </label>
                      <button type="button" className="danger-button" onClick={() => removeDoctorClinic(index)}>
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="row-actions">
              {editingDoctorId ? (
                <button type="button" className="secondary-button" onClick={resetDoctorAdminForm}>
                  Cancelar edición
                </button>
              ) : null}
              <button type="submit">{editingDoctorId ? "Actualizar doctor" : "Registrar doctor"}</button>
            </div>
          </form>
        </article>

        <article className="card section-card span-two">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Equipo clínico</p>
              <h2>Listado de doctores</h2>
            </div>
          </div>
          <div className="chip-row">
            <button
              type="button"
              className={`filter-chip ${doctorRosterTab === "activos" ? "filter-chip-active" : ""}`}
              onClick={() => setDoctorRosterTab("activos")}
            >
              Activos ({activeDoctors.length})
            </button>
            <button
              type="button"
              className={`filter-chip ${doctorRosterTab === "inactivos" ? "filter-chip-active" : ""}`}
              onClick={() => setDoctorRosterTab("inactivos")}
            >
              Inactivos ({inactiveDoctors.length})
            </button>
          </div>
          <label>
            <span>Buscar doctor</span>
            <input
              value={doctorDirectorySearch}
              onChange={(event) => {
                setDoctorDirectorySearch(event.target.value);
                setActiveDoctorPage(1);
                setInactiveDoctorPage(1);
              }}
              placeholder="Filtrar por nombre, especialidad o correo"
            />
          </label>
          {doctorRosterTab === "activos" ? (
            <>
              <div className="table-list">
                {paginatedActiveDoctors.map((doctor) => (
                  <div className="simple-list-item" key={`doctor-team-${doctor.id}`}>
                    <strong>{doctor.first_name} {doctor.last_name}</strong>
                    <span>{doctor.specialty ?? "Sin especialidad"}</span>
                    <span>{doctor.date_of_birth ? `Nacimiento: ${formatDate(doctor.date_of_birth)}` : "Nacimiento no registrado"}</span>
                    <span>{doctor.phone_numbers?.find((phone) => phone.is_primary)?.phone_number ?? "Sin teléfono"}</span>
                    <span>{doctor.linked_user_email ?? "Sin usuario de acceso"}</span>
                    <span>
                      {doctor.clinics?.length
                        ? doctor.clinics.map((clinic) => clinic.clinic_name).join(" · ")
                        : "Sin clínicas registradas"}
                    </span>
                    {doctor.clinics?.length ? (
                      <div className="detail-stack">
                        {doctor.clinics.map((clinic) => (
                          <span key={`doctor-clinic-${doctor.id}-${clinic.id}`}>
                            {clinic.is_primary ? "Principal" : "Sede"}: {clinic.clinic_name}
                            {clinic.address ? ` · ${clinic.address}` : ""}
                            {clinic.phone_number ? ` · ${clinic.phone_number}` : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="row-actions">
                      <button type="button" className="secondary-button" onClick={() => startDoctorEdit(doctor)}>Editar</button>
                      <button type="button" className="danger-button" onClick={() => toggleDoctorActive(doctor)}>
                        Desactivar
                      </button>
                    </div>
                  </div>
                ))}
                {!filteredActiveDoctors.length ? <p className="empty-state">No hay doctores activos para ese filtro.</p> : null}
              </div>
              {renderPager(activeDoctorPage, filteredActiveDoctors.length, setActiveDoctorPage)}
            </>
          ) : (
            <>
              <div className="table-list">
                {paginatedInactiveDoctors.map((doctor) => (
                  <div className="simple-list-item" key={`doctor-team-inactive-${doctor.id}`}>
                    <strong>{doctor.first_name} {doctor.last_name}</strong>
                    <span>{doctor.specialty ?? "Sin especialidad"}</span>
                    <span>{doctor.date_of_birth ? `Nacimiento: ${formatDate(doctor.date_of_birth)}` : "Nacimiento no registrado"}</span>
                    <span>{doctor.linked_user_email ?? "Sin usuario de acceso"}</span>
                    <span>
                      {doctor.clinics?.length
                        ? doctor.clinics.map((clinic) => clinic.clinic_name).join(" · ")
                        : "Sin clínicas registradas"}
                    </span>
                    {doctor.clinics?.length ? (
                      <div className="detail-stack">
                        {doctor.clinics.map((clinic) => (
                          <span key={`doctor-clinic-inactive-${doctor.id}-${clinic.id}`}>
                            {clinic.is_primary ? "Principal" : "Sede"}: {clinic.clinic_name}
                            {clinic.address ? ` · ${clinic.address}` : ""}
                            {clinic.phone_number ? ` · ${clinic.phone_number}` : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="row-actions">
                      <button type="button" className="secondary-button" onClick={() => startDoctorEdit(doctor)}>Editar</button>
                      <button type="button" className="success-button" onClick={() => toggleDoctorActive(doctor)}>Activar</button>
                    </div>
                  </div>
                ))}
                {!filteredInactiveDoctors.length ? <p className="empty-state">No hay doctores inactivos para ese filtro.</p> : null}
              </div>
              {renderPager(inactiveDoctorPage, filteredInactiveDoctors.length, setInactiveDoctorPage)}
            </>
          )}
        </article>
      </section>
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

  const renderSectionActionModal = () => {
    if (!activeSectionAction) {
      return null;
    }

    if (activeSectionAction === "patient_create") {
      return (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Registro manual</p>
                <h2>Agregar paciente</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setActiveSectionAction(null)}>
                Cerrar
              </button>
            </div>
            <form className="form-card" onSubmit={submitPatient}>
              <div className="three-column-grid">
                <label>
                  <RequiredLabel>Doctor responsable</RequiredLabel>
                  <select
                    value={patientForm.doctor_id}
                    onChange={(event) => setPatientForm((current) => ({ ...current, doctor_id: event.target.value }))}
                    required
                  >
                    <option value="">Selecciona doctor</option>
                    {availableDoctors.map((doctor) => (
                      <option key={`patient-create-doctor-${doctor.id}`} value={doctor.id}>
                        Dr. {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Expediente</span>
                  <input
                    value={patientForm.medical_record_number}
                    onChange={(event) => setPatientForm((current) => ({ ...current, medical_record_number: event.target.value }))}
                    placeholder="Automático si lo dejas vacío"
                  />
                </label>
                <label>
                  <RequiredLabel>Nombres</RequiredLabel>
                  <input
                    value={patientForm.first_name}
                    onChange={(event) => setPatientForm((current) => ({ ...current, first_name: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <RequiredLabel>Apellidos</RequiredLabel>
                  <input
                    value={patientForm.last_name}
                    onChange={(event) => setPatientForm((current) => ({ ...current, last_name: event.target.value }))}
                    required
                  />
                </label>
                <PhoneField
                  label="Teléfono"
                  value={patientForm.primary_phone}
                  onChange={(nextValue) => setPatientForm((current) => ({ ...current, primary_phone: nextValue }))}
                  required
                  placeholder="58420737"
                />
                <label>
                  <span>DPI</span>
                  <input
                    value={patientForm.national_id}
                    onChange={(event) => setPatientForm((current) => ({ ...current, national_id: event.target.value }))}
                  />
                </label>
                <label>
                  <span>NIT</span>
                  <input
                    value={patientForm.tax_id}
                    onChange={(event) => setPatientForm((current) => ({ ...current, tax_id: event.target.value }))}
                  />
                </label>
                <label className="span-two">
                  <span>Correo</span>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(event) => setPatientForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
              </div>
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={() => setActiveSectionAction(null)}>
                  Cancelar
                </button>
                <button type="submit">Guardar paciente</button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Ficha del paciente</p>
              <h2>Editar paciente</h2>
            </div>
            <button type="button" className="secondary-button" onClick={() => setActiveSectionAction(null)}>
              Cerrar
            </button>
          </div>
          <form className="form-card compact-form" onSubmit={submitPatientUpdate}>
            <div className="three-column-grid">
              <label>
                <RequiredLabel>Nombres</RequiredLabel>
                <input
                  value={patientEditForm.first_name}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, first_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <RequiredLabel>Apellidos</RequiredLabel>
                <input
                  value={patientEditForm.last_name}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, last_name: event.target.value }))}
                  required
                />
              </label>
              <PhoneField
                label="Teléfono"
                value={patientEditForm.primary_phone}
                onChange={(nextValue) => setPatientEditForm((current) => ({ ...current, primary_phone: nextValue }))}
                required
                placeholder="58420737"
              />
              <label>
                <span>DPI</span>
                <input
                  value={patientEditForm.national_id}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, national_id: event.target.value }))}
                />
              </label>
              <label>
                <span>NIT</span>
                <input
                  value={patientEditForm.tax_id}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, tax_id: event.target.value }))}
                />
              </label>
              <label>
                <span>Correo</span>
                <input
                  type="email"
                  value={patientEditForm.email}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label className="span-two">
                <span>Dirección</span>
                <input
                  value={patientEditForm.address}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, address: event.target.value }))}
                />
              </label>
              <label className="span-two">
                <span>Notas</span>
                <textarea
                  value={patientEditForm.notes}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <label>
                <span>Estado</span>
                <select
                  value={patientEditForm.is_active ? "active" : "inactive"}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, is_active: event.target.value === "active" }))}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
            </div>
            <div className="row-actions">
              <button type="button" className="secondary-button" onClick={() => setActiveSectionAction(null)}>
                Cancelar
              </button>
              <button type="submit">Guardar cambios</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderReceptionistModal = () => {
    if (!showReceptionistModal || !isAdmin) {
      return null;
    }

    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Equipo clínico</p>
              <h2>{editingReceptionistId ? "Editar recepcionista" : "Registrar recepcionista"}</h2>
            </div>
            <button type="button" className="secondary-button" onClick={resetReceptionistForm}>
              Cerrar
            </button>
          </div>
          <form className="form-card compact-form" onSubmit={submitReceptionist}>
            <div className="two-column-grid">
              <label>
                <RequiredLabel>Nombres</RequiredLabel>
                <input value={receptionistForm.first_name} onChange={(event) => setReceptionistForm((current) => ({ ...current, first_name: event.target.value }))} required />
              </label>
              <label>
                <RequiredLabel>Apellidos</RequiredLabel>
                <input value={receptionistForm.last_name} onChange={(event) => setReceptionistForm((current) => ({ ...current, last_name: event.target.value }))} required />
              </label>
              <label>
                <span>Género</span>
                <select value={receptionistForm.gender} onChange={(event) => setReceptionistForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <PhoneField
                label="Teléfono"
                value={receptionistForm.phone_number}
                onChange={(nextValue) => setReceptionistForm((current) => ({ ...current, phone_number: nextValue }))}
                placeholder="58420737"
              />
              <label>
                <RequiredLabel>Correo</RequiredLabel>
                <input type="email" value={receptionistForm.email} onChange={(event) => setReceptionistForm((current) => ({ ...current, email: event.target.value }))} required disabled={editingReceptionistId !== null} />
              </label>
              <label>
                <span>{editingReceptionistId ? "Nueva contraseña" : "Contraseña inicial"}</span>
                <input type="password" value={receptionistForm.password} onChange={(event) => setReceptionistForm((current) => ({ ...current, password: event.target.value }))} required={editingReceptionistId === null} />
              </label>
            </div>
            <div className="subsection">
              <strong>Doctores asignados</strong>
              <input
                className="search-input"
                placeholder="Filtrar doctores por nombre o especialidad"
                value={receptionistDoctorSearch}
                onChange={(event) => setReceptionistDoctorSearch(event.target.value)}
              />
              <div className="table-list">
                {filteredDoctorOptions.map((doctor) => (
                  <label key={`receptionist-doctor-${doctor.id}`} className="simple-list-item">
                    <span>
                      <input
                        type="checkbox"
                        checked={receptionistForm.doctor_ids.includes(doctor.id)}
                        onChange={(event) =>
                          setReceptionistForm((current) => ({
                            ...current,
                            doctor_ids: event.target.checked
                              ? [...current.doctor_ids, doctor.id]
                              : current.doctor_ids.filter((doctorId) => doctorId !== doctor.id),
                          }))
                        }
                      />
                    </span>
                    <strong>Dr. {doctor.first_name} {doctor.last_name}</strong>
                    <span>{doctor.specialty ?? "Sin especialidad"}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="row-actions">
              <button type="button" className="secondary-button" onClick={resetReceptionistForm}>
                Cancelar
              </button>
              <button type="submit">{editingReceptionistId ? "Actualizar recepcionista" : "Registrar recepcionista"}</button>
            </div>
          </form>
        </div>
      </div>
    );
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
          {renderSectionActionModal()}
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
          {renderReceptionistModal()}
        </section>
      )}
    </main>
  );
}
