"use client";

import { FormEvent, useEffect, useState } from "react";

import { API_URL, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  Appointment,
  CommunicationDispatchGeneration,
  CommunicationDispatch,
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
  ReminderRule,
} from "@/features/module1/types";

type LoadState = {
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  encounters: Encounter[];
};

const initialLoadState: LoadState = {
  doctors: [],
  patients: [],
  appointments: [],
  encounters: [],
};

const nowPlusMinutes = (minutes: number) => {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  return date.toISOString().slice(0, 16);
};

function hasAnyRole(currentRoles: string[], allowedRoles: string[]) {
  return allowedRoles.some((role) => currentRoles.includes(role));
}

export function ClinicalConsole() {
  const [data, setData] = useState<LoadState>(initialLoadState);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [loginForm, setLoginForm] = useState({
    email: "admin@docontrol.local",
    password: "ChangeMe123!",
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedSummary, setSelectedSummary] = useState<PatientSummary | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState("lab_result");
  const [attachmentEncounterId, setAttachmentEncounterId] = useState("");
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [communicationTemplates, setCommunicationTemplates] = useState<CommunicationTemplate[]>([]);
  const [communicationDispatches, setCommunicationDispatches] = useState<CommunicationDispatch[]>([]);
  const [communicationDispatchSummary, setCommunicationDispatchSummary] = useState<CommunicationDispatchSummary | null>(null);
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
    template_key: "appointment_custom",
    title: "",
    body: "",
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
    {
      medication_name: "",
      dosage: null,
      frequency: null,
      duration: null,
      instructions: null,
    },
  ]);
  const [examOrders, setExamOrders] = useState<ExamOrder[]>([
    { exam_name: "", exam_category: null, instructions: null },
  ]);

  async function loadData() {
    setLoading(true);
    try {
      const patientPath = patientSearch.trim()
        ? `/api/patients?query=${encodeURIComponent(patientSearch.trim())}`
        : "/api/patients";
      const dispatchParams = new URLSearchParams({ limit: "20" });
      if (dispatchFilters.status_filter) {
        dispatchParams.set("status_filter", dispatchFilters.status_filter);
      }
      if (dispatchFilters.channel) {
        dispatchParams.set("channel", dispatchFilters.channel);
      }
      if (dispatchFilters.query.trim()) {
        dispatchParams.set("query", dispatchFilters.query.trim());
      }
      const canViewReminderRules = hasAnyRole(currentRoles, ["admin", "receptionist"]);
      const canViewCommunications = hasAnyRole(currentRoles, ["admin", "receptionist"]);

      const [doctors, patients, appointments, encounters, loadedReminderRules, loadedTemplates, loadedDispatches, loadedDispatchSummary] =
        await Promise.all([
        apiGet<Doctor[]>("/api/doctors"),
        apiGet<Patient[]>(patientPath),
        apiGet<Appointment[]>("/api/appointments"),
        apiGet<Encounter[]>("/api/encounters"),
        canViewReminderRules ? apiGet<ReminderRule[]>("/api/reminder-rules") : Promise.resolve([]),
        canViewCommunications ? apiGet<CommunicationTemplate[]>("/api/communication-templates") : Promise.resolve([]),
        canViewCommunications
          ? apiGet<CommunicationDispatch[]>(`/api/communication-dispatches?${dispatchParams.toString()}`)
          : Promise.resolve([]),
        canViewCommunications ? apiGet<CommunicationDispatchSummary>("/api/communication-dispatches/summary") : Promise.resolve(null),
        ]);

      setData({ doctors, patients, appointments, encounters });
      setReminderRules(loadedReminderRules);
      setCommunicationTemplates(loadedTemplates);
      setCommunicationDispatches(loadedDispatches);
      setCommunicationDispatchSummary(loadedDispatchSummary);
      if (!appointmentForm.doctor_id && doctors[0]) {
        setAppointmentForm((current) => ({ ...current, doctor_id: String(doctors[0].id) }));
      }
      if (!encounterForm.doctor_id && doctors[0]) {
        setEncounterForm((current) => ({ ...current, doctor_id: String(doctors[0].id) }));
      }
      if (!selectedPatientId && patients[0]) {
        setSelectedPatientId(String(patients[0].id));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load module data.");
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
        setMessage(error instanceof Error ? error.message : "Could not load patient summary.");
      }
    }

    loadSummary();
  }, [isAuthenticated, selectedPatientId]);

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
      setMessage(`Logged in as ${payload.user_email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
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
    setMessage("Session closed.");
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
      await loadData();
      setMessage("Patient created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Patient creation failed.");
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
      setMessage("Appointment created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Appointment creation failed.");
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
      setEncounterForm((current) => ({
        ...current,
        chief_complaint: "",
        appointment_id: "",
      }));
      setDiagnoses([{ diagnosis_text: "", diagnosis_code: null, is_primary: true, notes: null }]);
      setPrescriptionItems([
        {
          medication_name: "",
          dosage: null,
          frequency: null,
          duration: null,
          instructions: null,
        },
      ]);
      setExamOrders([{ exam_name: "", exam_category: null, instructions: null }]);
      setSelectedPatientId(encounterForm.patient_id);
      setMessage("Encounter created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Encounter creation failed.");
    }
  }

  async function updateAppointmentStatus(appointmentId: number, status: string) {
    setMessage("");
    try {
      await apiPatch<Appointment>(`/api/appointments/${appointmentId}/status`, {
        status,
        changed_by: "frontend-demo",
        change_reason: `status changed to ${status}`,
      });
      await loadData();
      if (selectedPatientId) {
        setSelectedSummary(await apiGet<PatientSummary>(`/api/patients/${selectedPatientId}/summary`));
      }
      setMessage(`Appointment ${appointmentId} updated to ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Appointment update failed.");
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
      setMessage(`Encounter ${encounterId} closed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Encounter close failed.");
    }
  }

  async function submitAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!selectedPatientId || !attachmentFile) {
      setMessage("Select a patient and a file before uploading.");
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
      setMessage("Attachment uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Attachment upload failed.");
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
      setMessage(error instanceof Error ? error.message : "Attachment download failed.");
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
      setMessage("Reminder rule created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reminder rule creation failed.");
    }
  }

  async function toggleReminderRule(rule: ReminderRule) {
    setMessage("");
    try {
      await apiPatch<ReminderRule>(`/api/reminder-rules/${rule.id}`, {
        is_active: !rule.is_active,
      });
      await loadData();
      setMessage(`Reminder rule ${rule.id} ${rule.is_active ? "deactivated" : "activated"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reminder rule update failed.");
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
        template_key: "appointment_custom",
        title: "",
        body: "",
        is_active: true,
      });
      setTemplatePreview(null);
      await loadData();
      setMessage("Communication template created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Communication template creation failed.");
    }
  }

  async function toggleTemplate(template: CommunicationTemplate) {
    setMessage("");
    try {
      await apiPatch<CommunicationTemplate>(`/api/communication-templates/${template.id}`, {
        is_active: !template.is_active,
      });
      await loadData();
      setMessage(`Communication template ${template.id} ${template.is_active ? "deactivated" : "activated"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Communication template update failed.");
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
        title: templateForm.title || "Preview",
        body: templateForm.body,
        patient_id: selectedPatientId ? Number(selectedPatientId) : null,
        appointment_id: selectedSummary?.appointments[0]?.id ?? null,
        exam_order_id: firstExamOrderId,
      });
      setTemplatePreview(preview);
      setMessage("Communication template preview generated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Communication template preview failed.");
    }
  }

  async function generateDispatchesNow() {
    setMessage("");
    try {
      const result = await apiPost<CommunicationDispatchGeneration>("/api/communication-dispatches/generate", {});
      await loadData();
      setMessage(`Generated ${result.created_count} communication dispatches.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Communication dispatch generation failed.");
    }
  }

  async function requeueDispatch(dispatchId: number) {
    setMessage("");
    try {
      await apiPost<CommunicationDispatch>(`/api/communication-dispatches/${dispatchId}/requeue`, {});
      await loadData();
      setMessage(`Communication dispatch ${dispatchId} requeued.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Communication dispatch requeue failed.");
    }
  }

  async function updateDispatchStatus(dispatchId: number, status: "sent" | "delivered" | "failed") {
    setMessage("");
    try {
      const payload: Record<string, string> = { status };
      if (status === "failed") {
        const reason = window.prompt("Failure reason", "Manual admin failure update");
        if (!reason) {
          setMessage("Failure update cancelled.");
          return;
        }
        payload.error_message = reason;
      }
      await apiPatch<CommunicationDispatch>(`/api/communication-dispatches/${dispatchId}`, payload);
      await loadData();
      setMessage(`Communication dispatch ${dispatchId} updated to ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Communication dispatch update failed.");
    }
  }

  return (
    <main className="page-shell">
      {!isAuthenticated ? (
        <section className="hero">
          <p className="eyebrow">Module 1</p>
          <h1>Login required</h1>
          <p className="lede">
            Sign in to access patient, appointment, encounter, and attachment workflows.
          </p>
          <form className="login-form" onSubmit={submitLogin}>
            <input
              type="email"
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Password"
              required
            />
            <button type="submit">Sign in</button>
          </form>
          {message ? <p className="message-box">{message}</p> : null}
        </section>
      ) : (
        <>
      <section className="hero">
        <p className="eyebrow">Module 1</p>
        <h1>Clinical operations console</h1>
        <p className="lede">
          This frontend is wired to the live FastAPI backend. You can register patients, schedule
          appointments, and record encounters against the Dockerized PostgreSQL database.
        </p>
        <div className="session-strip">
          <span>{currentUserEmail}</span>
          <span>{currentRoles.join(", ")}</span>
        </div>
        <div className="row-actions">
          <button type="button" className="secondary-button" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      <section className="status-strip">
        <div>
          <strong>{data.doctors.length}</strong>
          <span> doctors</span>
        </div>
        <div>
          <strong>{data.patients.length}</strong>
          <span> patients</span>
        </div>
        <div>
          <strong>{data.appointments.length}</strong>
          <span> appointments</span>
        </div>
        <div>
          <strong>{data.encounters.length}</strong>
          <span> encounters</span>
        </div>
      </section>

      <section className="card patient-focus">
        <div className="patient-focus-header">
          <div>
            <p className="eyebrow">Patient search</p>
            <h2>Find patient fast</h2>
          </div>
          <input
            className="search-input"
            placeholder="Search by MRN, name, phone, or national ID"
            value={patientSearch}
            onChange={(event) => setPatientSearch(event.target.value)}
          />
        </div>
      </section>

      <section className="card patient-focus">
        <div className="patient-focus-header">
          <div>
            <p className="eyebrow">Patient focus</p>
            <h2>Chart summary</h2>
          </div>
          <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
            <option value="">Select patient</option>
            {data.patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.medical_record_number} · {patient.first_name} {patient.last_name}
              </option>
            ))}
          </select>
        </div>

        {selectedSummary ? (
          <div className="summary-grid">
            <div>
              <strong>
                {selectedSummary.patient.first_name} {selectedSummary.patient.last_name}
              </strong>
              <p>{selectedSummary.patient.primary_phone}</p>
            </div>
            <div>
              <strong>{selectedSummary.appointments.length}</strong>
              <p>appointments</p>
            </div>
            <div>
              <strong>{selectedSummary.encounters.length}</strong>
              <p>encounters</p>
            </div>
          </div>
        ) : (
          <p className="empty-state">Select a patient to inspect appointment and encounter history.</p>
        )}
      </section>

      {message ? <p className="message-box">{message}</p> : null}

      {hasAnyRole(currentRoles, ["admin", "receptionist"]) ? (
        <section className="workspace-grid">
          {hasAnyRole(currentRoles, ["admin"]) ? (
            <form className="card form-card" onSubmit={submitReminderRule}>
              <h2>Reminder rule</h2>
              <label>
                <span>Doctor scope</span>
                <select
                  value={reminderRuleForm.doctor_id}
                  onChange={(event) =>
                    setReminderRuleForm((current) => ({ ...current, doctor_id: event.target.value }))
                  }
                >
                  <option value="">All doctors</option>
                  {data.doctors.map((doctor) => (
                    <option key={`reminder-doctor-${doctor.id}`} value={doctor.id}>
                      {doctor.first_name} {doctor.last_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Channel</span>
                <select
                  value={reminderRuleForm.channel}
                  onChange={(event) =>
                    setReminderRuleForm((current) => ({ ...current, channel: event.target.value }))
                  }
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label>
                <span>Trigger</span>
                <select
                  value={reminderRuleForm.trigger_type}
                  onChange={(event) =>
                    setReminderRuleForm((current) => ({ ...current, trigger_type: event.target.value }))
                  }
                >
                  <option value="before_appointment">Before appointment</option>
                </select>
              </label>
              <label>
                <span>Minutes before</span>
                <input
                  type="number"
                  min="1"
                  value={reminderRuleForm.minutes_before}
                  onChange={(event) =>
                    setReminderRuleForm((current) => ({ ...current, minutes_before: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Template key</span>
                <input
                  value={reminderRuleForm.template_key}
                  onChange={(event) =>
                    setReminderRuleForm((current) => ({ ...current, template_key: event.target.value }))
                  }
                  required
                />
              </label>
              <button type="submit">Create reminder rule</button>
            </form>
          ) : (
            <article className="card table-card">
              <h2>Reminder rule</h2>
              <p className="empty-state">Reception can view active reminder settings but cannot change them.</p>
            </article>
          )}

          <article className="card table-card span-two">
            <h2>Reminder rules</h2>
            <div className="table-list">
              {reminderRules.map((rule) => (
                <div className="row" key={`reminder-rule-${rule.id}`}>
                  <strong>
                    {rule.template_key} · {rule.minutes_before} min
                  </strong>
                  <span>
                    {rule.channel} · {rule.trigger_type} · {rule.doctor_id ? `doctor ${rule.doctor_id}` : "all doctors"}
                  </span>
                  <span>{rule.is_active ? "active" : "inactive"}</span>
                  {hasAnyRole(currentRoles, ["admin"]) ? (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => toggleReminderRule(rule)}
                      >
                        {rule.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {!reminderRules.length ? <p className="empty-state">No reminder rules configured.</p> : null}
            </div>
          </article>
        </section>
      ) : null}

      {hasAnyRole(currentRoles, ["admin", "receptionist"]) ? (
        <section className="workspace-grid">
          {hasAnyRole(currentRoles, ["admin"]) ? (
            <form className="card form-card" onSubmit={submitTemplate}>
              <h2>Communication template</h2>
              <p className="empty-state">
                Allowed variables: {"{patient_name}"}, {"{doctor_name}"}, {"{appointment_date}"}, {"{appointment_time}"},
                {" {exam_name}"}, {" {expected_date}"}
              </p>
              <label>
                <span>Doctor scope</span>
                <select
                  value={templateForm.doctor_id}
                  onChange={(event) =>
                    setTemplateForm((current) => ({ ...current, doctor_id: event.target.value }))
                  }
                >
                  <option value="">All doctors</option>
                  {data.doctors.map((doctor) => (
                    <option key={`template-doctor-${doctor.id}`} value={doctor.id}>
                      {doctor.first_name} {doctor.last_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Channel</span>
                <select
                  value={templateForm.channel}
                  onChange={(event) =>
                    setTemplateForm((current) => ({ ...current, channel: event.target.value }))
                  }
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label>
                <span>Template key</span>
                <input
                  value={templateForm.template_key}
                  onChange={(event) =>
                    setTemplateForm((current) => ({ ...current, template_key: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>Title</span>
                <input
                  value={templateForm.title}
                  onChange={(event) => setTemplateForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Body</span>
                <textarea
                  value={templateForm.body}
                  onChange={(event) => setTemplateForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Hola {patient_name}..."
                  required
                />
              </label>
              {templatePreview ? (
                <p className="empty-state">Preview: {templatePreview.rendered_message || "(empty result)"}</p>
              ) : null}
              <div className="row-actions">
                <button type="button" className="secondary-button" onClick={previewTemplate}>
                  Preview
                </button>
                <button type="submit">Create template</button>
              </div>
            </form>
          ) : (
            <article className="card table-card">
              <h2>Communication template</h2>
              <p className="empty-state">Reception can review templates but cannot modify them.</p>
            </article>
          )}

          <article className="card table-card span-two">
            <h2>Communication templates</h2>
            <div className="table-list">
              {communicationTemplates.map((template) => (
                <div className="row" key={`communication-template-${template.id}`}>
                  <strong>
                    {template.template_key} · {template.channel}
                  </strong>
                  <span>{template.title}</span>
                  <span>{template.doctor_id ? `doctor ${template.doctor_id}` : "all doctors"}</span>
                  <span>{template.is_active ? "active" : "inactive"}</span>
                  {hasAnyRole(currentRoles, ["admin"]) ? (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => toggleTemplate(template)}
                      >
                        {template.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {!communicationTemplates.length ? <p className="empty-state">No templates configured.</p> : null}
            </div>
          </article>
        </section>
      ) : null}

      {hasAnyRole(currentRoles, ["admin", "receptionist"]) ? (
        <section className="workspace-grid">
          <article className="card table-card span-three">
            <div className="subsection-header">
              <h2>Communication dispatch log</h2>
              {hasAnyRole(currentRoles, ["admin"]) ? (
                <button type="button" className="secondary-button" onClick={generateDispatchesNow}>
                  Generate now
                </button>
              ) : null}
            </div>
            {communicationDispatchSummary ? (
              <div className="table-list">
                <div className="row">
                  <strong>Total</strong>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDispatchFilters((current) => ({ ...current, status_filter: "" }))}
                  >
                    {communicationDispatchSummary.total}
                  </button>
                  <strong>Pending</strong>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDispatchFilters((current) => ({ ...current, status_filter: "pending" }))}
                  >
                    {communicationDispatchSummary.pending}
                  </button>
                  <strong>Due now</strong>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDispatchFilters((current) => ({ ...current, status_filter: "pending" }))}
                  >
                    {communicationDispatchSummary.due_now}
                  </button>
                </div>
                <div className="row">
                  <strong>Sent</strong>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDispatchFilters((current) => ({ ...current, status_filter: "sent" }))}
                  >
                    {communicationDispatchSummary.sent}
                  </button>
                  <strong>Delivered</strong>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDispatchFilters((current) => ({ ...current, status_filter: "delivered" }))}
                  >
                    {communicationDispatchSummary.delivered}
                  </button>
                  <strong>Failed</strong>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDispatchFilters((current) => ({ ...current, status_filter: "failed" }))}
                  >
                    {communicationDispatchSummary.failed}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="row-actions">
              <select
                value={dispatchFilters.status_filter}
                onChange={(event) =>
                  setDispatchFilters((current) => ({ ...current, status_filter: event.target.value }))
                }
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={dispatchFilters.channel}
                onChange={(event) =>
                  setDispatchFilters((current) => ({ ...current, channel: event.target.value }))
                }
              >
                <option value="">All channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
              <input
                value={dispatchFilters.query}
                onChange={(event) =>
                  setDispatchFilters((current) => ({ ...current, query: event.target.value }))
                }
                placeholder="Phone, ref, error"
              />
            </div>
            <div className="table-list">
              {communicationDispatches.map((dispatch) => (
                <div className="row" key={`communication-dispatch-${dispatch.id}`}>
                  <strong>
                    #{dispatch.id} · {dispatch.channel} · {dispatch.status}
                  </strong>
                  <span>
                    patient {dispatch.patient_id}
                    {dispatch.doctor_id ? ` · doctor ${dispatch.doctor_id}` : ""}
                    {dispatch.appointment_id ? ` · appointment ${dispatch.appointment_id}` : ""}
                    {dispatch.exam_order_id ? ` · exam ${dispatch.exam_order_id}` : ""}
                  </span>
                  <span>{dispatch.recipient_phone}</span>
                  <span>
                    {dispatch.external_reference ?? "no external reference"}
                    {` · retry ${dispatch.retry_count}`}
                    {dispatch.next_attempt_at ? ` · next ${dispatch.next_attempt_at}` : ""}
                  </span>
                  {hasAnyRole(currentRoles, ["admin"]) ? (
                    <div className="row-actions">
                      {dispatch.status !== "sent" && dispatch.status !== "delivered" ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => updateDispatchStatus(dispatch.id, "sent")}
                        >
                          Mark sent
                        </button>
                      ) : null}
                      {dispatch.status !== "delivered" ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => updateDispatchStatus(dispatch.id, "delivered")}
                        >
                          Mark delivered
                        </button>
                      ) : null}
                      {dispatch.status !== "failed" ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => updateDispatchStatus(dispatch.id, "failed")}
                        >
                          Mark failed
                        </button>
                      ) : null}
                      {dispatch.status === "failed" ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => requeueDispatch(dispatch.id)}
                        >
                          Requeue
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              {!communicationDispatches.length ? <p className="empty-state">No communication dispatches logged.</p> : null}
            </div>
          </article>
        </section>
      ) : null}

      <section className="workspace-grid">
        {hasAnyRole(currentRoles, ["admin", "receptionist"]) ? (
        <form className="card form-card" onSubmit={submitPatient}>
          <h2>New patient</h2>
          <label>
            <span>Medical record</span>
            <input
              value={patientForm.medical_record_number}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, medical_record_number: event.target.value }))
              }
              placeholder="Leave blank to auto-generate"
            />
          </label>
          <label>
            <span>First name</span>
            <input
              value={patientForm.first_name}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, first_name: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Last name</span>
            <input
              value={patientForm.last_name}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, last_name: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Phone</span>
            <input
              value={patientForm.primary_phone}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, primary_phone: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>DPI</span>
            <input
              value={patientForm.national_id}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, national_id: event.target.value }))
              }
            />
          </label>
          <label>
            <span>NIT</span>
            <input
              value={patientForm.tax_id}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, tax_id: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={patientForm.email}
              onChange={(event) =>
                setPatientForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </label>
          <button type="submit">Create patient</button>
        </form>
        ) : (
          <article className="card table-card">
            <h2>New patient</h2>
            <p className="empty-state">Your role cannot create or edit patient records.</p>
          </article>
        )}

        {hasAnyRole(currentRoles, ["admin", "receptionist"]) ? (
        <form className="card form-card" onSubmit={submitAppointment}>
          <h2>New appointment</h2>
          <label>
            <span>Patient</span>
            <select
              value={appointmentForm.patient_id}
              onChange={(event) =>
                setAppointmentForm((current) => ({ ...current, patient_id: event.target.value }))
              }
              required
            >
              <option value="">Select patient</option>
              {data.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.medical_record_number} · {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Doctor</span>
            <select
              value={appointmentForm.doctor_id}
              onChange={(event) =>
                setAppointmentForm((current) => ({ ...current, doctor_id: event.target.value }))
              }
              required
            >
              <option value="">Select doctor</option>
              {data.doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.first_name} {doctor.last_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Start</span>
            <input
              type="datetime-local"
              value={appointmentForm.scheduled_start}
              onChange={(event) =>
                setAppointmentForm((current) => ({ ...current, scheduled_start: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>End</span>
            <input
              type="datetime-local"
              value={appointmentForm.scheduled_end}
              onChange={(event) =>
                setAppointmentForm((current) => ({ ...current, scheduled_end: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Type</span>
            <input
              value={appointmentForm.appointment_type}
              onChange={(event) =>
                setAppointmentForm((current) => ({ ...current, appointment_type: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Reason</span>
            <textarea
              value={appointmentForm.reason}
              onChange={(event) =>
                setAppointmentForm((current) => ({ ...current, reason: event.target.value }))
              }
            />
          </label>
          <button type="submit" disabled={!data.patients.length || !data.doctors.length}>
            Create appointment
          </button>
        </form>
        ) : (
          <article className="card table-card">
            <h2>New appointment</h2>
            <p className="empty-state">Your role cannot create appointment records.</p>
          </article>
        )}

        {hasAnyRole(currentRoles, ["admin", "doctor"]) ? (
        <form className="card form-card" onSubmit={submitEncounter}>
          <h2>New encounter</h2>
          <label>
            <span>Patient</span>
            <select
              value={encounterForm.patient_id}
              onChange={(event) =>
                setEncounterForm((current) => ({ ...current, patient_id: event.target.value }))
              }
              required
            >
              <option value="">Select patient</option>
              {data.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Doctor</span>
            <select
              value={encounterForm.doctor_id}
              onChange={(event) =>
                setEncounterForm((current) => ({ ...current, doctor_id: event.target.value }))
              }
              required
            >
              <option value="">Select doctor</option>
              {data.doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.first_name} {doctor.last_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Linked appointment</span>
            <select
              value={encounterForm.appointment_id}
              onChange={(event) =>
                setEncounterForm((current) => ({ ...current, appointment_id: event.target.value }))
              }
            >
              <option value="">No appointment</option>
              {data.appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  #{appointment.id} · patient {appointment.patient_id} · {appointment.status}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Encounter date</span>
            <input
              type="datetime-local"
              value={encounterForm.encounter_date}
              onChange={(event) =>
                setEncounterForm((current) => ({ ...current, encounter_date: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Encounter type</span>
            <input
              value={encounterForm.encounter_type}
              onChange={(event) =>
                setEncounterForm((current) => ({ ...current, encounter_type: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <span>Chief complaint</span>
            <textarea
              value={encounterForm.chief_complaint}
              onChange={(event) =>
                setEncounterForm((current) => ({ ...current, chief_complaint: event.target.value }))
              }
              required
            />
          </label>
          <div className="subsection">
            <div className="subsection-header">
              <h3>Diagnoses</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setDiagnoses((current) => [
                    ...current,
                    { diagnosis_text: "", diagnosis_code: null, is_primary: false, notes: null },
                  ])
                }
              >
                Add diagnosis
              </button>
            </div>
            {diagnoses.map((diagnosis, index) => (
              <div className="stacked-fields" key={`diagnosis-${index}`}>
                <input
                  placeholder="Diagnosis text"
                  value={diagnosis.diagnosis_text}
                  onChange={(event) =>
                    setDiagnoses((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, diagnosis_text: event.target.value } : item,
                      ),
                    )
                  }
                />
                <input
                  placeholder="Code"
                  value={diagnosis.diagnosis_code ?? ""}
                  onChange={(event) =>
                    setDiagnoses((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, diagnosis_code: event.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <div className="subsection">
            <div className="subsection-header">
              <h3>Prescription</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setPrescriptionItems((current) => [
                    ...current,
                    {
                      medication_name: "",
                      dosage: null,
                      frequency: null,
                      duration: null,
                      instructions: null,
                    },
                  ])
                }
              >
                Add medication
              </button>
            </div>
            {prescriptionItems.map((item, index) => (
              <div className="stacked-fields" key={`medication-${index}`}>
                <input
                  placeholder="Medication"
                  value={item.medication_name}
                  onChange={(event) =>
                    setPrescriptionItems((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, medication_name: event.target.value } : entry,
                      ),
                    )
                  }
                />
                <input
                  placeholder="Dosage"
                  value={item.dosage ?? ""}
                  onChange={(event) =>
                    setPrescriptionItems((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, dosage: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <div className="subsection">
            <div className="subsection-header">
              <h3>Exam orders</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setExamOrders((current) => [
                    ...current,
                    { exam_name: "", exam_category: null, instructions: null },
                  ])
                }
              >
                Add exam
              </button>
            </div>
            {examOrders.map((item, index) => (
              <div className="stacked-fields" key={`exam-${index}`}>
                <input
                  placeholder="Exam name"
                  value={item.exam_name}
                  onChange={(event) =>
                    setExamOrders((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, exam_name: event.target.value } : entry,
                      ),
                    )
                  }
                />
                <input
                  placeholder="Category"
                  value={item.exam_category ?? ""}
                  onChange={(event) =>
                    setExamOrders((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, exam_category: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={!data.patients.length || !data.doctors.length}>
            Create encounter
          </button>
        </form>
        ) : (
          <article className="card table-card">
            <h2>New encounter</h2>
            <p className="empty-state">Your role cannot create or close encounters.</p>
          </article>
        )}
      </section>

      <section className="workspace-grid">
        <article className="card table-card">
          <h2>Patients</h2>
          {loading ? <p>Loading...</p> : null}
          <div className="table-list">
            {data.patients.map((patient) => (
              <div className="row" key={patient.id}>
                <strong>{patient.medical_record_number}</strong>
                <span>
                  {patient.first_name} {patient.last_name}
                </span>
                <span>{patient.primary_phone}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card table-card">
          <h2>Appointments</h2>
          <div className="table-list">
            {data.appointments.map((appointment) => (
              <div className="row" key={appointment.id}>
                <strong>#{appointment.id}</strong>
                <span>{appointment.appointment_type}</span>
                <span>{appointment.status}</span>
                {hasAnyRole(currentRoles, ["admin", "receptionist"]) ? (
                  <div className="row-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => updateAppointmentStatus(appointment.id, "completed")}
                    >
                      Complete
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="card table-card">
          <h2>Encounters</h2>
          <div className="table-list">
            {data.encounters.map((encounter) => (
              <div className="row" key={encounter.id}>
                <strong>#{encounter.id}</strong>
                <span>{encounter.encounter_type}</span>
                <span>{encounter.status}</span>
                {encounter.status !== "closed" && hasAnyRole(currentRoles, ["admin", "doctor"]) ? (
                  <div className="row-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => closeEncounter(encounter.id)}
                    >
                      Close encounter
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      {selectedSummary ? (
        <section className="workspace-grid">
          <article className="card table-card">
            <h2>Patient appointments</h2>
            <div className="table-list">
              {selectedSummary.appointments.map((appointment) => (
                <div className="row" key={`summary-appointment-${appointment.id}`}>
                  <strong>#{appointment.id}</strong>
                  <span>{appointment.appointment_type}</span>
                  <span>
                    {appointment.status} · {appointment.confirmation_status}
                  </span>
                  {hasAnyRole(currentRoles, ["admin", "receptionist"]) ? (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
          <article className="card table-card span-two">
            <h2>Patient encounters</h2>
            <div className="table-list">
              {selectedSummary.encounters.map((encounter) => (
                <div className="row" key={`summary-encounter-${encounter.id}`}>
                  <strong>
                    #{encounter.id} · {encounter.encounter_type}
                  </strong>
                  <span>{encounter.chief_complaint}</span>
                  <span>
                    Diagnoses:{" "}
                    {(encounter.diagnoses ?? []).map((diagnosis) => diagnosis.diagnosis_text).join(", ") || "none"}
                  </span>
                  <span>
                    Exams: {(encounter.exam_orders ?? []).map((exam) => exam.exam_name).join(", ") || "none"}
                  </span>
                  {encounter.status !== "closed" && hasAnyRole(currentRoles, ["admin", "doctor"]) ? (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => closeEncounter(encounter.id)}
                      >
                        Close encounter
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {selectedSummary ? (
        <section className="workspace-grid">
          {hasAnyRole(currentRoles, ["admin", "doctor"]) ? (
          <form className="card form-card" onSubmit={submitAttachment}>
            <h2>Upload attachment</h2>
            <label>
              <span>Type</span>
              <select value={attachmentType} onChange={(event) => setAttachmentType(event.target.value)}>
                <option value="lab_result">Lab result</option>
                <option value="ultrasound">Ultrasound</option>
                <option value="image">Image</option>
                <option value="clinical_document">Clinical document</option>
              </select>
            </label>
            <label>
              <span>Encounter</span>
              <select
                value={attachmentEncounterId}
                onChange={(event) => setAttachmentEncounterId(event.target.value)}
              >
                <option value="">No encounter</option>
                {selectedSummary.encounters.map((encounter) => (
                  <option key={`attachment-encounter-${encounter.id}`} value={encounter.id}>
                    #{encounter.id} · {encounter.encounter_type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>File</span>
              <input
                type="file"
                onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                required
              />
            </label>
            <button type="submit">Upload attachment</button>
          </form>
          ) : (
            <article className="card table-card">
              <h2>Upload attachment</h2>
              <p className="empty-state">Your role can view attachments but cannot upload them.</p>
            </article>
          )}

          <article className="card table-card span-two">
            <h2>Attachments</h2>
            <div className="table-list">
              {selectedSummary.attachments.map((attachment) => (
                <div className="row" key={`attachment-${attachment.id}`}>
                  <strong>{attachment.file_name}</strong>
                  <span>{attachment.file_type}</span>
                  <span>{attachment.storage_key}</span>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openAttachment(attachment.id)}
                      disabled={downloadingAttachmentId === attachment.id}
                    >
                      {downloadingAttachmentId === attachment.id ? "Preparing..." : "Open"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}
        </>
      )}
    </main>
  );
}
