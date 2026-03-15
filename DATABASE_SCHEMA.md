# DATABASE_SCHEMA.md

This document defines the initial conceptual database model for Do-Control.

It is not the final SQL implementation, but it establishes the target entities and relationships.

---

## 1. General Database Principles

1. PostgreSQL is the source of truth.
2. Clinical and financial data must be relational and auditable.
3. Sensitive records should use soft delete or status transitions, not hard delete.
4. Large files stay in MinIO; PostgreSQL stores file metadata only.
5. Every critical domain should support traceability.

---

## 2. Main Schemas or Domain Groups

Suggested logical grouping:

- core
- clinical
- scheduling
- billing
- insurance
- inventory
- intelligence
- audit

This can be implemented as PostgreSQL schemas or simply as domain groupings inside one schema.

---

## 3. Core Tables

### users
Stores system users.

Fields:
- id
- email
- password_hash
- first_name
- last_name
- is_active
- created_at
- updated_at

### roles
Stores user roles.

Fields:
- id
- name
- description

### user_roles
Many-to-many relation between users and roles.

Fields:
- id
- user_id
- role_id

---

## 4. Clinical Tables

### patients
Stores patient identity data.

Fields:
- id
- medical_record_number
- first_name
- middle_name
- last_name
- second_last_name
- married_name
- date_of_birth
- sex
- national_id
- tax_id
- primary_phone
- secondary_phone
- email
- address
- emergency_contact_name
- emergency_contact_phone
- allergies
- chronic_conditions
- blood_type
- notes
- is_active
- created_at
- updated_at

Indexes:
- medical_record_number unique
- national_id index
- primary_phone index
- lower(last_name), lower(first_name) search index

### doctors
Stores doctor data.

Fields:
- id
- user_id
- license_number
- specialty
- is_active
- created_at
- updated_at

### encounters
Stores medical consultations.

Fields:
- id
- patient_id
- doctor_id
- appointment_id nullable
- encounter_date
- encounter_type
- chief_complaint
- present_illness
- relevant_history
- vital_signs
- physical_exam
- clinical_impression
- treatment_plan
- follow_up_notes
- status
- closed_at nullable
- created_by
- created_at
- updated_at

Statuses:
- draft
- closed
- cancelled

### diagnoses
Stores diagnoses linked to encounters.

Fields:
- id
- encounter_id
- diagnosis_text
- diagnosis_code nullable
- is_primary
- notes
- created_at

### prescriptions
Stores prescription headers.

Fields:
- id
- encounter_id
- notes
- created_at

### prescription_items
Stores prescription medications.

Fields:
- id
- prescription_id
- medication_name
- dosage
- frequency
- duration
- instructions
- created_at

### exam_orders
Stores requested exams.

Fields:
- id
- encounter_id
- exam_name
- exam_category
- instructions
- status
- ordered_at
- reviewed_at nullable

Statuses:
- ordered
- pending_result
- result_uploaded
- reviewed
- cancelled

### file_attachments
Stores file metadata.

Fields:
- id
- patient_id
- encounter_id nullable
- exam_order_id nullable
- file_type
- file_name
- storage_key
- content_type
- file_size
- uploaded_by
- created_at

Examples of file_type:
- lab_result
- ultrasound
- insurance_document
- prescription_pdf
- scan
- image

---

## 5. Scheduling Tables

### appointments
Stores clinic appointments.

Fields:
- id
- patient_id
- doctor_id
- scheduled_start
- scheduled_end
- appointment_type
- reason
- status
- confirmation_status
- source
- created_by
- created_at
- updated_at

Statuses:
- scheduled
- confirmed
- cancelled
- rescheduled
- in_progress
- completed
- no_show

Confirmation statuses:
- pending
- confirmed
- cancelled
- requested_reschedule
- no_response

Sources:
- receptionist
- phone
- whatsapp
- web
- integration

### appointment_history
Stores appointment state changes.

Fields:
- id
- appointment_id
- old_status
- new_status
- change_reason
- changed_by
- created_at

### doctor_availability
Stores available time blocks.

Fields:
- id
- doctor_id
- weekday
- start_time
- end_time
- is_active

### schedule_blocks
Stores blocked times for vacations, unavailable periods, etc.

Fields:
- id
- doctor_id
- start_datetime
- end_datetime
- reason
- created_at

---

## 6. Billing Tables

### services_catalog
Stores billable services.

Fields:
- id
- code
- name
- description
- default_price
- is_active

### charges
Stores generated charges.

Fields:
- id
- patient_id
- appointment_id nullable
- encounter_id nullable
- service_id
- quantity
- unit_price
- total_amount
- status
- created_at

Statuses:
- pending
- partially_paid
- paid
- cancelled

### payments
Stores payment headers.

Fields:
- id
- patient_id
- charge_id nullable
- total_amount
- payment_method
- reference_number nullable
- received_by
- notes
- created_at

### payment_allocations
Stores how a payment applies to charges.

Fields:
- id
- payment_id
- charge_id
- allocated_amount
- created_at

### cash_registers
Stores cashier sessions.

Fields:
- id
- opened_by
- opened_at
- closed_by nullable
- closed_at nullable
- opening_amount
- closing_amount nullable
- status

Statuses:
- open
- closed

### clinic_expenses
Stores clinic costs and expenses.

Fields:
- id
- category
- description
- provider_name nullable
- amount
- payment_method
- receipt_file_id nullable
- recorded_by
- expense_date
- created_at

---

## 7. Insurance Tables

### insurance_providers
Stores insurers.

Fields:
- id
- name
- contact_name
- phone
- email
- address
- is_active
- created_at

