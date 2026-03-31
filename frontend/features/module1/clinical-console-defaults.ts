import {
  CONFIRMATION_TEMPLATE_KEY,
  DEFAULT_CONFIRMATION_BODY,
  DEFAULT_CONFIRMATION_TITLE,
} from "@/features/module1/console-config";
import { nowPlusMinutes, splitDateTimeLocal } from "@/features/module1/console-utils";
import { DEFAULT_COUNTRY_DIAL_CODE } from "@/features/module1/phone-utils";

export type DoctorClinicForm = {
  clinic_name: string;
  address: string;
  latitude: string;
  longitude: string;
  phone_number: string;
  notes: string;
  is_primary: boolean;
};

export type DoctorAdminForm = {
  first_name: string;
  last_name: string;
  gender: string;
  doctor_title: string;
  date_of_birth: string;
  specialty: string;
  license_number: string;
  primary_phone: string;
  user_email: string;
  user_password: string;
  clinics: DoctorClinicForm[];
};

export type DoctorInviteForm = {
  full_name: string;
  email: string;
  phone_number: string;
};

export function emptyDoctorClinic(): DoctorClinicForm {
  return {
    clinic_name: "",
    address: "",
    latitude: "",
    longitude: "",
    phone_number: "",
    notes: "",
    is_primary: false,
  };
}

export function createDoctorAdminForm(): DoctorAdminForm {
  return {
    first_name: "",
    last_name: "",
    gender: "male",
    doctor_title: "Dr.",
    date_of_birth: "",
    specialty: "",
    license_number: "",
    primary_phone: DEFAULT_COUNTRY_DIAL_CODE,
    user_email: "",
    user_password: "",
    clinics: [emptyDoctorClinic()],
  };
}

export function createDoctorInviteForm(): DoctorInviteForm {
  return {
    full_name: "",
    email: "",
    phone_number: DEFAULT_COUNTRY_DIAL_CODE,
  };
}

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

export function createAppointmentForm() {
  return {
    patient_id: "",
    doctor_id: "",
    scheduled_start_date: splitDateTimeLocal(nowPlusMinutes(60)).date,
    scheduled_start_time: splitDateTimeLocal(nowPlusMinutes(60)).time,
    scheduled_end_date: splitDateTimeLocal(nowPlusMinutes(90)).date,
    scheduled_end_time: splitDateTimeLocal(nowPlusMinutes(90)).time,
    duration_minutes: "30",
    use_manual_end_time: false,
    appointment_type: "follow_up",
    reason: "",
    internal_notes: "",
    source: "receptionist",
    created_by: "frontend-demo",
    notify_patient: true,
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
