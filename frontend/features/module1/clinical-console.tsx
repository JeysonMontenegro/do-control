"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppointmentBadges } from "@/features/module1/components/appointment-badges";
import { AgendaCalendar } from "@/features/module1/components/agenda-calendar";
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
  formatDateTime,
  hasAnyRole,
  lastDispatchStatus,
  nowPlusMinutes,
  reviewReasonLabel,
  startOfDay,
  startOfMonthGrid,
  startOfWeek,
} from "@/features/module1/console-utils";
import { API_URL, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  Appointment,
  AppointmentHistory,
  AppointmentReviewItem,
  CommunicationDispatchGeneration,
  CommunicationDispatch,
  CommunicationDispatchBatchRequeue,
  CommunicationDispatchAttempt,
  CommunicationDispatchSummary,
  CommunicationTemplate,
  CommunicationTemplatePreview,
  Diagnosis,
  Doctor,
  Encounter,
  ExamOrder,
  LoginResponse,
  Patient,
  PatientSummary,
  PrescriptionItem,
  Receptionist,
  ReminderRule,
} from "@/features/module1/types";

type LoadState = {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  encounters: Encounter[];
};

type ReviewResolutionAction = "reject" | "link_existing" | "create_appointment";

const initialLoadState: LoadState = {
  doctors: [],
  patients: [],
  appointments: [],
  encounters: [],
};

