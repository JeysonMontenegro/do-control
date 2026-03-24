--
-- PostgreSQL database dump
--

\restrict PNkGYUTdHbVtnY1CMzuUaSPUl7rOaGiKfN7vzFvlMT3JMjttPIe86BddZmXyx5N

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO docontrol;

--
-- Name: appointment_history; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.appointment_history (
    id integer NOT NULL,
    appointment_id integer NOT NULL,
    old_status character varying(30),
    new_status character varying(30) NOT NULL,
    change_reason text,
    changed_by character varying(100),
    created_at timestamp with time zone NOT NULL,
    changed_by_user_id integer,
    CONSTRAINT ck_appointment_history_changed_by_not_blank CHECK (((changed_by IS NULL) OR (btrim((changed_by)::text) <> ''::text)))
);


ALTER TABLE public.appointment_history OWNER TO docontrol;

--
-- Name: appointment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.appointment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointment_history_id_seq OWNER TO docontrol;

--
-- Name: appointment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.appointment_history_id_seq OWNED BY public.appointment_history.id;


--
-- Name: appointment_review_items; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.appointment_review_items (
    id integer NOT NULL,
    patient_name character varying(255) NOT NULL,
    phone_number character varying(30) NOT NULL,
    doctor_id integer,
    doctor_name character varying(255),
    doctor_phone_number character varying(30),
    scheduled_start timestamp with time zone NOT NULL,
    scheduled_end timestamp with time zone NOT NULL,
    appointment_type character varying(100) NOT NULL,
    reason text,
    source character varying(30) DEFAULT 'appoint-me'::character varying NOT NULL,
    review_status character varying(30) DEFAULT 'pending_review'::character varying NOT NULL,
    review_reason character varying(50) NOT NULL,
    review_message text NOT NULL,
    existing_appointment_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.appointment_review_items OWNER TO docontrol;

--
-- Name: appointment_review_items_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.appointment_review_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointment_review_items_id_seq OWNER TO docontrol;

--
-- Name: appointment_review_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.appointment_review_items_id_seq OWNED BY public.appointment_review_items.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    scheduled_start timestamp with time zone NOT NULL,
    scheduled_end timestamp with time zone NOT NULL,
    appointment_type character varying(100) NOT NULL,
    reason text,
    status character varying(30) DEFAULT 'scheduled'::character varying NOT NULL,
    confirmation_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    source character varying(30) DEFAULT 'receptionist'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_doctor_id integer,
    created_by_user_id integer,
    CONSTRAINT ck_appointments_confirmation_status CHECK (((confirmation_status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT ck_appointments_created_by_not_blank CHECK (((created_by IS NULL) OR (btrim((created_by)::text) <> ''::text))),
    CONSTRAINT ck_appointments_scheduled_range CHECK ((scheduled_end > scheduled_start)),
    CONSTRAINT ck_appointments_source CHECK (((source)::text = ANY ((ARRAY['receptionist'::character varying, 'appoint-me'::character varying])::text[]))),
    CONSTRAINT ck_appointments_status CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'confirmed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.appointments OWNER TO docontrol;

--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO docontrol;

--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    actor_type character varying(30) NOT NULL,
    actor_id character varying(100),
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(100) NOT NULL,
    before_data json,
    after_data json,
    metadata json,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO docontrol;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO docontrol;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: clinic_settings; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.clinic_settings (
    id integer NOT NULL,
    allow_multi_doctor_visibility boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email_delivery_enabled boolean DEFAULT true NOT NULL,
    welcome_doctor_email_enabled boolean DEFAULT true NOT NULL,
    welcome_receptionist_email_enabled boolean DEFAULT true NOT NULL,
    password_reset_email_enabled boolean DEFAULT true NOT NULL,
    admin_invite_email_enabled boolean DEFAULT true NOT NULL,
    manual_test_email_enabled boolean DEFAULT true NOT NULL,
    manual_resend_email_enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.clinic_settings OWNER TO docontrol;

--
-- Name: clinic_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.clinic_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinic_settings_id_seq OWNER TO docontrol;

--
-- Name: clinic_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.clinic_settings_id_seq OWNED BY public.clinic_settings.id;


--
-- Name: communication_dispatch_attempts; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.communication_dispatch_attempts (
    id integer NOT NULL,
    dispatch_id integer NOT NULL,
    attempt_source character varying(50) DEFAULT 'system'::character varying NOT NULL,
    result_status character varying(30) NOT NULL,
    attempted_at timestamp with time zone NOT NULL,
    external_reference character varying(255),
    error_message text,
    rendered_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.communication_dispatch_attempts OWNER TO docontrol;

--
-- Name: communication_dispatch_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.communication_dispatch_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_dispatch_attempts_id_seq OWNER TO docontrol;

--
-- Name: communication_dispatch_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.communication_dispatch_attempts_id_seq OWNED BY public.communication_dispatch_attempts.id;


--
-- Name: communication_dispatches; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.communication_dispatches (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer,
    appointment_id integer,
    reminder_rule_id integer,
    template_id integer,
    channel character varying(30) DEFAULT 'whatsapp'::character varying NOT NULL,
    recipient_phone character varying(30) NOT NULL,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    external_reference character varying(255),
    rendered_message text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    exam_order_id integer,
    retry_count integer NOT NULL,
    last_attempt_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    owner_doctor_id integer,
    CONSTRAINT ck_communication_dispatches_channel CHECK (((channel)::text = 'whatsapp'::text)),
    CONSTRAINT ck_communication_dispatches_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.communication_dispatches OWNER TO docontrol;

--
-- Name: communication_dispatches_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.communication_dispatches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_dispatches_id_seq OWNER TO docontrol;

--
-- Name: communication_dispatches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.communication_dispatches_id_seq OWNED BY public.communication_dispatches.id;


--
-- Name: communication_templates; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.communication_templates (
    id integer NOT NULL,
    doctor_id integer,
    channel character varying(30) DEFAULT 'whatsapp'::character varying NOT NULL,
    template_key character varying(100) NOT NULL,
    title character varying(150) NOT NULL,
    body text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_doctor_id integer,
    CONSTRAINT ck_communication_templates_body_not_blank CHECK ((btrim(body) <> ''::text)),
    CONSTRAINT ck_communication_templates_channel CHECK (((channel)::text = 'whatsapp'::text)),
    CONSTRAINT ck_communication_templates_template_key_not_blank CHECK ((btrim((template_key)::text) <> ''::text)),
    CONSTRAINT ck_communication_templates_title_not_blank CHECK ((btrim((title)::text) <> ''::text))
);


ALTER TABLE public.communication_templates OWNER TO docontrol;

--
-- Name: communication_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.communication_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_templates_id_seq OWNER TO docontrol;

--
-- Name: communication_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.communication_templates_id_seq OWNED BY public.communication_templates.id;


--
-- Name: diagnoses; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.diagnoses (
    id integer NOT NULL,
    encounter_id integer NOT NULL,
    diagnosis_text text NOT NULL,
    diagnosis_code character varying(50),
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.diagnoses OWNER TO docontrol;

--
-- Name: diagnoses_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.diagnoses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.diagnoses_id_seq OWNER TO docontrol;

--
-- Name: diagnoses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.diagnoses_id_seq OWNED BY public.diagnoses.id;


--
-- Name: doctor_clinics; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.doctor_clinics (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    clinic_name character varying(150) NOT NULL,
    address text,
    phone_number character varying(30),
    notes text,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.doctor_clinics OWNER TO docontrol;

--
-- Name: doctor_clinics_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.doctor_clinics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_clinics_id_seq OWNER TO docontrol;

--
-- Name: doctor_clinics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.doctor_clinics_id_seq OWNED BY public.doctor_clinics.id;


--
-- Name: doctor_phone_numbers; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.doctor_phone_numbers (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    phone_number character varying(30) NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    channel_type character varying(30),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_doctor_phone_numbers_not_blank CHECK ((length(btrim((phone_number)::text)) > 0))
);


ALTER TABLE public.doctor_phone_numbers OWNER TO docontrol;

--
-- Name: doctor_phone_numbers_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.doctor_phone_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_phone_numbers_id_seq OWNER TO docontrol;

--
-- Name: doctor_phone_numbers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.doctor_phone_numbers_id_seq OWNED BY public.doctor_phone_numbers.id;


--
-- Name: doctor_staff_assignments; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.doctor_staff_assignments (
    id integer NOT NULL,
    doctor_id integer NOT NULL,
    staff_user_id integer NOT NULL,
    assignment_type character varying(30) DEFAULT 'receptionist'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_doctor_staff_assignments_type CHECK (((assignment_type)::text = 'receptionist'::text))
);


ALTER TABLE public.doctor_staff_assignments OWNER TO docontrol;

--
-- Name: doctor_staff_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.doctor_staff_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctor_staff_assignments_id_seq OWNER TO docontrol;

--
-- Name: doctor_staff_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.doctor_staff_assignments_id_seq OWNED BY public.doctor_staff_assignments.id;


--
-- Name: doctors; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.doctors (
    id integer NOT NULL,
    license_number character varying(100),
    specialty character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_user_id integer NOT NULL,
    date_of_birth date,
    CONSTRAINT ck_doctors_license_number_not_blank CHECK (((license_number IS NULL) OR (btrim((license_number)::text) <> ''::text))),
    CONSTRAINT ck_doctors_specialty_not_blank CHECK (((specialty IS NULL) OR (btrim((specialty)::text) <> ''::text)))
);


ALTER TABLE public.doctors OWNER TO docontrol;

--
-- Name: doctors_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.doctors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.doctors_id_seq OWNER TO docontrol;

--
-- Name: doctors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.doctors_id_seq OWNED BY public.doctors.id;


--
-- Name: email_dispatches; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.email_dispatches (
    id integer NOT NULL,
    user_id integer,
    template_id integer,
    recipient_email character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    html_body text NOT NULL,
    text_body text,
    template_key character varying(100),
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    provider character varying(50) DEFAULT 'brevo'::character varying NOT NULL,
    provider_message_id character varying(255),
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_email_dispatches_error_message_not_blank CHECK (((error_message IS NULL) OR (btrim(error_message) <> ''::text))),
    CONSTRAINT ck_email_dispatches_html_body_not_blank CHECK ((btrim(html_body) <> ''::text)),
    CONSTRAINT ck_email_dispatches_provider CHECK (((provider)::text = 'brevo'::text)),
    CONSTRAINT ck_email_dispatches_provider_message_id_not_blank CHECK (((provider_message_id IS NULL) OR (btrim((provider_message_id)::text) <> ''::text))),
    CONSTRAINT ck_email_dispatches_recipient_email_not_blank CHECK ((btrim((recipient_email)::text) <> ''::text)),
    CONSTRAINT ck_email_dispatches_retry_count_nonnegative CHECK ((retry_count >= 0)),
    CONSTRAINT ck_email_dispatches_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'skipped'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT ck_email_dispatches_subject_not_blank CHECK ((btrim((subject)::text) <> ''::text)),
    CONSTRAINT ck_email_dispatches_template_key_not_blank CHECK (((template_key IS NULL) OR (btrim((template_key)::text) <> ''::text))),
    CONSTRAINT ck_email_dispatches_text_body_not_blank CHECK (((text_body IS NULL) OR (btrim(text_body) <> ''::text)))
);


ALTER TABLE public.email_dispatches OWNER TO docontrol;

--
-- Name: email_dispatches_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.email_dispatches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_dispatches_id_seq OWNER TO docontrol;

--
-- Name: email_dispatches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.email_dispatches_id_seq OWNED BY public.email_dispatches.id;


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.email_templates (
    id integer NOT NULL,
    template_key character varying(100) NOT NULL,
    title character varying(150) NOT NULL,
    subject character varying(255) NOT NULL,
    html_body text NOT NULL,
    text_body text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_email_templates_html_body_not_blank CHECK ((btrim(html_body) <> ''::text)),
    CONSTRAINT ck_email_templates_subject_not_blank CHECK ((btrim((subject)::text) <> ''::text)),
    CONSTRAINT ck_email_templates_template_key_not_blank CHECK ((btrim((template_key)::text) <> ''::text)),
    CONSTRAINT ck_email_templates_text_body_not_blank CHECK (((text_body IS NULL) OR (btrim(text_body) <> ''::text))),
    CONSTRAINT ck_email_templates_title_not_blank CHECK ((btrim((title)::text) <> ''::text))
);


ALTER TABLE public.email_templates OWNER TO docontrol;

--
-- Name: email_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.email_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_templates_id_seq OWNER TO docontrol;

--
-- Name: email_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.email_templates_id_seq OWNED BY public.email_templates.id;


--
-- Name: encounters; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.encounters (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    appointment_id integer,
    encounter_date timestamp with time zone NOT NULL,
    encounter_type character varying(100) NOT NULL,
    chief_complaint text NOT NULL,
    present_illness text,
    relevant_history text,
    vital_signs text,
    physical_exam text,
    clinical_impression text,
    treatment_plan text,
    follow_up_notes text,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    closed_at timestamp with time zone,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_doctor_id integer,
    created_by_user_id integer,
    CONSTRAINT ck_encounters_created_by_not_blank CHECK (((created_by IS NULL) OR (btrim((created_by)::text) <> ''::text))),
    CONSTRAINT ck_encounters_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'closed'::character varying])::text[])))
);


ALTER TABLE public.encounters OWNER TO docontrol;

--
-- Name: encounters_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.encounters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encounters_id_seq OWNER TO docontrol;

--
-- Name: encounters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.encounters_id_seq OWNED BY public.encounters.id;


--
-- Name: exam_orders; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.exam_orders (
    id integer NOT NULL,
    encounter_id integer NOT NULL,
    exam_name character varying(255) NOT NULL,
    exam_category character varying(100),
    instructions text,
    status character varying(30) DEFAULT 'ordered'::character varying NOT NULL,
    ordered_at timestamp with time zone NOT NULL,
    reviewed_at timestamp with time zone,
    expected_date date,
    CONSTRAINT ck_exam_orders_status CHECK (((status)::text = ANY ((ARRAY['ordered'::character varying, 'pending_result'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.exam_orders OWNER TO docontrol;

--
-- Name: exam_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.exam_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_orders_id_seq OWNER TO docontrol;

--
-- Name: exam_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.exam_orders_id_seq OWNED BY public.exam_orders.id;


--
-- Name: file_attachments; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.file_attachments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    encounter_id integer,
    file_type character varying(50) NOT NULL,
    file_name character varying(255) NOT NULL,
    storage_key character varying(500) NOT NULL,
    content_type character varying(255),
    file_size bigint,
    uploaded_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_doctor_id integer,
    uploaded_by_user_id integer,
    CONSTRAINT ck_file_attachments_content_type_not_blank CHECK (((content_type IS NULL) OR (btrim((content_type)::text) <> ''::text))),
    CONSTRAINT ck_file_attachments_file_name_not_blank CHECK ((btrim((file_name)::text) <> ''::text)),
    CONSTRAINT ck_file_attachments_file_size_positive CHECK (((file_size IS NULL) OR (file_size > 0))),
    CONSTRAINT ck_file_attachments_file_type_not_blank CHECK ((btrim((file_type)::text) <> ''::text)),
    CONSTRAINT ck_file_attachments_storage_key_not_blank CHECK ((btrim((storage_key)::text) <> ''::text)),
    CONSTRAINT ck_file_attachments_uploaded_by_not_blank CHECK (((uploaded_by IS NULL) OR (btrim((uploaded_by)::text) <> ''::text)))
);


ALTER TABLE public.file_attachments OWNER TO docontrol;

--
-- Name: file_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.file_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.file_attachments_id_seq OWNER TO docontrol;

--
-- Name: file_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.file_attachments_id_seq OWNED BY public.file_attachments.id;


--
-- Name: patient_doctor_assignments; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.patient_doctor_assignments (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    doctor_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.patient_doctor_assignments OWNER TO docontrol;

--
-- Name: patient_doctor_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.patient_doctor_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_doctor_assignments_id_seq OWNER TO docontrol;

--
-- Name: patient_doctor_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.patient_doctor_assignments_id_seq OWNED BY public.patient_doctor_assignments.id;


--
-- Name: patient_phone_numbers; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.patient_phone_numbers (
    id integer NOT NULL,
    patient_id integer NOT NULL,
    phone_number character varying(30) NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_patient_phone_numbers_not_blank CHECK ((length(btrim((phone_number)::text)) > 0))
);


ALTER TABLE public.patient_phone_numbers OWNER TO docontrol;

--
-- Name: patient_phone_numbers_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.patient_phone_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patient_phone_numbers_id_seq OWNER TO docontrol;

--
-- Name: patient_phone_numbers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.patient_phone_numbers_id_seq OWNED BY public.patient_phone_numbers.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    medical_record_number character varying(50) NOT NULL,
    first_name character varying(100) NOT NULL,
    middle_name character varying(100),
    last_name character varying(100) NOT NULL,
    second_last_name character varying(100),
    married_name character varying(100),
    sex character varying(20),
    date_of_birth date,
    national_id character varying(50),
    tax_id character varying(50),
    primary_phone character varying(30) NOT NULL,
    secondary_phone character varying(30),
    email character varying(255),
    address text,
    emergency_contact_name character varying(255),
    emergency_contact_phone character varying(30),
    allergies text,
    chronic_conditions text,
    blood_type character varying(10),
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_doctor_id integer NOT NULL,
    CONSTRAINT ck_patients_first_name_not_blank CHECK ((btrim((first_name)::text) <> ''::text)),
    CONSTRAINT ck_patients_last_name_not_blank CHECK ((btrim((last_name)::text) <> ''::text)),
    CONSTRAINT ck_patients_mrn_not_blank CHECK ((btrim((medical_record_number)::text) <> ''::text)),
    CONSTRAINT ck_patients_national_id_not_blank CHECK (((national_id IS NULL) OR (btrim((national_id)::text) <> ''::text))),
    CONSTRAINT ck_patients_primary_phone_not_blank CHECK ((btrim((primary_phone)::text) <> ''::text)),
    CONSTRAINT ck_patients_tax_id_not_blank CHECK (((tax_id IS NULL) OR (btrim((tax_id)::text) <> ''::text)))
);


ALTER TABLE public.patients OWNER TO docontrol;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO docontrol;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.prescription_items (
    id integer NOT NULL,
    prescription_id integer NOT NULL,
    medication_name character varying(255) NOT NULL,
    dosage character varying(255),
    frequency character varying(255),
    duration character varying(255),
    instructions text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.prescription_items OWNER TO docontrol;

--
-- Name: prescription_items_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.prescription_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prescription_items_id_seq OWNER TO docontrol;

--
-- Name: prescription_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.prescription_items_id_seq OWNED BY public.prescription_items.id;


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.prescriptions (
    id integer NOT NULL,
    encounter_id integer NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.prescriptions OWNER TO docontrol;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.prescriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prescriptions_id_seq OWNER TO docontrol;

--
-- Name: prescriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.prescriptions_id_seq OWNED BY public.prescriptions.id;


--
-- Name: reminder_rules; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.reminder_rules (
    id integer NOT NULL,
    doctor_id integer,
    channel character varying(30) DEFAULT 'whatsapp'::character varying NOT NULL,
    trigger_type character varying(30) DEFAULT 'before_appointment'::character varying NOT NULL,
    minutes_before integer NOT NULL,
    template_key character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    owner_doctor_id integer,
    CONSTRAINT ck_reminder_rules_channel CHECK (((channel)::text = 'whatsapp'::text)),
    CONSTRAINT ck_reminder_rules_minutes_before_positive CHECK ((minutes_before > 0)),
    CONSTRAINT ck_reminder_rules_template_key_not_blank CHECK ((btrim((template_key)::text) <> ''::text)),
    CONSTRAINT ck_reminder_rules_trigger_type CHECK (((trigger_type)::text = ANY ((ARRAY['before_appointment'::character varying, 'on_expected_exam_date'::character varying])::text[])))
);


ALTER TABLE public.reminder_rules OWNER TO docontrol;

--
-- Name: reminder_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.reminder_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reminder_rules_id_seq OWNER TO docontrol;

--
-- Name: reminder_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.reminder_rules_id_seq OWNED BY public.reminder_rules.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO docontrol;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO docontrol;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_action_tokens; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.user_action_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action_type character varying(50) NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.user_action_tokens OWNER TO docontrol;

--
-- Name: user_action_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.user_action_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_action_tokens_id_seq OWNER TO docontrol;

--
-- Name: user_action_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.user_action_tokens_id_seq OWNED BY public.user_action_tokens.id;


--
-- Name: user_phone_numbers; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.user_phone_numbers (
    id integer NOT NULL,
    user_id integer NOT NULL,
    phone_number character varying(30) NOT NULL,
    type character varying(30) DEFAULT 'mobile'::character varying NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    can_talk_to_bot boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_user_phone_numbers_not_blank CHECK ((length(btrim((phone_number)::text)) > 0))
);


ALTER TABLE public.user_phone_numbers OWNER TO docontrol;

--
-- Name: user_phone_numbers_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.user_phone_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_phone_numbers_id_seq OWNER TO docontrol;

--
-- Name: user_phone_numbers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.user_phone_numbers_id_seq OWNED BY public.user_phone_numbers.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.user_roles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL
);


ALTER TABLE public.user_roles OWNER TO docontrol;

--
-- Name: user_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.user_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_roles_id_seq OWNER TO docontrol;

--
-- Name: user_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.user_roles_id_seq OWNED BY public.user_roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: docontrol
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    gender character varying(30),
    display_name character varying(150),
    profile_photo_storage_key character varying(255),
    CONSTRAINT ck_users_email_not_blank CHECK ((btrim((email)::text) <> ''::text)),
    CONSTRAINT ck_users_first_name_not_blank CHECK ((btrim((first_name)::text) <> ''::text)),
    CONSTRAINT ck_users_last_name_not_blank CHECK ((btrim((last_name)::text) <> ''::text))
);


ALTER TABLE public.users OWNER TO docontrol;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: docontrol
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO docontrol;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: docontrol
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: appointment_history id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointment_history ALTER COLUMN id SET DEFAULT nextval('public.appointment_history_id_seq'::regclass);


--
-- Name: appointment_review_items id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointment_review_items ALTER COLUMN id SET DEFAULT nextval('public.appointment_review_items_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: clinic_settings id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.clinic_settings ALTER COLUMN id SET DEFAULT nextval('public.clinic_settings_id_seq'::regclass);


--
-- Name: communication_dispatch_attempts id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatch_attempts ALTER COLUMN id SET DEFAULT nextval('public.communication_dispatch_attempts_id_seq'::regclass);


--
-- Name: communication_dispatches id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches ALTER COLUMN id SET DEFAULT nextval('public.communication_dispatches_id_seq'::regclass);


--
-- Name: communication_templates id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_templates ALTER COLUMN id SET DEFAULT nextval('public.communication_templates_id_seq'::regclass);


--
-- Name: diagnoses id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.diagnoses ALTER COLUMN id SET DEFAULT nextval('public.diagnoses_id_seq'::regclass);


--
-- Name: doctor_clinics id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_clinics ALTER COLUMN id SET DEFAULT nextval('public.doctor_clinics_id_seq'::regclass);


--
-- Name: doctor_phone_numbers id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_phone_numbers ALTER COLUMN id SET DEFAULT nextval('public.doctor_phone_numbers_id_seq'::regclass);


--
-- Name: doctor_staff_assignments id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_staff_assignments ALTER COLUMN id SET DEFAULT nextval('public.doctor_staff_assignments_id_seq'::regclass);


--
-- Name: doctors id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctors ALTER COLUMN id SET DEFAULT nextval('public.doctors_id_seq'::regclass);


--
-- Name: email_dispatches id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.email_dispatches ALTER COLUMN id SET DEFAULT nextval('public.email_dispatches_id_seq'::regclass);


--
-- Name: email_templates id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.email_templates ALTER COLUMN id SET DEFAULT nextval('public.email_templates_id_seq'::regclass);


--
-- Name: encounters id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.encounters ALTER COLUMN id SET DEFAULT nextval('public.encounters_id_seq'::regclass);


--
-- Name: exam_orders id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.exam_orders ALTER COLUMN id SET DEFAULT nextval('public.exam_orders_id_seq'::regclass);


--
-- Name: file_attachments id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.file_attachments ALTER COLUMN id SET DEFAULT nextval('public.file_attachments_id_seq'::regclass);


--
-- Name: patient_doctor_assignments id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_doctor_assignments ALTER COLUMN id SET DEFAULT nextval('public.patient_doctor_assignments_id_seq'::regclass);


--
-- Name: patient_phone_numbers id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_phone_numbers ALTER COLUMN id SET DEFAULT nextval('public.patient_phone_numbers_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Name: prescription_items id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.prescription_items ALTER COLUMN id SET DEFAULT nextval('public.prescription_items_id_seq'::regclass);


--
-- Name: prescriptions id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.prescriptions ALTER COLUMN id SET DEFAULT nextval('public.prescriptions_id_seq'::regclass);


--
-- Name: reminder_rules id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.reminder_rules ALTER COLUMN id SET DEFAULT nextval('public.reminder_rules_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: user_action_tokens id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_action_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_action_tokens_id_seq'::regclass);


--
-- Name: user_phone_numbers id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_phone_numbers ALTER COLUMN id SET DEFAULT nextval('public.user_phone_numbers_id_seq'::regclass);


--
-- Name: user_roles id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_roles ALTER COLUMN id SET DEFAULT nextval('public.user_roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: appointment_history appointment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_pkey PRIMARY KEY (id);


--
-- Name: appointment_review_items appointment_review_items_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointment_review_items
    ADD CONSTRAINT appointment_review_items_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: clinic_settings clinic_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_pkey PRIMARY KEY (id);


--
-- Name: communication_dispatch_attempts communication_dispatch_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatch_attempts
    ADD CONSTRAINT communication_dispatch_attempts_pkey PRIMARY KEY (id);


--
-- Name: communication_dispatches communication_dispatches_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches
    ADD CONSTRAINT communication_dispatches_pkey PRIMARY KEY (id);


--
-- Name: communication_templates communication_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_pkey PRIMARY KEY (id);


--
-- Name: diagnoses diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_pkey PRIMARY KEY (id);


--
-- Name: doctor_clinics doctor_clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_clinics
    ADD CONSTRAINT doctor_clinics_pkey PRIMARY KEY (id);


--
-- Name: doctor_phone_numbers doctor_phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_phone_numbers
    ADD CONSTRAINT doctor_phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: doctor_staff_assignments doctor_staff_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_staff_assignments
    ADD CONSTRAINT doctor_staff_assignments_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: email_dispatches email_dispatches_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.email_dispatches
    ADD CONSTRAINT email_dispatches_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: encounters encounters_appointment_id_key; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_appointment_id_key UNIQUE (appointment_id);


--
-- Name: encounters encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_pkey PRIMARY KEY (id);


--
-- Name: exam_orders exam_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.exam_orders
    ADD CONSTRAINT exam_orders_pkey PRIMARY KEY (id);


--
-- Name: file_attachments file_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_pkey PRIMARY KEY (id);


--
-- Name: file_attachments file_attachments_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_storage_key_key UNIQUE (storage_key);


--
-- Name: patient_doctor_assignments patient_doctor_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_doctor_assignments
    ADD CONSTRAINT patient_doctor_assignments_pkey PRIMARY KEY (id);


--
-- Name: patient_phone_numbers patient_phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_phone_numbers
    ADD CONSTRAINT patient_phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_encounter_id_key; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_encounter_id_key UNIQUE (encounter_id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: reminder_rules reminder_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.reminder_rules
    ADD CONSTRAINT reminder_rules_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: communication_templates uq_communication_templates_doctor_channel_key; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT uq_communication_templates_doctor_channel_key UNIQUE (doctor_id, channel, template_key);


--
-- Name: doctor_phone_numbers uq_doctor_phone_numbers_doctor_phone; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_phone_numbers
    ADD CONSTRAINT uq_doctor_phone_numbers_doctor_phone UNIQUE (doctor_id, phone_number);


--
-- Name: doctor_staff_assignments uq_doctor_staff_assignment; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_staff_assignments
    ADD CONSTRAINT uq_doctor_staff_assignment UNIQUE (doctor_id, staff_user_id, assignment_type);


--
-- Name: doctors uq_doctors_linked_user_id; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT uq_doctors_linked_user_id UNIQUE (linked_user_id);


--
-- Name: patient_doctor_assignments uq_patient_doctor_assignment; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_doctor_assignments
    ADD CONSTRAINT uq_patient_doctor_assignment UNIQUE (patient_id, doctor_id);


--
-- Name: patient_phone_numbers uq_patient_phone_numbers_patient_phone; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_phone_numbers
    ADD CONSTRAINT uq_patient_phone_numbers_patient_phone UNIQUE (patient_id, phone_number);


--
-- Name: user_phone_numbers uq_user_phone_numbers_phone_number; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_phone_numbers
    ADD CONSTRAINT uq_user_phone_numbers_phone_number UNIQUE (phone_number);


--
-- Name: user_phone_numbers uq_user_phone_numbers_user_phone; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_phone_numbers
    ADD CONSTRAINT uq_user_phone_numbers_user_phone UNIQUE (user_id, phone_number);


--
-- Name: user_roles uq_user_roles_user_role; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role_id);


--
-- Name: user_action_tokens user_action_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_action_tokens
    ADD CONSTRAINT user_action_tokens_pkey PRIMARY KEY (id);


--
-- Name: user_phone_numbers user_phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_phone_numbers
    ADD CONSTRAINT user_phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_appointment_history_appointment_created; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_appointment_history_appointment_created ON public.appointment_history USING btree (appointment_id, created_at, id);


--
-- Name: ix_appointment_history_changed_by_user_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_appointment_history_changed_by_user_id ON public.appointment_history USING btree (changed_by_user_id);


--
-- Name: ix_appointment_review_items_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_appointment_review_items_doctor_id ON public.appointment_review_items USING btree (doctor_id);


--
-- Name: ix_appointment_review_items_review_status_created; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_appointment_review_items_review_status_created ON public.appointment_review_items USING btree (review_status, created_at, id);


--
-- Name: ix_appointments_created_by_user_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_appointments_created_by_user_id ON public.appointments USING btree (created_by_user_id);


--
-- Name: ix_appointments_doctor_schedule; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_appointments_doctor_schedule ON public.appointments USING btree (doctor_id, scheduled_start, scheduled_end);


--
-- Name: ix_appointments_owner_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_appointments_owner_doctor_id ON public.appointments USING btree (owner_doctor_id);


--
-- Name: ix_communication_dispatch_attempts_dispatch_attempted; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_communication_dispatch_attempts_dispatch_attempted ON public.communication_dispatch_attempts USING btree (dispatch_id, attempted_at, id);


--
-- Name: ix_communication_dispatches_appointment_rule; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_communication_dispatches_appointment_rule ON public.communication_dispatches USING btree (appointment_id, reminder_rule_id);


--
-- Name: ix_communication_dispatches_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_communication_dispatches_doctor_id ON public.communication_dispatches USING btree (doctor_id);


--
-- Name: ix_communication_dispatches_exam_order_rule; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_communication_dispatches_exam_order_rule ON public.communication_dispatches USING btree (exam_order_id, reminder_rule_id);


--
-- Name: ix_communication_dispatches_owner_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_communication_dispatches_owner_doctor_id ON public.communication_dispatches USING btree (owner_doctor_id);


--
-- Name: ix_communication_dispatches_patient_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_communication_dispatches_patient_id ON public.communication_dispatches USING btree (patient_id);


--
-- Name: ix_communication_dispatches_status_next_attempt; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_communication_dispatches_status_next_attempt ON public.communication_dispatches USING btree (status, next_attempt_at);


--
-- Name: ix_communication_templates_owner_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_communication_templates_owner_doctor_id ON public.communication_templates USING btree (owner_doctor_id);


--
-- Name: ix_diagnoses_encounter_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_diagnoses_encounter_id ON public.diagnoses USING btree (encounter_id);


--
-- Name: ix_doctor_clinics_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_doctor_clinics_doctor_id ON public.doctor_clinics USING btree (doctor_id);


--
-- Name: ix_doctor_phone_numbers_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_doctor_phone_numbers_doctor_id ON public.doctor_phone_numbers USING btree (doctor_id);


--
-- Name: ix_doctor_phone_numbers_phone_number; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_doctor_phone_numbers_phone_number ON public.doctor_phone_numbers USING btree (phone_number);


--
-- Name: ix_doctor_staff_assignments_doctor_active; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_doctor_staff_assignments_doctor_active ON public.doctor_staff_assignments USING btree (doctor_id, is_active);


--
-- Name: ix_doctor_staff_assignments_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_doctor_staff_assignments_doctor_id ON public.doctor_staff_assignments USING btree (doctor_id);


--
-- Name: ix_doctor_staff_assignments_staff_active; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_doctor_staff_assignments_staff_active ON public.doctor_staff_assignments USING btree (staff_user_id, is_active);


--
-- Name: ix_doctor_staff_assignments_staff_user_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_doctor_staff_assignments_staff_user_id ON public.doctor_staff_assignments USING btree (staff_user_id);


--
-- Name: ix_email_dispatches_recipient_email; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_email_dispatches_recipient_email ON public.email_dispatches USING btree (recipient_email);


--
-- Name: ix_email_templates_template_key; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX ix_email_templates_template_key ON public.email_templates USING btree (template_key);


--
-- Name: ix_encounters_created_by_user_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_encounters_created_by_user_id ON public.encounters USING btree (created_by_user_id);


--
-- Name: ix_encounters_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_encounters_doctor_id ON public.encounters USING btree (doctor_id);


--
-- Name: ix_encounters_owner_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_encounters_owner_doctor_id ON public.encounters USING btree (owner_doctor_id);


--
-- Name: ix_encounters_patient_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_encounters_patient_id ON public.encounters USING btree (patient_id);


--
-- Name: ix_exam_orders_encounter_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_exam_orders_encounter_id ON public.exam_orders USING btree (encounter_id);


--
-- Name: ix_file_attachments_encounter_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_file_attachments_encounter_id ON public.file_attachments USING btree (encounter_id);


--
-- Name: ix_file_attachments_owner_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_file_attachments_owner_doctor_id ON public.file_attachments USING btree (owner_doctor_id);


--
-- Name: ix_file_attachments_patient_created; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_file_attachments_patient_created ON public.file_attachments USING btree (patient_id, created_at, id);


--
-- Name: ix_file_attachments_uploaded_by_user_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_file_attachments_uploaded_by_user_id ON public.file_attachments USING btree (uploaded_by_user_id);


--
-- Name: ix_patient_doctor_assignments_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_patient_doctor_assignments_doctor_id ON public.patient_doctor_assignments USING btree (doctor_id);


--
-- Name: ix_patient_phone_numbers_patient_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_patient_phone_numbers_patient_id ON public.patient_phone_numbers USING btree (patient_id);


--
-- Name: ix_patient_phone_numbers_phone_number; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_patient_phone_numbers_phone_number ON public.patient_phone_numbers USING btree (phone_number);


--
-- Name: ix_patients_medical_record_number; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX ix_patients_medical_record_number ON public.patients USING btree (medical_record_number);


--
-- Name: ix_patients_name; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_patients_name ON public.patients USING btree (last_name, first_name);


--
-- Name: ix_patients_national_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_patients_national_id ON public.patients USING btree (national_id);


--
-- Name: ix_patients_owner_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_patients_owner_doctor_id ON public.patients USING btree (owner_doctor_id);


--
-- Name: ix_patients_primary_phone; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_patients_primary_phone ON public.patients USING btree (primary_phone);


--
-- Name: ix_reminder_rules_active_doctor_minutes; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_reminder_rules_active_doctor_minutes ON public.reminder_rules USING btree (is_active, doctor_id, minutes_before);


--
-- Name: ix_reminder_rules_doctor_minutes; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_reminder_rules_doctor_minutes ON public.reminder_rules USING btree (doctor_id, minutes_before);


--
-- Name: ix_reminder_rules_owner_doctor_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_reminder_rules_owner_doctor_id ON public.reminder_rules USING btree (owner_doctor_id);


--
-- Name: ix_user_action_tokens_action_type; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_user_action_tokens_action_type ON public.user_action_tokens USING btree (action_type);


--
-- Name: ix_user_action_tokens_expires_at; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_user_action_tokens_expires_at ON public.user_action_tokens USING btree (expires_at);


--
-- Name: ix_user_action_tokens_token_hash; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX ix_user_action_tokens_token_hash ON public.user_action_tokens USING btree (token_hash);


--
-- Name: ix_user_action_tokens_user_id; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_user_action_tokens_user_id ON public.user_action_tokens USING btree (user_id);


--
-- Name: ix_user_phone_numbers_phone_number; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_user_phone_numbers_phone_number ON public.user_phone_numbers USING btree (phone_number);


--
-- Name: ix_user_phone_numbers_user_primary; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE INDEX ix_user_phone_numbers_user_primary ON public.user_phone_numbers USING btree (user_id, is_primary);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: uq_doctor_phone_numbers_primary_active; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX uq_doctor_phone_numbers_primary_active ON public.doctor_phone_numbers USING btree (doctor_id) WHERE ((is_primary = true) AND (is_active = true));


--
-- Name: uq_doctors_license_number; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX uq_doctors_license_number ON public.doctors USING btree (license_number) WHERE (license_number IS NOT NULL);


--
-- Name: uq_patient_phone_numbers_primary_active; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX uq_patient_phone_numbers_primary_active ON public.patient_phone_numbers USING btree (patient_id) WHERE ((is_primary = true) AND (is_active = true));


--
-- Name: uq_reminder_rules_doctor_trigger_channel_minutes; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX uq_reminder_rules_doctor_trigger_channel_minutes ON public.reminder_rules USING btree (doctor_id, trigger_type, channel, minutes_before) WHERE (doctor_id IS NOT NULL);


--
-- Name: uq_reminder_rules_global_trigger_channel_minutes; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX uq_reminder_rules_global_trigger_channel_minutes ON public.reminder_rules USING btree (trigger_type, channel, minutes_before) WHERE (doctor_id IS NULL);


--
-- Name: uq_user_phone_numbers_primary_user; Type: INDEX; Schema: public; Owner: docontrol
--

CREATE UNIQUE INDEX uq_user_phone_numbers_primary_user ON public.user_phone_numbers USING btree (user_id) WHERE (is_primary = true);


--
-- Name: appointment_history appointment_history_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: appointment_history appointment_history_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.users(id);


--
-- Name: appointment_review_items appointment_review_items_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointment_review_items
    ADD CONSTRAINT appointment_review_items_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: appointment_review_items appointment_review_items_existing_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointment_review_items
    ADD CONSTRAINT appointment_review_items_existing_appointment_id_fkey FOREIGN KEY (existing_appointment_id) REFERENCES public.appointments(id);


--
-- Name: appointments appointments_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: appointments appointments_owner_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_owner_doctor_id_fkey FOREIGN KEY (owner_doctor_id) REFERENCES public.doctors(id);


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: communication_dispatch_attempts communication_dispatch_attempts_dispatch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatch_attempts
    ADD CONSTRAINT communication_dispatch_attempts_dispatch_id_fkey FOREIGN KEY (dispatch_id) REFERENCES public.communication_dispatches(id);


--
-- Name: communication_dispatches communication_dispatches_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches
    ADD CONSTRAINT communication_dispatches_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: communication_dispatches communication_dispatches_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches
    ADD CONSTRAINT communication_dispatches_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: communication_dispatches communication_dispatches_owner_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches
    ADD CONSTRAINT communication_dispatches_owner_doctor_id_fkey FOREIGN KEY (owner_doctor_id) REFERENCES public.doctors(id);


--
-- Name: communication_dispatches communication_dispatches_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches
    ADD CONSTRAINT communication_dispatches_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: communication_dispatches communication_dispatches_reminder_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches
    ADD CONSTRAINT communication_dispatches_reminder_rule_id_fkey FOREIGN KEY (reminder_rule_id) REFERENCES public.reminder_rules(id);


--
-- Name: communication_dispatches communication_dispatches_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches
    ADD CONSTRAINT communication_dispatches_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.communication_templates(id);


--
-- Name: communication_templates communication_templates_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: communication_templates communication_templates_owner_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_templates
    ADD CONSTRAINT communication_templates_owner_doctor_id_fkey FOREIGN KEY (owner_doctor_id) REFERENCES public.doctors(id);


--
-- Name: diagnoses diagnoses_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: doctor_clinics doctor_clinics_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_clinics
    ADD CONSTRAINT doctor_clinics_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: doctor_phone_numbers doctor_phone_numbers_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_phone_numbers
    ADD CONSTRAINT doctor_phone_numbers_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: doctor_staff_assignments doctor_staff_assignments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_staff_assignments
    ADD CONSTRAINT doctor_staff_assignments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: doctor_staff_assignments doctor_staff_assignments_staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctor_staff_assignments
    ADD CONSTRAINT doctor_staff_assignments_staff_user_id_fkey FOREIGN KEY (staff_user_id) REFERENCES public.users(id);


--
-- Name: email_dispatches email_dispatches_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.email_dispatches
    ADD CONSTRAINT email_dispatches_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.email_templates(id);


--
-- Name: email_dispatches email_dispatches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.email_dispatches
    ADD CONSTRAINT email_dispatches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: encounters encounters_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: encounters encounters_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: encounters encounters_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: encounters encounters_owner_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_owner_doctor_id_fkey FOREIGN KEY (owner_doctor_id) REFERENCES public.doctors(id);


--
-- Name: encounters encounters_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.encounters
    ADD CONSTRAINT encounters_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: exam_orders exam_orders_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.exam_orders
    ADD CONSTRAINT exam_orders_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: file_attachments file_attachments_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: file_attachments file_attachments_owner_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_owner_doctor_id_fkey FOREIGN KEY (owner_doctor_id) REFERENCES public.doctors(id);


--
-- Name: file_attachments file_attachments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: file_attachments file_attachments_uploaded_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.file_attachments
    ADD CONSTRAINT file_attachments_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id);


--
-- Name: communication_dispatches fk_communication_dispatches_exam_order_id; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.communication_dispatches
    ADD CONSTRAINT fk_communication_dispatches_exam_order_id FOREIGN KEY (exam_order_id) REFERENCES public.exam_orders(id);


--
-- Name: doctors fk_doctors_linked_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT fk_doctors_linked_user_id_users FOREIGN KEY (linked_user_id) REFERENCES public.users(id);


--
-- Name: patients fk_patients_owner_assignment; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT fk_patients_owner_assignment FOREIGN KEY (id, owner_doctor_id) REFERENCES public.patient_doctor_assignments(patient_id, doctor_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: patient_doctor_assignments patient_doctor_assignments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_doctor_assignments
    ADD CONSTRAINT patient_doctor_assignments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: patient_doctor_assignments patient_doctor_assignments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_doctor_assignments
    ADD CONSTRAINT patient_doctor_assignments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_phone_numbers patient_phone_numbers_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patient_phone_numbers
    ADD CONSTRAINT patient_phone_numbers_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patients patients_owner_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_owner_doctor_id_fkey FOREIGN KEY (owner_doctor_id) REFERENCES public.doctors(id);


--
-- Name: prescription_items prescription_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id);


--
-- Name: prescriptions prescriptions_encounter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_encounter_id_fkey FOREIGN KEY (encounter_id) REFERENCES public.encounters(id);


--
-- Name: reminder_rules reminder_rules_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.reminder_rules
    ADD CONSTRAINT reminder_rules_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id);


--
-- Name: reminder_rules reminder_rules_owner_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.reminder_rules
    ADD CONSTRAINT reminder_rules_owner_doctor_id_fkey FOREIGN KEY (owner_doctor_id) REFERENCES public.doctors(id);


--
-- Name: user_action_tokens user_action_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_action_tokens
    ADD CONSTRAINT user_action_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_phone_numbers user_phone_numbers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_phone_numbers
    ADD CONSTRAINT user_phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: docontrol
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict PNkGYUTdHbVtnY1CMzuUaSPUl7rOaGiKfN7vzFvlMT3JMjttPIe86BddZmXyx5N

