import {
  CONFIRMATION_TEMPLATE_KEY,
  DEFAULT_CONFIRMATION_BODY,
  DEFAULT_CONFIRMATION_TITLE,
} from "@/features/module1/console-config";

export function createLoginForm() {
  return {
    email: "doctor@docontrol.local",
    password: "Doctor123!",
  };
}

export function createReminderRuleForm() {
  return {
    doctor_id: "",
    channel: "whatsapp",
    trigger_type: "before_appointment",
    minutes_before: "1440",
    template_key: CONFIRMATION_TEMPLATE_KEY,
    is_active: true,
  };
}

export function createTemplateForm() {
  return {
    doctor_id: "",
    channel: "whatsapp",
    template_key: CONFIRMATION_TEMPLATE_KEY,
    title: DEFAULT_CONFIRMATION_TITLE,
    body: DEFAULT_CONFIRMATION_BODY,
    is_active: true,
  };
}

export function createEmailTemplateForm() {
  return {
    template_key: "welcome_email",
    title: "Bienvenida",
    subject: "Bienvenido a {app_name}",
    html_body: "<p>Hola {recipient_name},</p>",
    text_body: "Hola {recipient_name}",
    is_active: true,
  };
}

export function createProfileForm(phoneNumber = "") {
  return {
    first_name: "",
    last_name: "",
    display_name: "",
    gender: "",
    phone_number: phoneNumber,
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  };
}

export function createPatientForm(doctorId = "") {
  return {
    medical_record_number: "",
    first_name: "",
    last_name: "",
    primary_phone: "",
    national_id: "",
    tax_id: "",
    email: "",
    doctor_id: doctorId,
  };
}

export function createPatientEditForm() {
  return {
    first_name: "",
    last_name: "",
    primary_phone: "",
    national_id: "",
    tax_id: "",
    email: "",
    address: "",
    notes: "",
    is_active: true,
  };
}

export function createReceptionistForm() {
  return {
    first_name: "",
    last_name: "",
    gender: "female",
    phone_number: "",
    email: "",
    password: "",
    doctor_ids: [] as number[],
  };
}

export function createReviewResolutionForm() {
  return {
    action: "create_appointment" as const,
    patient_id: "",
    doctor_id: "",
    appointment_id: "",
    note: "",
  };
}

export function createDispatchStatusForm() {
  return {
    status: "delivered" as const,
    error_message: "Actualización manual",
  };
}
