export type Doctor = {
  id: number;
  first_name: string;
  last_name: string;
  specialty: string | null;
};

export type Patient = {
  id: number;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  primary_phone: string;
  national_id: string | null;
  is_active: boolean;
};

export type Appointment = {
  id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_start: string;
  scheduled_end: string;
  appointment_type: string;
  status: string;
  confirmation_status: string;
};

export type Encounter = {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_id: number | null;
  encounter_date: string;
  encounter_type: string;
  chief_complaint: string;
  status: string;
  diagnoses?: Diagnosis[];
  prescription?: Prescription | null;
  exam_orders?: ExamOrder[];
};

export type Diagnosis = {
  id?: number;
  diagnosis_text: string;
  diagnosis_code: string | null;
  is_primary: boolean;
  notes: string | null;
};

export type PrescriptionItem = {
  id?: number;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
};

export type Prescription = {
  id?: number;
  notes: string | null;
  items: PrescriptionItem[];
};

export type ExamOrder = {
  id?: number;
  exam_name: string;
  exam_category: string | null;
  instructions: string | null;
  status?: string;
};

export type PatientSummary = {
  patient: Patient;
  appointments: Appointment[];
  encounters: Encounter[];
  attachments: FileAttachment[];
};

export type FileAttachment = {
  id: number;
  patient_id: number;
  encounter_id: number | null;
  file_type: string;
  file_name: string;
  storage_key: string;
  content_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type AttachmentDownload = {
  attachment_id: number;
  file_name: string;
  download_url: string;
  expires_in_seconds: number;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user_email: string;
  roles: string[];
};

export type ReminderRule = {
  id: number;
  doctor_id: number | null;
  channel: string;
  trigger_type: string;
  minutes_before: number;
  template_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CommunicationTemplate = {
  id: number;
  doctor_id: number | null;
  channel: string;
  template_key: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CommunicationTemplatePreview = {
  rendered_message: string;
  patient_id: number | null;
  doctor_id: number | null;
  appointment_id: number | null;
  exam_order_id: number | null;
};

export type CommunicationDispatch = {
  id: number;
  patient_id: number;
  doctor_id: number | null;
  appointment_id: number | null;
  exam_order_id: number | null;
  reminder_rule_id: number | null;
  template_id: number | null;
  channel: string;
  recipient_phone: string;
  status: string;
  retry_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  external_reference: string | null;
  rendered_message: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunicationDispatchGeneration = {
  created_count: number;
};

export type CommunicationDispatchSummary = {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  due_now: number;
};

export type CommunicationDispatchBatchRequeue = {
  requeued_count: number;
};