### insurance_plans
Stores insurer plans or products.

Fields:
- id
- provider_id
- name
- description
- is_active
- created_at

### patient_insurances
Stores patient policy data.

Fields:
- id
- patient_id
- provider_id
- plan_id nullable
- policy_number
- affiliate_number
- policy_holder_name
- relationship_to_holder
- valid_from
- valid_until
- coverage_percent nullable
- copay_amount nullable
- deductible_amount nullable
- authorization_required
- is_primary
- status
- created_at
- updated_at

Statuses:
- active
- expired
- suspended

### insurance_service_rates
Stores negotiated rates by insurer and service.

Fields:
- id
- provider_id
- plan_id nullable
- service_id
- negotiated_price
- created_at

### insurance_forms
Stores generated insurer forms.

Fields:
- id
- patient_id
- encounter_id nullable
- provider_id
- form_type
- status
- generated_file_id nullable
- created_by
- created_at
- updated_at

Statuses:
- draft
- generated
- signed
- sent
- approved
- rejected
- expired

### accounts_receivable
Stores pending insurer receivables.

Fields:
- id
- patient_id
- provider_id
- encounter_id nullable
- charge_id nullable
- total_amount
- paid_amount
- outstanding_amount
- expected_payment_date nullable
- status
- notes
- created_at
- updated_at

Statuses:
- pending
- submitted
- under_review
- partially_paid
- paid
- rejected
- cancelled

### receivable_payments
Stores payments received against receivables.

Fields:
- id
- account_receivable_id
- amount
- received_at
- received_by
- reference_number nullable
- notes

---

## 8. Inventory Tables

### inventory_items
Stores materials and supplies.

Fields:
- id
- code
- name
- category
- description
- unit_of_measure
- stock_quantity
- minimum_stock
- unit_cost
- provider_name nullable
- expiration_date nullable
- batch_number nullable
- is_active
- created_at
- updated_at

### inventory_movements
Stores stock changes.

Fields:
- id
- item_id
- movement_type
- quantity
- unit_cost nullable
- reference_type nullable
- reference_id nullable
- notes
- recorded_by
- created_at

Movement types:
- entry
- usage
- adjustment
- expired
- damaged

---

## 9. Intelligence Tables

### conversations
Stores patient communication threads.

Fields:
- id
- patient_id nullable
- external_channel
- external_reference
- status
- created_at
- updated_at

### messages
Stores message history.

Fields:
- id
- conversation_id
- direction
- sender_label
- content
- message_type
- sent_at
- delivery_status
- raw_payload nullable

### reminders
Stores reminder jobs or reminder states.

Fields:
- id
- appointment_id
- reminder_type
- scheduled_for
- sent_at nullable
- status
- created_at

Statuses:
- pending
- sent
- failed
- cancelled

### bot_queries
Stores doctor assistant usage.

Fields:
- id
- user_id
- patient_id nullable
- query_text
- response_text
- evidence_summary nullable
- created_at

### ai_suggestions
Stores AI-generated suggestions.

Fields:
- id
- entity_type
- entity_id
- suggestion_type
- input_summary
- output_text
- approved_by nullable
- approved_at nullable
- created_at

---

## 10. Audit Tables

### audit_logs
Stores auditable actions.

Fields:
- id
- actor_type
- actor_id
- action
- entity_type
- entity_id
- before_data jsonb nullable
- after_data jsonb nullable
- metadata jsonb nullable
- created_at

Examples:
- actor_type: user, integration, system
- action: create, update, cancel, close, approve, reject

---

## 11. Important Relationships

### Patient relationships
- one patient has many appointments
- one patient has many encounters
- one patient has many payments
- one patient has many insurances
- one patient has many file attachments

### Encounter relationships
- one encounter belongs to one patient
- one encounter belongs to one doctor
- one encounter may belong to one appointment
- one encounter has many diagnoses
- one encounter may have one prescription
- one encounter has many exam_orders
- one encounter has many file_attachments

### Appointment relationships
- one appointment belongs to one patient
- one appointment belongs to one doctor
- one appointment has many history entries
- one appointment may lead to one encounter

### Billing relationships
- one charge belongs to one patient
- one payment may allocate to many charges
- one account_receivable may have many receivable_payments

---

## 12. Initial Constraints to Enforce

1. no overlapping appointments for the same doctor and time range
2. medical_record_number must be unique
3. patient primary insurance should be unique among active policies
4. charges and payments should never become negative
5. stock_quantity should never fall below zero through normal operations
6. closed encounters should require controlled editing rules
7. financial and clinical deletions should be replaced by status changes where possible

---

## 13. Initial Search Requirements

Add indexes for:
- patient name
- patient phone
- national_id
- appointment start datetime
- encounter date
- account receivable status
- payment date
- inventory item code

---

## 14. Early MVP Table Priority

### Phase 1
- users
- roles
- user_roles
- patients
- doctors
- appointments
- appointment_history
- encounters
- diagnoses
- prescriptions
- prescription_items
- exam_orders
- file_attachments

### Phase 2
- services_catalog
- charges
- payments
- payment_allocations
- insurance_providers
- insurance_plans
- patient_insurances
- accounts_receivable
- clinic_expenses
- inventory_items
- inventory_movements

### Phase 3
- conversations
- messages
- reminders
- bot_queries
- ai_suggestions
- audit_logs

---

## 15. Final Note

This schema is a conceptual baseline.

Implementation details may evolve, but the following must remain stable:
- domain boundaries
- traceability
- auditability
- relational integrity
- separation between transactional data and binary file storage
