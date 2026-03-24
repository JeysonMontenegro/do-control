"use client";

import { useEffect, useMemo, useState } from "react";

import { AgendaTab } from "@/features/module1/components/agenda-tab";
import {
  createDispatchStatusForm,
  createEmailTemplateForm,
  createPatientEditForm,
  createPatientForm,
  createReceptionistForm,
  createReminderRuleForm,
  createTemplateForm,
} from "@/features/module1/clinical-console-defaults";
import { ConsoleMainContent } from "@/features/module1/components/console-main-content";
import { ConsoleModals } from "@/features/module1/components/console-modals";
import { ConsoleOverviewStrip } from "@/features/module1/components/console-overview-strip";
import { ConsoleSidebar } from "@/features/module1/components/console-sidebar";
import { ConsoleTopbar } from "@/features/module1/components/console-topbar";
import { DoctorsSection } from "@/features/module1/components/doctors-section";
import { EncountersTab } from "@/features/module1/components/encounters-tab";
import { GestionHub } from "@/features/module1/components/gestion-hub";
import { DateField, PhoneField, RequiredLabel } from "@/features/module1/components/form-fields";
import { LoginPanel } from "@/features/module1/components/login-panel";
import { MessagesTab } from "@/features/module1/components/messages-tab";
import { PatientsTab } from "@/features/module1/components/patients-tab";
import { PagerBar } from "@/features/module1/components/pager-bar";
import { PendingReviewTab } from "@/features/module1/components/pending-review-tab";
import { useCommunicationsConsole } from "@/features/module1/hooks/use-communications-console";
import { useAppointmentAdmin } from "@/features/module1/hooks/use-appointment-admin";
import { useAgendaInteractions } from "@/features/module1/hooks/use-agenda-interactions";
import { useConsoleContextSync } from "@/features/module1/hooks/use-console-context-sync";
import { useClinicalSession } from "@/features/module1/hooks/use-clinical-session";
import { useClinicalConsoleDerived } from "@/features/module1/hooks/use-clinical-console-derived";
import { useClinicalDataLoader } from "@/features/module1/hooks/use-clinical-data-loader";
import { useDoctorAdmin } from "@/features/module1/hooks/use-doctor-admin";
import { useEncounterAttachmentAdmin } from "@/features/module1/hooks/use-encounter-attachment-admin";
import { useEmailSettingsAdmin } from "@/features/module1/hooks/use-email-settings-admin";
import { usePatientContext } from "@/features/module1/hooks/use-patient-context";
import { usePatientAdmin } from "@/features/module1/hooks/use-patient-admin";
import { useReceptionistAdmin } from "@/features/module1/hooks/use-receptionist-admin";
import { useReminderAdmin } from "@/features/module1/hooks/use-reminder-admin";
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
  appointmentTypeLabel,
  calendarRangeLabel,
  communicationKindLabel,
  confirmationLabel,
  dispatchStatusLabel,
  encounterTypeLabel,
  formatDate,
  formatDateTime,
  hasAnyRole,
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

  const { loadData } = useClinicalDataLoader({
    canViewGestion,
    canViewGlobalCommunications,
    canViewReviewQueue,
    currentRoles,
    data,
    dispatchFilters,
    doctorFilter,
    encounterFormDoctorId: encounterForm.doctor_id,
    isAdmin,
    isAuthenticated,
    patientSearch,
    reminderRuleFormDoctorId: reminderRuleForm.doctor_id,
    setAppointmentReviewItems,
    setClinicSetting,
    setCommunicationDispatchSummary,
    setCommunicationDispatches,
    setCommunicationTemplates,
    setData,
    setDoctorFilter,
    setEmailDispatches,
    setEmailTemplates,
    setEncounterDoctorId: (doctorId) => setEncounterForm((current) => ({ ...current, doctor_id: doctorId })),
    setLoading,
    setMessage,
    setReceptionists,
    setReminderRuleDoctorId: (doctorId) => setReminderRuleForm((current) => ({ ...current, doctor_id: doctorId })),
    setReminderRules,
    setSelectedPatientId,
    setTemplateDoctorId: (doctorId) => setTemplateForm((current) => ({ ...current, doctor_id: doctorId })),
    templateFormDoctorId: templateForm.doctor_id,
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

  const { toggleEmailDelivery, toggleEmailProcessSetting } = useEmailSettingsAdmin({
    setClinicSetting,
    setMessage,
  });

  const activeReceptionists = useMemo(() => receptionists.filter((receptionist) => receptionist.is_active), [receptionists]);
  const inactiveReceptionists = useMemo(() => receptionists.filter((receptionist) => !receptionist.is_active), [receptionists]);
  const teamPageSize = 6;
  const allowMultiDoctorVisibility = clinicSetting?.allow_multi_doctor_visibility ?? false;
  const canChooseAmongMultipleDoctors = isAdmin || isReceptionist || allowMultiDoctorVisibility;
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
  const {
    agendaDays,
    appointmentsByDayKey,
    availableDoctors,
    cancelledUpcomingCount,
    confirmationTemplate,
    confirmedUpcomingCount,
    currentUserDisplay,
    doctorNameById,
    filteredAppointments,
    filteredEncounters,
    filteredPatients,
    generalReminderRule,
    hasSingleDoctorContext,
    monthDays,
    paginatedActiveDoctors,
    paginatedInactiveDoctors,
    remindersScheduledCount,
    reviewQueueByAppointmentId,
    scopedReminderRules,
    scopedUpcomingAppointments,
    selectedDoctor,
    sortedPatientEncounters,
    unconfirmedUpcomingCount,
  } = useClinicalConsoleDerived({
    activeDoctorPage,
    activeRoles: currentRoles,
    activeTabDoctorFilter: doctorFilter,
    appointmentFilter,
    appointmentFormDoctorId: appointmentForm.doctor_id,
    appointmentReviewItems,
    calendarDate,
    calendarView,
    communicationDispatches,
    communicationTemplates,
    currentUserDisplayName,
    currentUserEmail,
    currentUserFirstName,
    currentUserGender,
    currentUserLastName,
    data,
    doctorFilter,
    doctorRosterActiveDoctors: activeDoctors,
    doctorRosterFilteredActiveDoctors: filteredActiveDoctors,
    doctorRosterFilteredInactiveDoctors: filteredInactiveDoctors,
    encounterFormDoctorId: encounterForm.doctor_id,
    inactiveDoctorPage,
    reminderRules,
    scopedDoctorId,
    selectedSummary,
    teamPageSize,
    topbarSearch,
  });

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

  useConsoleContextSync({
    appointmentFormDoctorId: appointmentForm.doctor_id,
    availableDoctors,
    confirmationTemplate,
    currentRoles,
    doctorFilter,
    encounterFormDoctorId: encounterForm.doctor_id,
    hasSingleDoctorContext,
    patientFormDoctorId: patientForm.doctor_id,
    reminderRuleFormDoctorId: reminderRuleForm.doctor_id,
    selectedDoctor,
    setConfirmationTemplateDefaults: (template) =>
      setTemplateForm((current) => ({
        ...current,
        doctor_id: template.doctor_id ? String(template.doctor_id) : current.doctor_id,
        channel: template.channel,
        template_key: template.template_key,
        title: template.title,
        body: template.body,
        is_active: template.is_active,
      })),
    setAppointmentDoctorId: (doctorId) => setAppointmentForm((current) => ({ ...current, doctor_id: doctorId })),
    setDoctorFilter,
    setEncounterDoctorId: (doctorId) => setEncounterForm((current) => ({ ...current, doctor_id: doctorId })),
    setPatientDoctorId: (doctorId) => setPatientForm((current) => ({ ...current, doctor_id: doctorId })),
    setReminderRuleDoctorId: (doctorId) => setReminderRuleForm((current) => ({ ...current, doctor_id: doctorId })),
    setTemplateDoctorId: (doctorId) => setTemplateForm((current) => ({ ...current, doctor_id: doctorId })),
    templateFormBody: templateForm.body,
    templateFormDoctorId: templateForm.doctor_id,
  });

  const { refreshSelectedSummary } = usePatientContext({
    canViewPatientTimeline,
    dataPatients: data.patients,
    isAuthenticated,
    scopedDoctorId,
    selectedPatientId,
    selectedSummary,
    setMessage,
    setPatientEditForm,
    setSelectedPatientDispatches,
    setSelectedPatientId,
    setSelectedSummary,
  });

  const { closeEncounter, openAttachment, submitAttachment, submitEncounter } = useEncounterAttachmentAdmin({
    attachmentEncounterId,
    attachmentFile,
    attachmentType,
    diagnoses,
    encounterForm,
    examOrders,
    loadData,
    prescriptionItems,
    refreshSelectedSummary,
    selectedPatientId,
    setAttachmentEncounterId,
    setAttachmentFile,
    setDiagnoses,
    setDownloadingAttachmentId,
    setEncounterForm,
    setExamOrders,
    setMessage,
    setPrescriptionItems,
    setSelectedPatientId,
  });

  const { activateDefault24HourReminder, submitReminderRule, toggleReminderRule } = useReminderAdmin({
    communicationTemplates,
    loadData,
    reminderRuleForm,
    reminderRules,
    setMessage,
    setReminderRuleForm,
    templateForm,
  });

  const {
    calendarMetrics,
    focusedAppointment,
    goToNextRange,
    goToPreviousRange,
    goToToday,
    renderAppointmentBadges,
  } = useAgendaInteractions({
    appointmentReviewItemsByAppointmentId: reviewQueueByAppointmentId,
    calendarView,
    communicationDispatches,
    expandedAppointmentId,
    filteredAppointments,
    setCalendarDate,
  });

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
          <ConsoleSidebar
            activeTab={activeTab}
            appointmentCount={filteredAppointments.length}
            canViewGestion={canViewGestion}
            canViewMessages={canViewMessages}
            canViewReviewQueue={canViewReviewQueue}
            currentRoles={currentRoles}
            isAdmin={isAdmin}
            logout={logout}
            onTabChange={setActiveTab}
            patientCount={filteredPatients.length}
            reviewCount={appointmentReviewItems.length}
            tabs={consoleTabs}
          />

          <div className="app-content">
            <ConsoleTopbar
              activeTabLabel={consoleTabs.find((tab) => tab.id === activeTab)?.label ?? "Agenda"}
              currentUserDisplay={currentUserDisplay}
              doctorFilter={doctorFilter}
              isReceptionist={isReceptionist}
              onDoctorFilterChange={setDoctorFilter}
              onSearchChange={setTopbarSearch}
              searchValue={topbarSearch}
              selectedDoctor={selectedDoctor}
              visibleDoctors={availableDoctors}
            />

            {message ? <p className={`message-box message-box-${getMessageTone(message)}`}>{message}</p> : null}
            {loading ? <p className="message-box message-box-info">Cargando información clínica...</p> : null}
            {!loading ? (
              <ConsoleOverviewStrip
                activeReviewItems={appointmentReviewItems.length}
                encountersCount={filteredEncounters.length}
                filteredAppointmentsCount={filteredAppointments.length}
                filteredPatientsCount={filteredPatients.length}
                globalSearch={topbarSearch.trim()}
              />
            ) : null}

            <ConsoleMainContent
              activeTab={activeTab}
              agendaTabProps={{
                agendaDays,
                allowMultiDoctorVisibility,
                appointmentDispatches,
                appointmentFilter,
                appointmentForm,
                appointmentHistory,
                appointmentReviewItems,
                appointmentsByDayKey,
                availableDoctors,
                calendarDate,
                calendarMetrics,
                calendarView,
                canChooseAmongMultipleDoctors,
                canManageAppointments,
                canViewGlobalCommunications,
                data: { appointments: filteredAppointments, encounters: filteredEncounters, patients: filteredPatients },
                dispatchAttempts,
                doctorFilter,
                expandedDispatchId,
                filteredAppointments,
                focusedAppointment,
                goToNextRange,
                goToPreviousRange,
                goToToday,
                isAdmin,
                monthDays,
                onAppointmentDoctorFieldChange: (value) => setAppointmentForm((current) => ({ ...current, doctor_id: value })),
                onAppointmentEndDateFieldChange: (value) => setAppointmentForm((current) => ({ ...current, scheduled_end_date: value })),
                onAppointmentEndTimeFieldChange: (value) => setAppointmentForm((current) => ({ ...current, scheduled_end_time: value })),
                onAppointmentFilterChange: setAppointmentFilter,
                onAppointmentPatientFieldChange: (value) => setAppointmentForm((current) => ({ ...current, patient_id: value })),
                onAppointmentStartDateFieldChange: (value) => setAppointmentForm((current) => ({ ...current, scheduled_start_date: value })),
                onAppointmentStartTimeFieldChange: (value) => setAppointmentForm((current) => ({ ...current, scheduled_start_time: value })),
                onCalendarViewChange: setCalendarView,
                onDoctorFilterChange: setDoctorFilter,
                onSelectAppointment: toggleAppointmentHistory,
                openDispatchAttempts: toggleDispatchAttempts,
                reminderNow: sendAppointmentReminderNow,
                renderAppointmentBadges,
                selectedDoctor,
                selectedSummary,
                slotLabels,
                submitAppointment,
                updateAppointmentStatus,
              }}
              canViewGestion={canViewGestion}
              doctorsSectionProps={{
                activeDoctors,
                activePager: <PagerBar onChange={setActiveDoctorPage} page={activeDoctorPage} pageSize={teamPageSize} totalItems={filteredActiveDoctors.length} />,
                addDoctorClinic,
                doctorAdminForm,
                doctorDirectorySearch,
                doctorRosterTab,
                editingDoctorId,
                filteredActiveDoctorsCount: filteredActiveDoctors.length,
                filteredInactiveDoctorsCount: filteredInactiveDoctors.length,
                inactiveDoctors,
                inactivePager: <PagerBar onChange={setInactiveDoctorPage} page={inactiveDoctorPage} pageSize={teamPageSize} totalItems={filteredInactiveDoctors.length} />,
                isAdmin,
                onDoctorDirectorySearchChange: updateDoctorDirectorySearch,
                paginatedActiveDoctors,
                paginatedInactiveDoctors,
                removeDoctorClinic,
                resetDoctorAdminForm,
                setDoctorAdminForm,
                setDoctorRosterTab,
                startDoctorEdit,
                submitDoctorAdmin,
                toggleDoctorActive,
                updateDoctorClinic,
              }}
              encountersTabProps={{
                appointments: filteredAppointments,
                attachmentEncounterId,
                attachmentType,
                availableDoctors,
                canChooseAmongMultipleDoctors,
                canManageEncounters,
                closeEncounter,
                diagnoses,
                downloadingAttachmentId,
                encounters: filteredEncounters,
                encounterForm,
                examOrders,
                isAdmin,
                openAttachment,
                patients: filteredPatients,
                prescriptionItems,
                selectedDoctor,
                selectedSummary,
                setAttachmentEncounterId,
                setAttachmentFile,
                setAttachmentType,
                setDiagnoses,
                setEncounterForm,
                setExamOrders,
                setPrescriptionItems,
                submitAttachment,
                submitEncounter,
              }}
              gestionHubProps={{
                activateDefault24HourReminder,
                activeDoctorsCount: activeDoctors.length,
                activeReceptionists,
                activeReceptionistsCount: activeReceptionists.length,
                activeReceptionistsPager: <PagerBar onChange={setActiveReceptionistPage} page={activeReceptionistPage} pageSize={teamPageSize} totalItems={activeReceptionists.length} />,
                allowMultiDoctorVisibility,
                availableDoctors: data.doctors,
                cancelledUpcomingCount,
                clinicSetting,
                communicationTemplates,
                confirmationTemplatePreview: templatePreview,
                confirmedUpcomingCount,
                currentUserDisplay,
                currentUserEmail,
                currentUserProfilePhotoUrl,
                doctorNameById,
                emailDispatches,
                emailTemplateForm,
                emailTemplatePreview,
                emailTemplates,
                generalReminderRule,
                gestionSubtab,
                inactiveReceptionists,
                inactiveReceptionistsPager: <PagerBar onChange={setInactiveReceptionistPage} page={inactiveReceptionistPage} pageSize={teamPageSize} totalItems={inactiveReceptionists.length} />,
                inactiveUsersCount: inactiveDoctors.length + inactiveReceptionists.length,
                isAdmin,
                onAddReceptionist: () => {
                  resetReceptionistForm();
                  setShowReceptionistModal(true);
                },
                onEditReceptionist: startReceptionistEdit,
                onGoToAgendaAppointment: (appointmentId) => {
                  setActiveTab("agenda");
                  toggleAppointmentHistory(appointmentId);
                },
                onGestionSubtabChange: setGestionSubtab,
                onProfilePhotoChange: setProfilePhotoFile,
                onSelectReceptionist: setSelectedReceptionistId,
                paginatedActiveReceptionists,
                paginatedInactiveReceptionists,
                previewConfirmationTemplate,
                previewEmailTemplate,
                profileForm,
                reminderRuleForm,
                reminderRules,
                remindersScheduledCount,
                resendEmailDispatch,
                saveConfirmationTemplate,
                saveEmailTemplate,
                scopedDoctorId,
                scopedUpcomingAppointments,
                selectedDoctor,
                selectedReceptionist,
                sendTestEmail,
                setEmailTemplateForm,
                setProfileForm,
                setReminderRuleForm,
                setTemplateForm,
                setTestEmailRecipient,
                submitReminderRule,
                templateForm,
                testEmailRecipient,
                toggleEmailDelivery,
                toggleEmailProcessSetting,
                toggleMultiDoctorVisibility,
                toggleReceptionistActive,
                toggleReminderRule,
                toggleTemplate,
                unconfirmedUpcomingCount,
                updateCurrentProfile,
                uploadCurrentProfilePhoto,
              }}
              isAdmin={isAdmin}
              messagesTabProps={{
                canViewGlobalCommunications,
                communicationDispatchSummary,
                communicationDispatches,
                data: { patients: filteredPatients },
                dispatchAttempts,
                dispatchFilters,
                expandedDispatchId,
                generateDispatchesNow,
                isAdmin,
                messagesSubtab,
                requeueDispatch,
                requeueVisibleFailedDispatches,
                selectedPatientDispatches,
                selectedPatientId,
                selectedSummary,
                setActiveTab,
                setDispatchFilters,
                setMessagesSubtab,
                setSelectedPatientId,
                toggleAppointmentHistory,
                toggleDispatchAttempts,
                updateDispatchStatus,
              }}
              patientsTabProps={{
                canManagePatients,
                expandedEncounterId,
                isAdmin,
                onEditSelectedPatient: () => selectedSummary && setActiveSectionAction("patient_edit"),
                onGoToAgendaFromPatient: (appointmentId) => {
                  setActiveTab("agenda");
                  toggleAppointmentHistory(appointmentId);
                },
                onOpenAttachment: openAttachment,
                onPatientSearchChange: setPatientSearch,
                onSelectPatient: setSelectedPatientId,
                onShowCreatePatientModal: () => setActiveSectionAction("patient_create"),
                patientSearch,
                patients: filteredPatients,
                selectedPatientId,
                selectedSummary,
                setExpandedEncounterId,
                sortedPatientEncounters,
              }}
              pendingReviewTabProps={{
                appointmentReviewItems,
                communicationDispatches,
                filteredAppointments,
                onGoToAgendaAppointment: (appointmentId) => {
                  setActiveTab("agenda");
                  toggleAppointmentHistory(appointmentId);
                },
                renderAppointmentBadges,
                reviewQueueByAppointmentId,
                resolveReviewItem,
              }}
            />
          </div>
          <ConsoleModals
            dispatchStatusModalProps={{
              activeDispatch,
              closeDispatchStatusModal,
              dispatchStatusForm,
              setDispatchStatusForm,
              submitDispatchStatusUpdate,
            }}
            patientActionModalProps={{
              activeSectionAction,
              availableDoctors,
              patientEditForm,
              patientForm,
              setActiveSectionAction,
              setPatientEditForm,
              setPatientForm,
              submitPatient,
              submitPatientUpdate,
            }}
            receptionistModalProps={{
              editingReceptionistId,
              filteredDoctorOptions,
              isAdmin,
              receptionistDoctorSearch,
              receptionistForm,
              resetReceptionistForm,
              setReceptionistDoctorSearch,
              setReceptionistForm,
              showReceptionistModal,
              submitReceptionist,
            }}
            reviewResolutionModalProps={{
              activeReviewItem,
              allAppointments: data.appointments,
              allPatients: data.patients,
              availableDoctors,
              closeReviewResolutionModal,
              reviewAppointmentOptions,
              reviewPatientOptions,
              reviewResolutionForm,
              setReviewResolutionForm,
              submitReviewResolution,
            }}
          />
        </section>
      )}
    </main>
  );
}