export function ClinicalConsole() {
  const [data, setData] = useState<LoadState>(initialLoadState);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ConsoleTab>("agenda");
  const [activeSectionAction, setActiveSectionAction] = useState<"patient_create" | "patient_edit" | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("semana");
  const [calendarDate, setCalendarDate] = useState(() => startOfDay(new Date()));
  const [doctorFilter, setDoctorFilter] = useState("");
  const [topbarSearch, setTopbarSearch] = useState("");
  const [loginForm, setLoginForm] = useState({
    email: "doctor@docontrol.local",
    password: "Doctor123!",
  });
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<PatientSummary | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState("lab_result");
  const [attachmentEncounterId, setAttachmentEncounterId] = useState("");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);
  const [communicationTemplates, setCommunicationTemplates] = useState<CommunicationTemplate[]>([]);
  const [communicationDispatches, setCommunicationDispatches] = useState<CommunicationDispatch[]>([]);
  const [communicationDispatchSummary, setCommunicationDispatchSummary] = useState<CommunicationDispatchSummary | null>(null);
  const [selectedPatientDispatches, setSelectedPatientDispatches] = useState<CommunicationDispatch[]>([]);
  const [appointmentHistory, setAppointmentHistory] = useState<Record<number, AppointmentHistory[]>>({});
  const [appointmentDispatches, setAppointmentDispatches] = useState<Record<number, CommunicationDispatch[]>>({});
  const [expandedAppointmentId, setExpandedAppointmentId] = useState<number | null>(null);
  const [expandedEncounterId, setExpandedEncounterId] = useState<number | null>(null);
  const [appointmentReviewItems, setAppointmentReviewItems] = useState<AppointmentReviewItem[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<"all" | "ws" | "confirmed" | "pending_confirmation" | "needs_attention">("all");
  const [dispatchAttempts, setDispatchAttempts] = useState<Record<number, CommunicationDispatchAttempt[]>>({});
  const [expandedDispatchId, setExpandedDispatchId] = useState<number | null>(null);
  const [templatePreview, setTemplatePreview] = useState<CommunicationTemplatePreview | null>(null);
  const [dispatchFilters, setDispatchFilters] = useState({
    status_filter: "",
    channel: "",
    query: "",
  });
  const [reminderRuleForm, setReminderRuleForm] = useState({
    doctor_id: "",
    channel: "whatsapp",
    trigger_type: "before_appointment",
    minutes_before: "120",
    template_key: "appointment_2h",
    is_active: true,
  });
  const [templateForm, setTemplateForm] = useState({
    doctor_id: "",
    channel: "whatsapp",
    template_key: CONFIRMATION_TEMPLATE_KEY,
    title: DEFAULT_CONFIRMATION_TITLE,
    body: DEFAULT_CONFIRMATION_BODY,
    is_active: true,
  });
  const [patientForm, setPatientForm] = useState({
    medical_record_number: "",
    first_name: "",
    last_name: "",
    primary_phone: "",
    national_id: "",
    tax_id: "",
    email: "",
  });
  const [patientEditForm, setPatientEditForm] = useState({
    first_name: "",
    last_name: "",
    primary_phone: "",
    national_id: "",
    tax_id: "",
    email: "",
    address: "",
    notes: "",
    is_active: true,
  });
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: "",
    doctor_id: "",
    scheduled_start: nowPlusMinutes(60),
    scheduled_end: nowPlusMinutes(90),
    appointment_type: "follow_up",
    reason: "",
    source: "receptionist",
    created_by: "frontend-demo",
  });
  const [encounterForm, setEncounterForm] = useState({
    patient_id: "",
    doctor_id: "",
    appointment_id: "",
    encounter_date: nowPlusMinutes(0),
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
  const [doctorAdminForm, setDoctorAdminForm] = useState({
    first_name: "",
    last_name: "",
    gender: "male",
    specialty: "",
    license_number: "",
    primary_phone: "",
    user_email: "",
    user_password: "",
  });
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [receptionistForm, setReceptionistForm] = useState({
    first_name: "",
    last_name: "",
    gender: "female",
    phone_number: "",
    email: "",
    password: "",
    doctor_ids: [] as number[],
  });
  const [editingReceptionistId, setEditingReceptionistId] = useState<number | null>(null);
  const [activeReviewItemId, setActiveReviewItemId] = useState<number | null>(null);
  const [activeDispatchStatusId, setActiveDispatchStatusId] = useState<number | null>(null);
  const [reviewResolutionForm, setReviewResolutionForm] = useState<{
    action: ReviewResolutionAction;
    patient_id: string;
    doctor_id: string;
    appointment_id: string;
    note: string;
  }>({
    action: "create_appointment",
    patient_id: "",
    doctor_id: "",
    appointment_id: "",
    note: "",
  });
  const [dispatchStatusForm, setDispatchStatusForm] = useState<{
    status: "sent" | "delivered" | "failed";
    error_message: string;
  }>({
    status: "delivered",
    error_message: "Actualización manual",
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

  async function loadData() {
    setLoading(true);
    try {
      const patientPath = patientSearch.trim()
        ? `/api/patients?query=${encodeURIComponent(patientSearch.trim())}`
        : "/api/patients";
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
      ] = await Promise.all([
        apiGet<Doctor[]>("/api/doctors"),
        apiGet<Patient[]>(patientPath),
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
      ]);

      setData({ doctors, patients, appointments, encounters });
      setReminderRules(loadedReminderRules);
      setCommunicationTemplates(loadedTemplates);
      setCommunicationDispatches(loadedDispatches);
      setCommunicationDispatchSummary(loadedDispatchSummary);
      setAppointmentReviewItems(loadedReviewItems);
      setReceptionists(loadedReceptionists);
      if (!appointmentForm.doctor_id && doctors[0]) {
        setAppointmentForm((current) => ({ ...current, doctor_id: String(doctors[0].id) }));
      }
      if (!encounterForm.doctor_id && doctors[0]) {
        setEncounterForm((current) => ({ ...current, doctor_id: String(doctors[0].id) }));
      }
      if (!selectedPatientId && patients[0]) {
        setSelectedPatientId(String(patients[0].id));
      }
      if (!doctorFilter && doctors[0] && currentRoles.includes("doctor")) {
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
    const token = window.localStorage.getItem("docontrol_token");
    const email = window.localStorage.getItem("docontrol_user_email");
    const roles = window.localStorage.getItem("docontrol_roles");
    if (token) {
      setIsAuthenticated(true);
    }
    if (email) {
      setCurrentUserEmail(email);
    }
    if (roles) {
      try {
        setCurrentRoles(JSON.parse(roles) as string[]);
      } catch {
        setCurrentRoles([]);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, patientSearch, currentRoles, dispatchFilters]);

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
        const summary = await apiGet<PatientSummary>(`/api/patients/${selectedPatientId}/summary`);
        setSelectedSummary(summary);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudo cargar el resumen del paciente.");
      }
    }

    loadSummary();
  }, [isAuthenticated, selectedPatientId]);

  useEffect(() => {
    if (!selectedSummary) {
      setPatientEditForm({
        first_name: "",
        last_name: "",
        primary_phone: "",
        national_id: "",
        tax_id: "",
        email: "",
        address: "",
        notes: "",
        is_active: true,
      });
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

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = (await response.json()) as LoginResponse;
      window.localStorage.setItem("docontrol_token", payload.access_token);
      window.localStorage.setItem("docontrol_user_email", payload.user_email);
      window.localStorage.setItem("docontrol_roles", JSON.stringify(payload.roles));
      setIsAuthenticated(true);
      setCurrentUserEmail(payload.user_email);
      setCurrentRoles(payload.roles);
      setMessage(`Sesión iniciada como ${payload.user_email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    }
  }

  function logout() {
    window.localStorage.removeItem("docontrol_token");
    window.localStorage.removeItem("docontrol_user_email");
    window.localStorage.removeItem("docontrol_roles");
    setIsAuthenticated(false);
    setCurrentUserEmail("");
    setCurrentRoles([]);
    setData(initialLoadState);
    setSelectedSummary(null);
    setSelectedPatientDispatches([]);
    setMessage("Sesión cerrada.");
  }

  async function submitPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<Patient>("/api/patients", {
        ...patientForm,
        national_id: patientForm.national_id || null,
      });
      setPatientForm({
        medical_record_number: "",
        first_name: "",
        last_name: "",
        primary_phone: "",
        national_id: "",
        tax_id: "",
        email: "",
      });
      setActiveSectionAction(null);
      await loadData();
      setMessage("Paciente creado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el paciente.");
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
      await apiPatch<Patient>(`/api/patients/${selectedPatientId}`, {
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
      setSelectedSummary(await apiGet<PatientSummary>(`/api/patients/${selectedPatientId}/summary`));
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
        scheduled_start: new Date(appointmentForm.scheduled_start).toISOString(),
        scheduled_end: new Date(appointmentForm.scheduled_end).toISOString(),
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
        encounter_date: new Date(encounterForm.encounter_date).toISOString(),
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
        setSelectedSummary(await apiGet<PatientSummary>(`/api/patients/${selectedPatientId}/summary`));
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
        setSelectedSummary(await apiGet<PatientSummary>(`/api/patients/${selectedPatientId}/summary`));
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
        setSelectedSummary(await apiGet<PatientSummary>(`/api/patients/${selectedPatientId}/summary`));
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
      setReminderRuleForm({
        doctor_id: "",
        channel: "whatsapp",
        trigger_type: "before_appointment",
        minutes_before: "120",
        template_key: "appointment_2h",
        is_active: true,
      });
      await loadData();
      setMessage("Regla de recordatorio creada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la regla.");
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
        specialty: doctorAdminForm.specialty || null,
        license_number: doctorAdminForm.license_number || null,
        primary_phone: doctorAdminForm.primary_phone || null,
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

  function startDoctorEdit(doctor: Doctor) {
    setEditingDoctorId(doctor.id);
    setDoctorAdminForm({
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      gender: doctor.gender ?? "other",
      specialty: doctor.specialty ?? "",
      license_number: doctor.license_number ?? "",
      primary_phone: doctor.phone_numbers?.find((phone) => phone.is_primary)?.phone_number ?? "",
      user_email: doctor.linked_user_email ?? "",
      user_password: "",
    });
  }

  function resetDoctorAdminForm() {
    setEditingDoctorId(null);
    setDoctorAdminForm({
      first_name: "",
      last_name: "",
      gender: "male",
      specialty: "",
      license_number: "",
      primary_phone: "",
      user_email: "",
      user_password: "",
    });
  }

  function startReceptionistEdit(receptionist: Receptionist) {
    setEditingReceptionistId(receptionist.id);
    setReceptionistForm({
      first_name: receptionist.first_name,
      last_name: receptionist.last_name,
      gender: receptionist.gender ?? "other",
      phone_number: receptionist.phone_number ?? "",
      email: receptionist.email,
      password: "",
      doctor_ids: receptionist.assigned_doctors.map((doctor) => doctor.id),
    });
  }

  function resetReceptionistForm() {
    setEditingReceptionistId(null);
    setReceptionistForm({
      first_name: "",
      last_name: "",
      gender: "female",
      phone_number: "",
      email: "",
      password: "",
      doctor_ids: [],
    });
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

  async function submitTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost<CommunicationTemplate>("/api/communication-templates", {
        doctor_id: templateForm.doctor_id ? Number(templateForm.doctor_id) : null,
        channel: templateForm.channel,
        template_key: templateForm.template_key,
        title: templateForm.title,
        body: templateForm.body,
        is_active: templateForm.is_active,
      });
      setTemplateForm({
        doctor_id: "",
        channel: "whatsapp",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        title: DEFAULT_CONFIRMATION_TITLE,
        body: DEFAULT_CONFIRMATION_BODY,
        is_active: true,
      });
      setTemplatePreview(null);
      await loadData();
      setMessage("Plantilla creada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la plantilla.");
    }
  }

  async function saveConfirmationTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const payload = {
        doctor_id: currentRoles.includes("doctor") ? (selectedDoctor?.id ?? null) : templateForm.doctor_id ? Number(templateForm.doctor_id) : null,
        channel: "whatsapp",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        title: templateForm.title || "Confirmación de cita",
        body: templateForm.body,
        is_active: true,
      };

      if (confirmationTemplate) {
        await apiPatch<CommunicationTemplate>(`/api/communication-templates/${confirmationTemplate.id}`, payload);
        setMessage("Mensaje de confirmación actualizado.");
      } else {
        await apiPost<CommunicationTemplate>("/api/communication-templates", payload);
        setMessage("Mensaje de confirmación guardado.");
      }

      await loadData();
      setTemplatePreview(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el mensaje de confirmación.");
    }
  }

  async function toggleTemplate(template: CommunicationTemplate) {
    setMessage("");
    try {
      await apiPatch<CommunicationTemplate>(`/api/communication-templates/${template.id}`, {
        is_active: !template.is_active,
      });
      await loadData();
      setMessage(`Plantilla ${template.is_active ? "desactivada" : "activada"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la plantilla.");
    }
  }

  async function previewTemplate() {
    setMessage("");
    try {
      const firstExamOrderId =
        selectedSummary?.encounters.flatMap((encounter) => encounter.exam_orders ?? []).find((exam) => exam.id)?.id ??
        null;
      const preview = await apiPost<CommunicationTemplatePreview>("/api/communication-templates/preview", {
        doctor_id: templateForm.doctor_id ? Number(templateForm.doctor_id) : appointmentForm.doctor_id ? Number(appointmentForm.doctor_id) : null,
        channel: templateForm.channel,
        template_key: templateForm.template_key || "preview",
        title: templateForm.title || "Vista previa",
        body: templateForm.body,
        patient_id: selectedPatientId ? Number(selectedPatientId) : null,
        appointment_id: selectedSummary?.appointments[0]?.id ?? null,
        exam_order_id: firstExamOrderId,
      });
      setTemplatePreview(preview);
      setMessage("Vista previa generada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la vista previa.");
    }
  }

  async function previewConfirmationTemplate() {
    setMessage("");
    try {
      const firstExamOrderId =
        selectedSummary?.encounters.flatMap((encounter) => encounter.exam_orders ?? []).find((exam) => exam.id)?.id ??
        null;
      const preview = await apiPost<CommunicationTemplatePreview>("/api/communication-templates/preview", {
        doctor_id: currentRoles.includes("doctor") ? (selectedDoctor?.id ?? null) : templateForm.doctor_id ? Number(templateForm.doctor_id) : null,
        channel: "whatsapp",
        template_key: CONFIRMATION_TEMPLATE_KEY,
        title: templateForm.title || "Confirmación de cita",
        body: templateForm.body,
        patient_id: selectedPatientId ? Number(selectedPatientId) : null,
        appointment_id: selectedSummary?.appointments[0]?.id ?? null,
        exam_order_id: firstExamOrderId,
      });
      setTemplatePreview(preview);
      setMessage("Vista previa generada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar la vista previa.");
    }
  }

  async function generateDispatchesNow() {
    setMessage("");
    try {
      const result = await apiPost<CommunicationDispatchGeneration>("/api/communication-dispatches/generate", {});
      await loadData();
      setMessage(`Se generaron ${result.created_count} mensajes.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron generar los mensajes.");
    }
  }

  async function requeueDispatch(dispatchId: number) {
    setMessage("");
    try {
      await apiPost<CommunicationDispatch>(`/api/communication-dispatches/${dispatchId}/requeue`, {});
      await loadData();
      setMessage(`Mensaje ${dispatchId} reenviado a cola.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reenviar el mensaje.");
    }
  }

  async function requeueVisibleFailedDispatches() {
    setMessage("");
    try {
      const failedDispatchIds = communicationDispatches.filter((dispatch) => dispatch.status === "failed").map((dispatch) => dispatch.id);
      if (!failedDispatchIds.length) {
        setMessage("No hay mensajes fallidos en la vista actual.");
        return;
      }
      const result = await apiPost<CommunicationDispatchBatchRequeue>("/api/communication-dispatches/requeue-batch", {
        dispatch_ids: failedDispatchIds,
      });
      await loadData();
      setMessage(`Se reenviaron ${result.requeued_count} mensajes fallidos.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reenviar el lote.");
    }
  }

  async function toggleDispatchAttempts(dispatchId: number) {
    if (expandedDispatchId === dispatchId) {
      setExpandedDispatchId(null);
      return;
    }

    setMessage("");
    try {
      if (!dispatchAttempts[dispatchId]) {
        const attempts = await apiGet<CommunicationDispatchAttempt[]>(`/api/communication-dispatches/${dispatchId}/attempts`);
        setDispatchAttempts((current) => ({ ...current, [dispatchId]: attempts }));
      }
      setExpandedDispatchId(dispatchId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron cargar los intentos.");
    }
  }

  async function updateDispatchStatus(dispatchId: number, status: "sent" | "delivered" | "failed") {
    setDispatchStatusForm({
      status,
      error_message: "Actualización manual",
    });
    setActiveDispatchStatusId(dispatchId);
  }

  function closeDispatchStatusModal() {
    setActiveDispatchStatusId(null);
    setDispatchStatusForm({
      status: "delivered",
      error_message: "Actualización manual",
    });
  }

  async function submitDispatchStatusUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeDispatch) {
      return;
    }

    setMessage("");
    try {
      const payload: Record<string, string> = { status: dispatchStatusForm.status };
      if (dispatchStatusForm.status === "failed") {
        if (!dispatchStatusForm.error_message.trim()) {
          setMessage("Debes indicar el motivo del fallo.");
          return;
        }
        payload.error_message = dispatchStatusForm.error_message.trim();
      }
      await apiPatch<CommunicationDispatch>(`/api/communication-dispatches/${activeDispatch.id}`, payload);
      closeDispatchStatusModal();
      await loadData();
      setMessage(`Mensaje ${activeDispatch.id} actualizado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el mensaje.");
    }
  }

  async function resolveReviewItem(
    itemId: number,
    action: ReviewResolutionAction,
  ) {
    const item = appointmentReviewItems.find((entry) => entry.id === itemId);
    if (!item) {
      setMessage("No se encontró el pendiente seleccionado.");
      return;
    }

    const normalizedRequestedName = item.patient_name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const matchingPatients = data.patients.filter((patient) => {
      const patientName = `${patient.first_name} ${patient.last_name}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return (
        patient.primary_phone === item.phone_number ||
        patientName.includes(normalizedRequestedName) ||
        normalizedRequestedName.includes(patientName)
      );
    });
    const suggestedPatientId =
      matchingPatients[0]?.id ??
      (selectedPatientId ? Number(selectedPatientId) : null);
    const suggestedAppointmentId =
      item.existing_appointment_id ??
      data.appointments.find(
        (appointment) =>
          (item.doctor_id === null || appointment.doctor_id === item.doctor_id) &&
          (appointment.patient_name ?? "").toLowerCase().includes(item.patient_name.toLowerCase()),
      )?.id ??
      null;

    setReviewResolutionForm({
      action,
      patient_id: action === "create_appointment" && suggestedPatientId ? String(suggestedPatientId) : "",
      doctor_id: item.doctor_id ? String(item.doctor_id) : "",
      appointment_id: action === "link_existing" && suggestedAppointmentId ? String(suggestedAppointmentId) : "",
      note:
        action === "reject"
          ? "Rechazado manualmente"
          : item.review_reason === "reschedule_request"
            ? "Solicitud de reagendar atendida manualmente."
            : "",
    });
    setActiveReviewItemId(itemId);
  }

  function closeReviewResolutionModal() {
    setActiveReviewItemId(null);
    setReviewResolutionForm({
      action: "create_appointment",
      patient_id: "",
      doctor_id: "",
      appointment_id: "",
      note: "",
    });
  }

  async function submitReviewResolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeReviewItem) {
      return;
    }

    setMessage("");
    try {
      const payload: Record<string, string | number> = {
        action: reviewResolutionForm.action,
        changed_by: currentUserEmail || "frontend-user",
      };

      if (reviewResolutionForm.action === "create_appointment") {
        if (!reviewResolutionForm.patient_id) {
          setMessage("Selecciona un paciente para crear la cita.");
          return;
        }
        payload.patient_id = Number(reviewResolutionForm.patient_id);
        if (!activeReviewItem.doctor_id) {
          if (!reviewResolutionForm.doctor_id) {
            setMessage("Selecciona el doctor para esta resolución.");
            return;
          }
          payload.doctor_id = Number(reviewResolutionForm.doctor_id);
        }
      }

      if (reviewResolutionForm.action === "link_existing") {
        if (!reviewResolutionForm.appointment_id) {
          setMessage("Selecciona una cita existente para vincular.");
          return;
        }
        payload.appointment_id = Number(reviewResolutionForm.appointment_id);
      }

      if (reviewResolutionForm.note.trim()) {
        payload.note = reviewResolutionForm.note.trim();
      }

      await apiPost(`/api/appointment-review-items/${activeReviewItem.id}/resolve`, payload);
      closeReviewResolutionModal();
      await loadData();
      setMessage("Pendiente actualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo resolver el pendiente.");
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
  const activeReceptionists = useMemo(() => receptionists.filter((receptionist) => receptionist.is_active), [receptionists]);
  const inactiveReceptionists = useMemo(() => receptionists.filter((receptionist) => !receptionist.is_active), [receptionists]);
  const activeReviewItem = useMemo(
    () => appointmentReviewItems.find((item) => item.id === activeReviewItemId) ?? null,
    [activeReviewItemId, appointmentReviewItems],
  );
  const activeDispatch = useMemo(
    () => communicationDispatches.find((dispatch) => dispatch.id === activeDispatchStatusId) ?? null,
    [activeDispatchStatusId, communicationDispatches],
  );
  const reviewPatientOptions = useMemo(() => {
    if (!activeReviewItem) {
      return [];
    }
    const normalizedRequestedName = activeReviewItem.patient_name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return data.patients.filter((patient) => {
      const patientName = `${patient.first_name} ${patient.last_name}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return (
        patient.primary_phone === activeReviewItem.phone_number ||
        patientName.includes(normalizedRequestedName) ||
        normalizedRequestedName.includes(patientName)
      );
    });
  }, [activeReviewItem, data.patients]);
  const reviewAppointmentOptions = useMemo(() => {
    if (!activeReviewItem) {
      return [];
    }
    return data.appointments.filter((appointment) => {
      if (activeReviewItem.doctor_id !== null && appointment.doctor_id !== activeReviewItem.doctor_id) {
        return false;
      }
      if (
        activeReviewItem.existing_appointment_id !== null &&
        appointment.id === activeReviewItem.existing_appointment_id
      ) {
        return true;
      }
      const patientName = (appointment.patient_name ?? "").toLowerCase();
      return (
        patientName.includes(activeReviewItem.patient_name.toLowerCase()) ||
        formatDateTime(appointment.scheduled_start) === formatDateTime(activeReviewItem.scheduled_start)
      );
    });
  }, [activeReviewItem, data.appointments]);

  const selectedDoctor = useMemo(
    () =>
      activeDoctors.find(
        (doctor) => String(doctor.id) === doctorFilter || String(doctor.id) === appointmentForm.doctor_id || String(doctor.id) === encounterForm.doctor_id,
      ) ?? activeDoctors[0] ?? null,
    [activeDoctors, appointmentForm.doctor_id, doctorFilter, encounterForm.doctor_id],
  );
  const availableDoctors = activeDoctors;
  const hasSingleDoctorContext = availableDoctors.length === 1;

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
    }
  }, [appointmentForm.doctor_id, availableDoctors, doctorFilter, encounterForm.doctor_id, hasSingleDoctorContext]);

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

  const renderLogin = () => (
    <section className="hero hero-login">
      <div>
        <p className="eyebrow">Do-Control</p>
        <h1>Agenda clínica en un solo lugar</h1>
        <p className="lede">
          Ingresa para ver tu agenda, pacientes, consultas y seguimiento de mensajes en una vista pensada para clínica.
        </p>
      </div>
      <form className="login-form" onSubmit={submitLogin}>
        <input
          type="email"
          value={loginForm.email}
          onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="Correo"
          required
        />
        <input
          type="password"
          value={loginForm.password}
          onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Contraseña"
          required
        />
        <button type="submit">Entrar</button>
      </form>
      {message ? <p className="message-box">{message}</p> : null}
    </section>
  );

  const renderAppointmentBadges = (appointment: Appointment) => {
    const relatedDispatches = communicationDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
    const latestMessageStatus = lastDispatchStatus(relatedDispatches);
    const reviewItem = reviewQueueByAppointmentId.get(appointment.id);

    return <AppointmentBadges appointment={appointment} latestMessageStatus={latestMessageStatus} reviewItem={reviewItem} />;
  };

  const renderFocusedAppointment = () => {
    if (!focusedAppointment) {
      return (
        <article className="card section-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2>Selecciona una cita</h2>
            </div>
          </div>
          <p className="empty-state">Haz clic sobre una cita del calendario para ver historial, mensajes y acciones.</p>
        </article>
      );
    }

    const relatedDispatches = appointmentDispatches[focusedAppointment.id] ?? [];
    const reviewItem = reviewQueueByAppointmentId.get(focusedAppointment.id);

    return (
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Detalle de cita</p>
            <h2>{focusedAppointment.patient_name ?? `Paciente ${focusedAppointment.patient_id}`}</h2>
          </div>
          <span>{formatDateTime(focusedAppointment.scheduled_start)}</span>
        </div>
        <div className="detail-stack">
          <div className="detail-panel">
            <strong>{focusedAppointment.doctor_name ?? `Doctor ${focusedAppointment.doctor_id}`}</strong>
            <span>{appointmentTypeLabel(focusedAppointment.appointment_type)}</span>
            <span>{appointmentStatusLabel(focusedAppointment.status)}</span>
            {renderAppointmentBadges(focusedAppointment)}
            {reviewItem ? (
              <div className="timeline-item">
                <strong>{reviewReasonLabel(reviewItem.review_reason)}</strong>
                <span>{reviewItem.review_message}</span>
                <span>Horario solicitado: {formatDateTime(reviewItem.scheduled_start)}</span>
              </div>
            ) : null}
            {canManageAppointments ? (
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={() => updateAppointmentStatus(focusedAppointment.id, "confirmed")}>
                  Confirmar
                </button>
                <button type="button" className="secondary-button" onClick={() => updateAppointmentStatus(focusedAppointment.id, "cancelled")}>
                  Cancelar
                </button>
                <button type="button" className="secondary-button" onClick={() => updateAppointmentStatus(focusedAppointment.id, "completed")}>
                  Completar
                </button>
              </div>
            ) : null}
          </div>
          <div className="detail-panel">
            <strong>Historial</strong>
            {appointmentHistory[focusedAppointment.id]?.length ? (
              appointmentHistory[focusedAppointment.id].map((entry) => (
                <div className="timeline-item" key={`history-${entry.id}`}>
                  <strong>
                    {appointmentStatusLabel(entry.old_status ?? "scheduled")} → {appointmentStatusLabel(entry.new_status)}
                  </strong>
                  <span>{formatDateTime(entry.created_at)}</span>
                  <span>{entry.change_reason ?? "Sin observación"}</span>
                </div>
              ))
            ) : (
              <p className="empty-state">Sin movimientos registrados.</p>
            )}
          </div>
          <div className="detail-panel">
            <strong>Mensajes relacionados</strong>
            {relatedDispatches.length ? (
              relatedDispatches.map((dispatch) => (
                <div className="timeline-item" key={`dispatch-${dispatch.id}`}>
                  <strong>{dispatch.template_title ?? "Mensaje"}</strong>
                  <span>{dispatchStatusLabel(dispatch.status)} · {formatDateTime(dispatch.created_at)}</span>
                  <span>{dispatch.rendered_message ?? "Sin contenido generado."}</span>
                  {canViewGlobalCommunications ? (
                    <div className="row-actions">
                      <button type="button" className="secondary-button" onClick={() => toggleDispatchAttempts(dispatch.id)}>
                        {expandedDispatchId === dispatch.id ? "Ocultar intentos" : "Ver intentos"}
                      </button>
                    </div>
                  ) : null}
                  {expandedDispatchId === dispatch.id ? (
                    <div className="attempt-list">
                      {dispatchAttempts[dispatch.id]?.length ? (
                        dispatchAttempts[dispatch.id].map((attempt) => (
                          <div className="timeline-item" key={`attempt-${attempt.id}`}>
                            <strong>{dispatchStatusLabel(attempt.result_status)}</strong>
                            <span>{formatDateTime(attempt.attempted_at)}</span>
                            <span>{attempt.error_message ?? "Sin error"}</span>
                          </div>
                        ))
                      ) : (
                        <p className="empty-state">Sin intentos registrados.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="empty-state">Esta cita todavía no tiene mensajes ligados.</p>
            )}
          </div>
        </div>
      </article>
    );
  };

  const renderAgendaTab = () => (
    <section className="tab-layout">
      <section className="headline-strip span-three">
        <div className="headline-card" title="Cantidad de citas mostradas según la vista del calendario y filtros activos.">
          <strong>{filteredAppointments.length}</strong>
          <span>Citas visibles</span>
        </div>
        <div className="headline-card" title="Citas que todavía están pendientes de confirmación manual o por integración.">
          <strong>{filteredAppointments.filter((item) => item.confirmation_status === "pending").length}</strong>
          <span>Por confirmar</span>
        </div>
        <div className="headline-card" title="Total de consultas clínicas registradas en el sistema.">
          <strong>{data.encounters.length}</strong>
          <span>Consultas</span>
        </div>
        <div className="headline-card" title="Archivos clínicos del paciente seleccionado actualmente.">
          <strong>{selectedSummary?.attachments.length ?? 0}</strong>
          <span>Archivos</span>
        </div>
      </section>
      <article className="card section-card span-three">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Resumen</p>
            <h2>Vista rápida</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card" title="Cantidad de citas visibles dentro de la vista actual del calendario.">
            <strong>{filteredAppointments.length}</strong>
            <span>Citas en la vista actual</span>
          </div>
          <div className="metric-card" title="Citas que siguen pendientes de confirmar.">
            <strong>{filteredAppointments.filter((item) => item.confirmation_status === "pending").length}</strong>
            <span>Pendientes de confirmar</span>
          </div>
          <div className="metric-card" title="Casos enviados a revisión manual que aún requieren una decisión.">
            <strong>{appointmentReviewItems.length}</strong>
            <span>Casos por revisar</span>
          </div>
        </div>
        <div className="calendar-legend">
          <span className="legend-title">Colores</span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-default" />
            Cita normal
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-confirmed" />
            Cita confirmada
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-ws" />
            Cita desde WhatsApp
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch-cancelled" />
            Cita cancelada
          </span>
        </div>
      </article>
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Calendario clínico</h2>
          </div>
          <div className="toolbar-inline">
            <button type="button" className="secondary-button" onClick={goToPreviousRange}>
              Anterior
            </button>
            <button type="button" className="secondary-button" onClick={goToToday}>
              Hoy
            </button>
            <button type="button" className="secondary-button" onClick={goToNextRange}>
              Siguiente
            </button>
          </div>
        </div>
        <div className="toolbar-row">
          <strong>{calendarRangeLabel(calendarView, calendarDate)}</strong>
          <div className="chip-row">
            {(["dia", "semana", "mes"] as CalendarView[]).map((view) => (
              <button
                key={view}
                type="button"
                className={`filter-chip ${calendarView === view ? "filter-chip-active" : ""}`}
                onClick={() => setCalendarView(view)}
              >
                {view[0].toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
          <div className="toolbar-inline">
            {isAdmin ? (
              <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>
                <option value="">Todos los doctores</option>
                {availableDoctors.map((doctor) => (
                  <option key={`doctor-filter-${doctor.id}`} value={doctor.id}>
                    {doctor.first_name} {doctor.last_name}
                  </option>
                ))}
              </select>
            ) : availableDoctors.length > 1 ? (
              <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>
                <option value="">Selecciona doctor</option>
                {availableDoctors.map((doctor) => (
                  <option key={`doctor-scope-${doctor.id}`} value={doctor.id}>
                    {doctor.first_name} {doctor.last_name}
                  </option>
                ))}
              </select>
            ) : selectedDoctor ? (
              <div className="context-pill">Doctor: {selectedDoctor.first_name} {selectedDoctor.last_name}</div>
            ) : null}
            {!isAdmin && availableDoctors.length > 1 ? (
              <div className="context-pill">Recepción con {availableDoctors.length} doctores asignados</div>
            ) : null}
            <div className="chip-row">
              <button
                type="button"
                className={`filter-chip filter-chip-all ${appointmentFilter === "all" ? "filter-chip-active" : ""}`}
                onClick={() => setAppointmentFilter("all")}
              >
                Todas
              </button>
              <button
                type="button"
                className={`filter-chip filter-chip-ws ${appointmentFilter === "ws" ? "filter-chip-active" : ""}`}
                onClick={() => setAppointmentFilter("ws")}
              >
                WhatsApp
              </button>
              <button
                type="button"
                className={`filter-chip filter-chip-confirmed ${appointmentFilter === "confirmed" ? "filter-chip-active" : ""}`}
                onClick={() => setAppointmentFilter("confirmed")}
              >
                Confirmadas
              </button>
              <button
                type="button"
                className={`filter-chip filter-chip-pending ${appointmentFilter === "pending_confirmation" ? "filter-chip-active" : ""}`}
                onClick={() => setAppointmentFilter("pending_confirmation")}
              >
                Por confirmar
              </button>
              <button
                type="button"
                className={`filter-chip filter-chip-attention ${appointmentFilter === "needs_attention" ? "filter-chip-active" : ""}`}
                onClick={() => setAppointmentFilter("needs_attention")}
              >
                Requieren atención
              </button>
            </div>
          </div>
        </div>
        <AgendaCalendar
          calendarView={calendarView}
          calendarDate={calendarDate}
          monthDays={monthDays}
          agendaDays={agendaDays}
          slotLabels={slotLabels}
          appointmentsByDayKey={appointmentsByDayKey}
          onSelectAppointment={toggleAppointmentHistory}
          calendarMetrics={calendarMetrics}
        />
      </article>
      <div className="agenda-side-stack">
        {renderFocusedAppointment()}
        <article className="card section-card">
          {canManageAppointments ? (
            <form className="form-card compact-form" onSubmit={submitAppointment}>
              <h3>Nueva cita</h3>
              <label>
                <span>Paciente</span>
                <select
                  value={appointmentForm.patient_id}
                  onChange={(event) => setAppointmentForm((current) => ({ ...current, patient_id: event.target.value }))}
                  required
                >
                  <option value="">Seleccionar</option>
                  {data.patients.map((patient) => (
                    <option key={`appointment-patient-${patient.id}`} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </option>
                  ))}
                </select>
              </label>
              {isAdmin || availableDoctors.length > 1 ? (
                <label>
                  <span>Doctor</span>
                  <select
                    value={appointmentForm.doctor_id}
                    onChange={(event) => setAppointmentForm((current) => ({ ...current, doctor_id: event.target.value }))}
                    required
                  >
                    <option value="">{isAdmin ? "Seleccionar" : "Selecciona doctor"}</option>
                    {availableDoctors.map((doctor) => (
                      <option key={`appointment-doctor-${doctor.id}`} value={doctor.id}>
                        {doctor.first_name} {doctor.last_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : selectedDoctor ? (
                <label>
                  <span>Doctor</span>
                  <input value={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`} readOnly />
                </label>
              ) : null}
              <label>
                <span>Inicio</span>
                <input
                  type="datetime-local"
                  value={appointmentForm.scheduled_start}
                  onChange={(event) => setAppointmentForm((current) => ({ ...current, scheduled_start: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Fin</span>
                <input
                  type="datetime-local"
                  value={appointmentForm.scheduled_end}
                  onChange={(event) => setAppointmentForm((current) => ({ ...current, scheduled_end: event.target.value }))}
                  required
                />
              </label>
              <button type="submit">Guardar cita</button>
            </form>
          ) : (
            <p className="empty-state">Desde aquí puedes revisar la agenda y abrir el detalle de cada cita.</p>
          )}
        </article>
      </div>
    </section>
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
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Ficha del paciente</p>
            <h2>{selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : "Selecciona un paciente"}</h2>
          </div>
          {canManagePatients ? (
            <div className="section-action-panel">
              <button
                type="button"
                className="secondary-button"
                onClick={() => selectedSummary && setActiveSectionAction("patient_edit")}
                disabled={!selectedSummary}
              >
                Editar datos paciente
              </button>
            </div>
          ) : null}
        </div>
        {selectedSummary ? (
          <div className="detail-stack">
            <div className="summary-grid">
              <div className="metric-card">
                <strong>{selectedSummary.patient.medical_record_number}</strong>
                <span>Expediente</span>
              </div>
              <div className="metric-card">
                <strong>{selectedSummary.appointments.length}</strong>
                <span>Citas</span>
              </div>
              <div className="metric-card">
                <strong>{selectedSummary.encounters.length}</strong>
                <span>Consultas</span>
              </div>
            </div>
            <div className="detail-panel compact-panel">
              <strong>Datos principales</strong>
              <div className="two-column-grid">
                <span>Nombre: {selectedSummary.patient.first_name} {selectedSummary.patient.last_name}</span>
                <span>Teléfono: {selectedSummary.patient.primary_phone}</span>
                <span>DPI: {selectedSummary.patient.national_id ?? "Sin registro"}</span>
                <span>Estado: {selectedSummary.patient.is_active ? "Activo" : "Inactivo"}</span>
              </div>
            </div>
            <div className="two-column-grid">
              <div className="detail-panel">
                <strong>Próximas citas</strong>
                {(selectedSummary.appointments ?? []).length ? (
                  selectedSummary.appointments.map((appointment) => (
                    <button
                      type="button"
                      className="simple-list-item"
                      key={`summary-appointment-${appointment.id}`}
                      onClick={() => {
                        setActiveTab("agenda");
                        toggleAppointmentHistory(appointment.id);
                      }}
                    >
                      <strong>{formatDateTime(appointment.scheduled_start)}</strong>
                      <span>{appointment.doctor_name ?? `Doctor ${appointment.doctor_id}`}</span>
                      <span>
                        {appointmentTypeLabel(appointment.appointment_type)} · {appointmentStatusLabel(appointment.status)}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="empty-state">Sin citas registradas.</p>
                )}
              </div>
              <div className="detail-panel">
                <strong>Consultas</strong>
                {sortedPatientEncounters.length ? (
                  sortedPatientEncounters.map((encounter) => {
                    const encounterAttachments = selectedSummary.attachments.filter(
                      (attachment) => attachment.encounter_id === encounter.id,
                    );
                    const isExpanded = expandedEncounterId === encounter.id;

                    return (
                      <div key={`summary-encounter-${encounter.id}`}>
                        <button
                          type="button"
                          className="simple-list-item"
                          onClick={() => setExpandedEncounterId((current) => (current === encounter.id ? null : encounter.id))}
                        >
                          <strong>{encounterTypeLabel(encounter.encounter_type)}</strong>
                          <span>{formatDateTime(encounter.encounter_date)}</span>
                          <span>{encounter.chief_complaint}</span>
                          <span>{isExpanded ? "Ocultar detalle" : "Ver detalle clínico"}</span>
                        </button>
                        {isExpanded ? (
                          <div className="encounter-history-card">
                            <div className="encounter-history-grid">
                              <div className="timeline-item">
                                <strong>Motivo</strong>
                                <span>{encounter.chief_complaint}</span>
                              </div>
                              <div className="timeline-item">
                                <strong>Estado</strong>
                                <span>{appointmentStatusLabel(encounter.status)}</span>
                              </div>
                            </div>
                            <div className="encounter-history-grid">
                              <div className="timeline-item">
                                <strong>Diagnósticos</strong>
                                {(encounter.diagnoses ?? []).length ? (
                                  (encounter.diagnoses ?? []).map((diagnosis) => (
                                    <span key={`diagnosis-read-${diagnosis.id ?? diagnosis.diagnosis_text}`}>
                                      {diagnosis.diagnosis_text}
                                      {diagnosis.diagnosis_code ? ` · ${diagnosis.diagnosis_code}` : ""}
                                    </span>
                                  ))
                                ) : (
                                  <span>Sin diagnósticos registrados.</span>
                                )}
                              </div>
                              <div className="timeline-item">
                                <strong>Órdenes de examen</strong>
                                {(encounter.exam_orders ?? []).length ? (
                                  (encounter.exam_orders ?? []).map((exam) => (
                                    <span key={`exam-read-${exam.id ?? exam.exam_name}`}>
                                      {exam.exam_name}
                                      {exam.status ? ` · ${dispatchStatusLabel(exam.status)}` : ""}
                                    </span>
                                  ))
                                ) : (
                                  <span>Sin exámenes registrados.</span>
                                )}
                              </div>
                            </div>
                            <div className="encounter-history-grid">
                              <div className="timeline-item">
                                <strong>Receta</strong>
                                {encounter.prescription?.items?.length ? (
                                  encounter.prescription.items.map((item) => (
                                    <span key={`prescription-read-${item.id ?? item.medication_name}`}>
                                      {item.medication_name}
                                      {item.dosage ? ` · ${item.dosage}` : ""}
                                      {item.frequency ? ` · ${item.frequency}` : ""}
                                    </span>
                                  ))
                                ) : (
                                  <span>Sin receta registrada.</span>
                                )}
                              </div>
                              <div className="timeline-item">
                                <strong>Adjuntos</strong>
                                {encounterAttachments.length ? (
                                  encounterAttachments.map((attachment) => (
                                    <button
                                      type="button"
                                      key={`encounter-attachment-${attachment.id}`}
                                      className="secondary-button align-start"
                                      onClick={() => openAttachment(attachment.id)}
                                    >
                                      {attachment.file_name}
                                    </button>
                                  ))
                                ) : (
                                  <span>Sin adjuntos en esta consulta.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="empty-state">Sin consultas registradas.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="empty-state">Selecciona un paciente para ver su expediente.</p>
        )}
      </article>
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
                <span>Paciente</span>
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
              {isAdmin || availableDoctors.length > 1 ? (
                <label>
                  <span>Doctor</span>
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
              <label>
                <span>Fecha</span>
                <input
                  type="datetime-local"
                  value={encounterForm.encounter_date}
                  onChange={(event) => setEncounterForm((current) => ({ ...current, encounter_date: event.target.value }))}
                  required
                />
              </label>
            </div>
            <label>
              <span>Motivo de consulta</span>
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
                  <button type="button" className="secondary-button" onClick={() => closeEncounter(encounter.id)}>
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
    <section className="tab-layout">
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Paciente</p>
            <h2>Filtro de comunicaciones</h2>
          </div>
        </div>
        <label>
          <span>Paciente seleccionado</span>
          <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
            <option value="">Seleccionar paciente</option>
            {data.patients.map((patient) => (
              <option key={`message-patient-${patient.id}`} value={patient.id}>
                {patient.first_name} {patient.last_name} · {patient.medical_record_number}
              </option>
            ))}
          </select>
        </label>
        <p className="empty-state">
          Esta vista muestra las comunicaciones del paciente seleccionado, no una conversación global de todos los pacientes.
        </p>
      </article>
      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Mensajes</p>
            <h2>Timeline del paciente</h2>
          </div>
        </div>
        {selectedSummary ? (
          <>
            <div className="detail-panel compact-panel">
              <strong>
                {selectedSummary.patient.first_name} {selectedSummary.patient.last_name}
              </strong>
              <span>{selectedSummary.patient.medical_record_number}</span>
              <span>{selectedSummary.patient.primary_phone}</span>
            </div>
            <div className="table-list">
              {selectedPatientDispatches.length ? (
                selectedPatientDispatches.map((dispatch) => (
                  <div className="timeline-item" key={`patient-dispatch-${dispatch.id}`}>
                    <div className="row-actions">
                      <strong>{communicationKindLabel(dispatch)}</strong>
                      <span className={`badge ${
                        dispatch.status === "failed"
                          ? "badge-danger"
                          : dispatch.status === "delivered"
                            ? "badge-success"
                            : dispatch.status === "pending"
                              ? "badge-warn"
                              : "badge-neutral"
                      }`}>
                        {dispatchStatusLabel(dispatch.status)}
                      </span>
                    </div>
                    <span>
                      {dispatch.template_title ?? "Mensaje clínico"}
                      {dispatch.doctor_name ? ` · ${dispatch.doctor_name}` : ""}
                    </span>
                    <span>
                      {dispatch.appointment_scheduled_start
                        ? `Cita: ${formatDateTime(dispatch.appointment_scheduled_start)}`
                        : formatDateTime(dispatch.created_at)}
                    </span>
                    <div className="message-preview">{dispatch.rendered_message ?? "Sin texto generado."}</div>
                    {dispatch.error_message ? <span>Error: {dispatch.error_message}</span> : null}
                  </div>
                ))
              ) : (
                <p className="empty-state">Este paciente todavía no tiene comunicaciones registradas.</p>
              )}
            </div>
          </>
        ) : (
          <p className="empty-state">Selecciona un paciente en la pestaña Pacientes para ver su timeline de comunicaciones.</p>
        )}
      </article>
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Citas</p>
            <h2>Eventos de cita</h2>
          </div>
        </div>
        {selectedSummary ? (
          <div className="table-list">
            {selectedSummary.appointments.length ? (
              selectedSummary.appointments.map((appointment) => {
                const relatedDispatches = selectedPatientDispatches.filter((dispatch) => dispatch.appointment_id === appointment.id);
                return (
                  <button
                    type="button"
                    className="simple-list-item"
                    key={`message-appointment-${appointment.id}`}
                    onClick={() => {
                      setActiveTab("agenda");
                      toggleAppointmentHistory(appointment.id);
                    }}
                  >
                    <strong>{formatDateTime(appointment.scheduled_start)}</strong>
                    <span>{appointmentTypeLabel(appointment.appointment_type)}</span>
                    <span>{confirmationLabel(appointment.confirmation_status)}</span>
                    <span>{relatedDispatches.length ? `${relatedDispatches.length} mensajes ligados` : "Sin mensajes ligados"}</span>
                  </button>
                );
              })
            ) : (
              <p className="empty-state">Este paciente no tiene citas registradas.</p>
            )}
          </div>
        ) : (
          <p className="empty-state">Selecciona un paciente para relacionar mensajes con sus citas.</p>
        )}
      </article>
      {canViewGlobalCommunications ? (
        <article className="card section-card span-three">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Seguimiento operativo</p>
              <h2>Comunicaciones recientes</h2>
            </div>
            {isAdmin ? (
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={generateDispatchesNow}>
                  Generar ahora
                </button>
                <button type="button" className="secondary-button" onClick={requeueVisibleFailedDispatches}>
                  Reenviar fallidos
                </button>
              </div>
            ) : null}
          </div>
          {communicationDispatchSummary ? (
            <div className="summary-grid">
              <div className="metric-card">
                <strong>{communicationDispatchSummary.total}</strong>
                <span>Total</span>
              </div>
              <div className="metric-card">
                <strong>{communicationDispatchSummary.pending}</strong>
                <span>Pendientes</span>
              </div>
              <div className="metric-card">
                <strong>{communicationDispatchSummary.failed}</strong>
                <span>Fallidos</span>
              </div>
            </div>
          ) : null}
          <div className="toolbar-row">
            <div className="toolbar-inline">
              <select
                value={dispatchFilters.status_filter}
                onChange={(event) => setDispatchFilters((current) => ({ ...current, status_filter: event.target.value }))}
              >
                <option value="">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="sent">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="failed">Fallido</option>
              </select>
              <select
                value={dispatchFilters.channel}
                onChange={(event) => setDispatchFilters((current) => ({ ...current, channel: event.target.value }))}
              >
                <option value="">Todos los canales</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Correo</option>
              </select>
            </div>
            <input
              className="search-input compact-input"
              value={dispatchFilters.query}
              onChange={(event) => setDispatchFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Buscar por teléfono, referencia o error"
            />
          </div>
          <div className="table-list">
            {communicationDispatches.map((dispatch) => (
              <div className="simple-list-item" key={`dispatch-${dispatch.id}`}>
                <strong>
                  {dispatch.patient_name ?? `Paciente ${dispatch.patient_id}`} · {communicationKindLabel(dispatch)}
                </strong>
                <span>{dispatch.doctor_name ?? "Sin doctor"} · {formatDateTime(dispatch.created_at)}</span>
                <span>{dispatchStatusLabel(dispatch.status)} · {dispatch.recipient_phone}</span>
                <span>{dispatch.error_message ?? dispatch.rendered_message ?? "Sin observación."}</span>
                <div className="row-actions">
                  <button type="button" className="secondary-button" onClick={() => toggleDispatchAttempts(dispatch.id)}>
                    {expandedDispatchId === dispatch.id ? "Ocultar intentos" : "Ver intentos"}
                  </button>
                  {isAdmin && dispatch.status !== "delivered" ? (
                    <button type="button" className="secondary-button" onClick={() => updateDispatchStatus(dispatch.id, "delivered")}>
                      Marcar entregado
                    </button>
                  ) : null}
                  {isAdmin && dispatch.status !== "failed" ? (
                    <button type="button" className="secondary-button" onClick={() => updateDispatchStatus(dispatch.id, "failed")}>
                      Marcar fallido
                    </button>
                  ) : null}
                  {isAdmin && dispatch.status === "failed" ? (
                    <button type="button" className="secondary-button" onClick={() => requeueDispatch(dispatch.id)}>
                      Reenviar
                    </button>
                  ) : null}
                </div>
                {expandedDispatchId === dispatch.id ? (
                  <div className="attempt-list">
                    {dispatchAttempts[dispatch.id]?.length ? (
                      dispatchAttempts[dispatch.id].map((attempt) => (
                        <div className="timeline-item" key={`dispatch-attempt-${attempt.id}`}>
                          <strong>{dispatchStatusLabel(attempt.result_status)}</strong>
                          <span>{formatDateTime(attempt.attempted_at)}</span>
                          <span>{attempt.error_message ?? "Sin error"}</span>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">Sin intentos registrados.</p>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
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

    return (
      <section className="tab-layout">
        <article className="card section-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Pendientes</p>
              <h2>Revisión manual</h2>
            </div>
          </div>
          <div className="table-list">
            {appointmentReviewItems.length ? (
              appointmentReviewItems.map((item) => (
                <div className="simple-list-item" key={`review-item-${item.id}`}>
                  <strong>{item.patient_name}</strong>
                  <span>{item.doctor_name ?? item.doctor_phone_number ?? "Doctor pendiente"}</span>
                  <span>{formatDateTime(item.scheduled_start)}</span>
                  <span>{reviewReasonLabel(item.review_reason)}</span>
                  <span>{item.review_message}</span>
                  <div className="row-actions">
                    <button type="button" className="secondary-button" onClick={() => resolveReviewItem(item.id, "create_appointment")}>
                      Crear cita
                    </button>
                    <button type="button" className="secondary-button" onClick={() => resolveReviewItem(item.id, "link_existing")}>
                      Vincular cita
                    </button>
                    <button type="button" className="secondary-button" onClick={() => resolveReviewItem(item.id, "reject")}>
                      Rechazar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No hay propuestas pendientes de revisión manual.</p>
            )}
          </div>
        </article>
        <article className="card section-card span-two">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Atención del día</p>
              <h2>Citas que requieren seguimiento</h2>
            </div>
          </div>
          <div className="table-list">
            {attentionAppointments.length ? (
              attentionAppointments.map((appointment) => (
                <button
                  type="button"
                  className="simple-list-item"
                  key={`attention-appointment-${appointment.id}`}
                  onClick={() => {
                    setActiveTab("agenda");
                    toggleAppointmentHistory(appointment.id);
                  }}
                >
                  <strong>{appointment.patient_name ?? `Paciente ${appointment.patient_id}`}</strong>
                  <span>{appointment.doctor_name ?? `Doctor ${appointment.doctor_id}`}</span>
                  <span>{formatDateTime(appointment.scheduled_start)}</span>
                  {renderAppointmentBadges(appointment)}
                </button>
              ))
            ) : (
              <p className="empty-state">No hay citas marcadas con atención especial.</p>
            )}
          </div>
        </article>
      </section>
    );
  };

  const renderGestionTab = () => (
    <section className="tab-layout">
      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Configuración</p>
            <h2>Mensaje de confirmación</h2>
          </div>
          {selectedDoctor ? <div className="context-pill">Doctor: {selectedDoctor.first_name} {selectedDoctor.last_name}</div> : null}
        </div>
        <form className="form-card compact-form" onSubmit={saveConfirmationTemplate}>
          <label>
            <span>Título interno</span>
            <input
              value={templateForm.title}
              onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))}
              placeholder={DEFAULT_CONFIRMATION_TITLE}
            />
          </label>
          <label>
            <span>Mensaje</span>
            <textarea
              value={templateForm.body}
              onChange={(event) => setTemplateForm((current) => ({ ...current, body: event.target.value }))}
              placeholder={DEFAULT_CONFIRMATION_BODY}
              required
            />
          </label>
          <p className="empty-state">
            Variables disponibles: {"{patient_name}"}, {"{doctor_name}"}, {"{appointment_date}"} y {"{appointment_time}"}.
          </p>
          {templatePreview ? <div className="message-preview">{templatePreview.rendered_message}</div> : null}
          <div className="row-actions">
            <button type="button" className="secondary-button" onClick={previewConfirmationTemplate}>
              Vista previa
            </button>
            <button type="submit">Guardar mensaje</button>
          </div>
        </form>
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Resumen</p>
            <h2>Seguimiento de recordatorios</h2>
          </div>
        </div>
        <div className="summary-grid">
          <div className="metric-card" title="Citas futuras con reglas activas de recordatorio.">
            <strong>{remindersScheduledCount}</strong>
            <span>Recordatorios por enviar</span>
          </div>
          <div className="metric-card" title="Citas futuras que ya quedaron confirmadas.">
            <strong>{confirmedUpcomingCount}</strong>
            <span>Confirmadas</span>
          </div>
          <div className="metric-card" title="Citas futuras que aún están pendientes de respuesta.">
            <strong>{unconfirmedUpcomingCount}</strong>
            <span>Sin confirmar</span>
          </div>
          <div className="metric-card" title="Citas futuras canceladas que siguen en agenda histórica.">
            <strong>{cancelledUpcomingCount}</strong>
            <span>Canceladas</span>
          </div>
        </div>
        <div className="table-list">
          {scopedUpcomingAppointments.slice(0, 6).map((appointment) => (
            <button
              type="button"
              className="simple-list-item"
              key={`gestion-upcoming-${appointment.id}`}
              onClick={() => {
                setActiveTab("agenda");
                toggleAppointmentHistory(appointment.id);
              }}
            >
              <strong>{appointment.patient_name ?? `Paciente ${appointment.patient_id}`}</strong>
              <span>{formatDateTime(appointment.scheduled_start)}</span>
              {renderAppointmentBadges(appointment)}
            </button>
          ))}
          {!scopedUpcomingAppointments.length ? <p className="empty-state">No hay citas futuras para este doctor.</p> : null}
        </div>
      </article>

      <article className="card section-card">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Configuración</p>
            <h2>Recordatorios automáticos</h2>
          </div>
        </div>
        <form className="form-card compact-form" onSubmit={submitReminderRule}>
          {isAdmin ? (
            <label>
              <span>Doctor</span>
              <select
                value={reminderRuleForm.doctor_id}
                onChange={(event) => setReminderRuleForm((current) => ({ ...current, doctor_id: event.target.value }))}
              >
                <option value="">Todos</option>
                {data.doctors.map((doctor) => (
                  <option key={`reminder-doctor-${doctor.id}`} value={doctor.id}>
                    {doctor.first_name} {doctor.last_name}
                  </option>
                ))}
              </select>
            </label>
          ) : selectedDoctor ? (
            <label>
              <span>Doctor</span>
              <input value={`${selectedDoctor.first_name} ${selectedDoctor.last_name}`} readOnly />
            </label>
          ) : null}
          <label>
            <span>Minutos antes de la cita</span>
            <input
              type="number"
              value={reminderRuleForm.minutes_before}
              onChange={(event) => setReminderRuleForm((current) => ({ ...current, minutes_before: event.target.value }))}
            />
          </label>
          <button type="submit">Guardar regla</button>
        </form>
        <div className="table-list">
          {reminderRules
            .filter((rule) => scopedDoctorId === null || rule.doctor_id === null || rule.doctor_id === scopedDoctorId)
            .map((rule) => (
              <div className="simple-list-item" key={`reminder-${rule.id}`}>
                <strong>{rule.is_active ? "Recordatorio activo" : "Recordatorio inactivo"}</strong>
                <span>{rule.minutes_before} minutos antes</span>
                <span>{rule.doctor_id ? "Doctor actual" : "General"}</span>
                <button type="button" className="secondary-button" onClick={() => toggleReminderRule(rule)}>
                  {rule.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            ))}
          {!reminderRules.length ? <p className="empty-state">Todavía no hay reglas de recordatorio configuradas.</p> : null}
        </div>
      </article>

      <article className="card section-card span-two">
        <div className="subsection-header">
          <div>
            <p className="eyebrow">Configuración</p>
            <h2>Mensajes activos</h2>
          </div>
        </div>
        <div className="table-list">
          {communicationTemplates
            .filter((template) => scopedDoctorId === null || template.doctor_id === null || template.doctor_id === scopedDoctorId)
            .map((template) => (
              <div className="simple-list-item" key={`template-${template.id}`}>
                <strong>{template.title}</strong>
                <span>{template.template_key === CONFIRMATION_TEMPLATE_KEY ? "Mensaje de confirmación" : "Mensaje automático"}</span>
                <span>{template.is_active ? "Activo" : "Inactivo"}</span>
                <div className="message-preview">{template.body}</div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setTemplateForm({
                        doctor_id: template.doctor_id ? String(template.doctor_id) : "",
                        channel: template.channel,
                        template_key: template.template_key,
                        title: template.title,
                        body: template.body,
                        is_active: template.is_active,
                      })
                    }
                  >
                    Usar como base
                  </button>
                  <button type="button" className="secondary-button" onClick={() => toggleTemplate(template)}>
                    {template.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          {!communicationTemplates.length ? <p className="empty-state">Todavía no hay mensajes configurados.</p> : null}
        </div>
      </article>

      {isAdmin ? (
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
                <span>Nombres</span>
                <input
                  value={doctorAdminForm.first_name}
                  onChange={(event) => setDoctorAdminForm((current) => ({ ...current, first_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Apellidos</span>
                <input
                  value={doctorAdminForm.last_name}
                  onChange={(event) => setDoctorAdminForm((current) => ({ ...current, last_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Género</span>
                <select value={doctorAdminForm.gender} onChange={(event) => setDoctorAdminForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label>
                <span>Teléfono principal</span>
                <input
                  value={doctorAdminForm.primary_phone}
                  onChange={(event) => setDoctorAdminForm((current) => ({ ...current, primary_phone: event.target.value }))}
                />
              </label>
              <label>
                <span>Especialidad</span>
                <input
                  value={doctorAdminForm.specialty}
                  onChange={(event) => setDoctorAdminForm((current) => ({ ...current, specialty: event.target.value }))}
                />
              </label>
              <label>
                <span>Colegiado</span>
                <input
                  value={doctorAdminForm.license_number}
                  onChange={(event) => setDoctorAdminForm((current) => ({ ...current, license_number: event.target.value }))}
                />
              </label>
              <label>
                <span>Correo de acceso</span>
                <input
                  type="email"
                  value={doctorAdminForm.user_email}
                  onChange={(event) => setDoctorAdminForm((current) => ({ ...current, user_email: event.target.value }))}
                  disabled={editingDoctorId !== null}
                />
              </label>
              <label>
                <span>{editingDoctorId ? "Nueva contraseña" : "Contraseña inicial"}</span>
                <input
                  type="password"
                  value={doctorAdminForm.user_password}
                  onChange={(event) => setDoctorAdminForm((current) => ({ ...current, user_password: event.target.value }))}
                />
              </label>
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
      ) : null}

      {isAdmin ? (
        <article className="card section-card span-two">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Equipo clínico</p>
              <h2>{editingReceptionistId ? "Editar recepcionista" : "Registrar recepcionista"}</h2>
            </div>
          </div>
          <form className="form-card compact-form" onSubmit={submitReceptionist}>
            <div className="two-column-grid">
              <label>
                <span>Nombres</span>
                <input
                  value={receptionistForm.first_name}
                  onChange={(event) => setReceptionistForm((current) => ({ ...current, first_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Apellidos</span>
                <input
                  value={receptionistForm.last_name}
                  onChange={(event) => setReceptionistForm((current) => ({ ...current, last_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Género</span>
                <select value={receptionistForm.gender} onChange={(event) => setReceptionistForm((current) => ({ ...current, gender: event.target.value }))}>
                  <option value="female">Femenino</option>
                  <option value="male">Masculino</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label>
                <span>Teléfono</span>
                <input
                  value={receptionistForm.phone_number}
                  onChange={(event) => setReceptionistForm((current) => ({ ...current, phone_number: event.target.value }))}
                />
              </label>
              <label>
                <span>Correo</span>
                <input
                  type="email"
                  value={receptionistForm.email}
                  onChange={(event) => setReceptionistForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  disabled={editingReceptionistId !== null}
                />
              </label>
              <label>
                <span>{editingReceptionistId ? "Nueva contraseña" : "Contraseña inicial"}</span>
                <input
                  type="password"
                  value={receptionistForm.password}
                  onChange={(event) => setReceptionistForm((current) => ({ ...current, password: event.target.value }))}
                  required={editingReceptionistId === null}
                />
              </label>
            </div>
            <div className="subsection">
              <strong>Doctores asignados</strong>
              <div className="table-list">
                {data.doctors.map((doctor) => (
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
                    <strong>
                      {doctor.first_name} {doctor.last_name}
                    </strong>
                    <span>{doctor.specialty ?? "Sin especialidad"}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="row-actions">
              {editingReceptionistId ? (
                <button type="button" className="secondary-button" onClick={resetReceptionistForm}>
                  Cancelar edición
                </button>
              ) : null}
              <button type="submit">{editingReceptionistId ? "Actualizar recepcionista" : "Registrar recepcionista"}</button>
            </div>
          </form>
        </article>
      ) : null}

      {isAdmin ? (
        <article className="card section-card span-three">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Equipo clínico</p>
              <h2>Doctores y recepcionistas</h2>
            </div>
          </div>
          <div className="table-list">
            <div className="simple-list-item">
              <strong>Doctores activos</strong>
              <span>{activeDoctors.length} registrados para agenda y operación diaria.</span>
            </div>
            {activeDoctors.map((doctor) => (
              <div className="simple-list-item" key={`doctor-team-${doctor.id}`}>
                <strong>
                  {doctor.first_name} {doctor.last_name}
                </strong>
                <span>{doctor.specialty ?? "Sin especialidad"}</span>
                <span>{doctor.gender === "female" ? "Femenino" : doctor.gender === "male" ? "Masculino" : "Sin género"}</span>
                <span>{doctor.phone_numbers?.find((phone) => phone.is_primary)?.phone_number ?? "Sin teléfono"}</span>
                <span>{doctor.linked_user_email ?? "Sin usuario de acceso"}</span>
                <span>{doctor.is_active ? "Activo" : "Inactivo"}</span>
                <span>
                  {doctor.assigned_receptionists?.length
                    ? `Recepción: ${doctor.assigned_receptionists.map((item) => `${item.first_name} ${item.last_name}`).join(", ")}`
                    : "Sin recepcionista asignada"}
                </span>
                <div className="row-actions">
                  <button type="button" className="secondary-button" onClick={() => startDoctorEdit(doctor)}>
                    Editar
                  </button>
                  <button type="button" className="secondary-button" onClick={() => toggleDoctorActive(doctor)}>
                    {doctor.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
            {!activeDoctors.length ? <p className="empty-state">No hay doctores activos registrados.</p> : null}
            <div className="simple-list-item">
              <strong>Recepcionistas activas</strong>
              <span>{activeReceptionists.length} disponibles para gestionar agenda y pacientes.</span>
            </div>
            {activeReceptionists.length ? (
              activeReceptionists.map((receptionist) => (
                <div className="simple-list-item" key={`receptionist-team-${receptionist.id}`}>
                  <strong>
                    Recepción: {receptionist.first_name} {receptionist.last_name}
                  </strong>
                  <span>{receptionist.phone_number ?? "Sin teléfono"}</span>
                  <span>{receptionist.email}</span>
                  <span>{receptionist.is_active ? "Activa" : "Inactiva"}</span>
                  <span>
                    {receptionist.assigned_doctors.length
                      ? receptionist.assigned_doctors.length === 1
                        ? `Asiste solo a ${receptionist.assigned_doctors[0].first_name} ${receptionist.assigned_doctors[0].last_name}`
                        : `Asiste a ${receptionist.assigned_doctors.length} doctores: ${receptionist.assigned_doctors.map((doctor) => `${doctor.first_name} ${doctor.last_name}`).join(", ")}`
                      : "Sin doctores asignados"}
                  </span>
                  <div className="row-actions">
                    <button type="button" className="secondary-button" onClick={() => startReceptionistEdit(receptionist)}>
                      Editar
                    </button>
                    <button type="button" className="secondary-button" onClick={() => toggleReceptionistActive(receptionist)}>
                      {receptionist.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No hay recepcionistas activas registradas.</p>
            )}
            {inactiveDoctors.length || inactiveReceptionists.length ? (
              <>
                <div className="simple-list-item">
                  <strong>Personal inactivo</strong>
                  <span>Se conserva para histórico, pero ya no aparece en los selectores de trabajo diario.</span>
                </div>
                {inactiveDoctors.map((doctor) => (
                  <div className="simple-list-item" key={`doctor-team-inactive-${doctor.id}`}>
                    <strong>
                      {doctor.first_name} {doctor.last_name}
                    </strong>
                    <span>{doctor.specialty ?? "Sin especialidad"}</span>
                    <span>Doctor inactivo</span>
                    <span>{doctor.linked_user_email ?? "Sin usuario de acceso"}</span>
                    <div className="row-actions">
                      <button type="button" className="secondary-button" onClick={() => startDoctorEdit(doctor)}>
                        Editar
                      </button>
                      <button type="button" className="secondary-button" onClick={() => toggleDoctorActive(doctor)}>
                        Activar
                      </button>
                    </div>
                  </div>
                ))}
                {inactiveReceptionists.map((receptionist) => (
                  <div className="simple-list-item" key={`receptionist-team-inactive-${receptionist.id}`}>
                    <strong>
                      Recepción: {receptionist.first_name} {receptionist.last_name}
                    </strong>
                    <span>{receptionist.email}</span>
                    <span>Recepcionista inactiva</span>
                    <div className="row-actions">
                      <button type="button" className="secondary-button" onClick={() => startReceptionistEdit(receptionist)}>
                        Editar
                      </button>
                      <button type="button" className="secondary-button" onClick={() => toggleReceptionistActive(receptionist)}>
                        Activar
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </article>
      ) : null}
    </section>
  );

  const renderActiveTab = () => {
    if (activeTab === "agenda") {
      return renderAgendaTab();
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
                  <span>Expediente</span>
                  <input
                    value={patientForm.medical_record_number}
                    onChange={(event) => setPatientForm((current) => ({ ...current, medical_record_number: event.target.value }))}
                    placeholder="Automático si lo dejas vacío"
                  />
                </label>
                <label>
                  <span>Nombres</span>
                  <input
                    value={patientForm.first_name}
                    onChange={(event) => setPatientForm((current) => ({ ...current, first_name: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Apellidos</span>
                  <input
                    value={patientForm.last_name}
                    onChange={(event) => setPatientForm((current) => ({ ...current, last_name: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>Teléfono</span>
                  <input
                    value={patientForm.primary_phone}
                    onChange={(event) => setPatientForm((current) => ({ ...current, primary_phone: event.target.value }))}
                    required
                  />
                </label>
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
                <span>Nombres</span>
                <input
                  value={patientEditForm.first_name}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, first_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Apellidos</span>
                <input
                  value={patientEditForm.last_name}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, last_name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Teléfono</span>
                <input
                  value={patientEditForm.primary_phone}
                  onChange={(event) => setPatientEditForm((current) => ({ ...current, primary_phone: event.target.value }))}
                  required
                />
              </label>
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

  const renderReviewResolutionModal = () => {
    if (!activeReviewItem) {
      return null;
    }

    const actionLabel =
      reviewResolutionForm.action === "create_appointment"
        ? "Crear cita"
        : reviewResolutionForm.action === "link_existing"
          ? "Vincular cita"
          : "Rechazar pendiente";

    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Pendientes</p>
              <h2>{actionLabel}</h2>
            </div>
            <button type="button" className="secondary-button" onClick={closeReviewResolutionModal}>
              Cerrar
            </button>
          </div>
          <div className="detail-panel compact-panel">
            <strong>{activeReviewItem.patient_name}</strong>
            <span>{activeReviewItem.doctor_name ?? activeReviewItem.doctor_phone_number ?? "Doctor pendiente"}</span>
            <span>{formatDateTime(activeReviewItem.scheduled_start)}</span>
            <span>{reviewReasonLabel(activeReviewItem.review_reason)}</span>
            <span>{activeReviewItem.review_message}</span>
          </div>
          <form className="form-card compact-form" onSubmit={submitReviewResolution}>
            <label>
              <span>Acción</span>
              <select
                value={reviewResolutionForm.action}
                onChange={(event) =>
                  setReviewResolutionForm((current) => ({
                    ...current,
                    action: event.target.value as ReviewResolutionAction,
                  }))
                }
              >
                <option value="create_appointment">Crear cita</option>
                <option value="link_existing">Vincular cita existente</option>
                <option value="reject">Rechazar</option>
              </select>
            </label>

            {reviewResolutionForm.action === "create_appointment" ? (
              <>
                <label>
                  <span>Paciente</span>
                  <select
                    value={reviewResolutionForm.patient_id}
                    onChange={(event) =>
                      setReviewResolutionForm((current) => ({ ...current, patient_id: event.target.value }))
                    }
                    required
                  >
                    <option value="">Seleccionar paciente</option>
                    {reviewPatientOptions.map((patient) => (
                      <option key={`review-patient-${patient.id}`} value={patient.id}>
                        {patient.first_name} {patient.last_name} · {patient.medical_record_number}
                      </option>
                    ))}
                    {!reviewPatientOptions.length
                      ? data.patients.map((patient) => (
                          <option key={`review-patient-fallback-${patient.id}`} value={patient.id}>
                            {patient.first_name} {patient.last_name} · {patient.medical_record_number}
                          </option>
                        ))
                      : null}
                  </select>
                </label>
                {activeReviewItem.doctor_id === null ? (
                  <label>
                    <span>Doctor</span>
                    <select
                      value={reviewResolutionForm.doctor_id}
                      onChange={(event) =>
                        setReviewResolutionForm((current) => ({ ...current, doctor_id: event.target.value }))
                      }
                      required
                    >
                      <option value="">Seleccionar doctor</option>
                      {availableDoctors.map((doctor) => (
                        <option key={`review-doctor-${doctor.id}`} value={doctor.id}>
                          {doctor.first_name} {doctor.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    <span>Doctor resuelto</span>
                    <input value={activeReviewItem.doctor_name ?? `Doctor ${activeReviewItem.doctor_id}`} readOnly />
                  </label>
                )}
              </>
            ) : null}

            {reviewResolutionForm.action === "link_existing" ? (
              <label>
                <span>Cita existente</span>
                <select
                  value={reviewResolutionForm.appointment_id}
                  onChange={(event) =>
                    setReviewResolutionForm((current) => ({ ...current, appointment_id: event.target.value }))
                  }
                  required
                >
                  <option value="">Seleccionar cita</option>
                  {reviewAppointmentOptions.map((appointment) => (
                    <option key={`review-appointment-${appointment.id}`} value={appointment.id}>
                      {(appointment.patient_name ?? `Paciente ${appointment.patient_id}`)} · {formatDateTime(appointment.scheduled_start)}
                    </option>
                  ))}
                  {!reviewAppointmentOptions.length
                    ? data.appointments.map((appointment) => (
                        <option key={`review-appointment-fallback-${appointment.id}`} value={appointment.id}>
                          {(appointment.patient_name ?? `Paciente ${appointment.patient_id}`)} · {formatDateTime(appointment.scheduled_start)}
                        </option>
                      ))
                    : null}
                </select>
              </label>
            ) : null}

            <label>
              <span>Nota operativa</span>
              <textarea
                value={reviewResolutionForm.note}
                onChange={(event) => setReviewResolutionForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Deja aquí el motivo o la resolución."
              />
            </label>
            <div className="row-actions">
              <button type="button" className="secondary-button" onClick={closeReviewResolutionModal}>
                Cancelar
              </button>
              <button type="submit">Guardar resolución</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDispatchStatusModal = () => {
    if (!activeDispatch) {
      return null;
    }

    return (
      <div className="modal-overlay" role="dialog" aria-modal="true">
        <div className="modal-card">
          <div className="subsection-header">
            <div>
              <p className="eyebrow">Mensajes</p>
              <h2>Actualizar estado del mensaje</h2>
            </div>
            <button type="button" className="secondary-button" onClick={closeDispatchStatusModal}>
              Cerrar
            </button>
          </div>
          <div className="detail-panel compact-panel">
            <strong>{activeDispatch.patient_name ?? `Paciente ${activeDispatch.patient_id}`}</strong>
            <span>{activeDispatch.doctor_name ?? "Sin doctor"}</span>
            <span>{dispatchStatusLabel(activeDispatch.status)} actual</span>
            <span>{activeDispatch.recipient_phone}</span>
            <div className="message-preview">{activeDispatch.rendered_message ?? "Sin texto generado."}</div>
          </div>
          <form className="form-card compact-form" onSubmit={submitDispatchStatusUpdate}>
            <label>
              <span>Nuevo estado</span>
              <select
                value={dispatchStatusForm.status}
                onChange={(event) =>
                  setDispatchStatusForm((current) => ({
                    ...current,
                    status: event.target.value as "sent" | "delivered" | "failed",
                  }))
                }
              >
                <option value="sent">Enviado</option>
                <option value="delivered">Entregado</option>
                <option value="failed">Fallido</option>
              </select>
            </label>
            {dispatchStatusForm.status === "failed" ? (
              <label>
                <span>Motivo del fallo</span>
                <textarea
                  value={dispatchStatusForm.error_message}
                  onChange={(event) =>
                    setDispatchStatusForm((current) => ({ ...current, error_message: event.target.value }))
                  }
                  placeholder="Describe por qué falló el envío."
                />
              </label>
            ) : null}
            <div className="row-actions">
              <button type="button" className="secondary-button" onClick={closeDispatchStatusModal}>
                Cancelar
              </button>
              <button type="submit">Guardar estado</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <main className="page-shell">
      {!isAuthenticated ? (
        renderLogin()
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
                <span>Pendientes</span>
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
                <span>{currentUserEmail}</span>
              </div>
              <div className="topbar-actions">
                <input
                  className="search-input topbar-search"
                  placeholder="Buscar paciente o expediente"
                  value={topbarSearch}
                  onChange={(event) => setTopbarSearch(event.target.value)}
                />
              </div>
            </header>

            {message ? <p className="message-box">{message}</p> : null}
            {loading ? <p className="message-box">Cargando información clínica...</p> : null}

            {renderActiveTab()}
          </div>
          {renderSectionActionModal()}
          {renderReviewResolutionModal()}
          {renderDispatchStatusModal()}
        </section>
      )}
    </main>
  );
}
