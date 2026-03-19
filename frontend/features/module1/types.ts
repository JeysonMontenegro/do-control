export type AssignedReceptionist = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
  phone_number: string | null;
  is_active: boolean;
};

export type Doctor = {
  id: number;
  first_name: string;
  last_name: string;
  gender: string | null;
  date_of_birth?: string | null;
  specialty: string | null;
  is_active: boolean;
  license_number?: string | null;
  linked_user_id?: number | null;
  linked_user_email?: string | null;
  clinics?: {
    id: number;
    clinic_name: string;
    address?: string | null;
    phone_number?: string | null;
    notes?: string | null;
    is_primary: boolean;
  }[];
  phone_numbers?: { id: number; phone_number: string; is_primary: boolean; is_active: boolean; channel_type: string | null }[];
  assigned_receptionists?: AssignedReceptionist[];
};

export type Patient = {
  id: number;
  medical_record_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  second_last_name?: string | null;
  married_name?: string | null;
  sex?: string | null;
  date_of_birth?: string | null;
  primary_phone: string;
  secondary_phone?: string | null;
  national_id: string | null;
  tax_id?: string | null;
  email?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  blood_type?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  assigned_doctors?: {
    id: number;
    first_name: string;
    last_name: string;
    specialty?: string | null;
  }[];
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
  source: string;
  created_by: string | null;
  patient_name: string | null;
  doctor_name: string | null;
};

export type AppointmentHistory = {
  id: number;
  appointment_id: number;
  old_status: string | null;
  new_status: string;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
};

export type AppointmentReviewItem = {
  id: number;
  patient_name: string;
  phone_number: string;
  doctor_id: number | null;
  doctor_name: string | null;
  doctor_phone_number: string | null;
  scheduled_start: string;
  scheduled_end: string;
  appointment_type: string;
  reason: string | null;
  source: string;
  review_status: string;
  review_reason: string;
  review_message: string;
  existing_appointment_id: number | null;
  created_at: string;
  updated_at: string;
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
  first_name: string;
  last_name: string;
  gender?: string | null;
  roles: string[];
};

export type ClinicSetting = {
  id: number;
  allow_multi_doctor_visibility: boolean;
  created_at: string;
  updated_at: string;
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
  patient_name: string | null;
  patient_medical_record_number: string | null;
  doctor_name: string | null;
  appointment_scheduled_start: string | null;
  appointment_scheduled_end: string | null;
  template_key: string | null;
  template_title: string | null;
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

export type CommunicationDispatchAttempt = {
  id: number;
  dispatch_id: number;
  attempt_source: string;
  result_status: string;
  attempted_at: string;
  external_reference: string | null;
  error_message: string | null;
  rendered_message: string | null;
  created_at: string;
};

export type ReceptionistAssignedDoctor = {
  id: number;
  first_name: string;
  last_name: string;
  specialty: string | null;
};

export type Receptionist = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
  phone_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_doctors: ReceptionistAssignedDoctor[];
};

export type EmailTemplate = {
  id: number;
  template_key: string;
  title: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EmailTemplatePreview = {
  rendered_subject: string;
  rendered_html_body: string;
  rendered_text_body: string | null;
};

export type EmailDispatch = {
  id: number;
  user_id: number | null;
  template_id: number | null;
  recipient_email: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  template_key: string | null;
  status: string;
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
};
