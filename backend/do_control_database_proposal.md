# Database Architecture Proposal – do-control

## Summary

This proposal refines the current schema by:

- Centralizing identity in `users`
- Converting `doctors` into a profile (not identity)
- Introducing proper authorization (`roles` + `permissions`)
- Normalizing phone numbers
- Preparing the system for multi-clinic (multi-tenant)
- Improving long-term scalability and consistency

---

# 1. Core Principles

## 1.1 Users as the central identity

- All system actors (doctors, receptionists, admins, etc.) are **users**
- Identity fields live only in `users`
- No duplication of name, gender, etc. across tables

## 1.2 Profiles instead of separate identity tables

- `doctors` becomes a **doctor profile**
- It stores only doctor-specific data
- Linked 1-to-1 with `users`

## 1.3 Clear separation of concerns

| Concern        | Table |
|----------------|------|
| Identity       | users |
| Authorization  | roles, permissions |
| Business data  | doctors, patients |
| Clinical data  | encounters, diagnoses, prescriptions |

---

# 2. Proposed Schema

## Users

users (
  id PK,
  email UNIQUE,
  password_hash,
  first_name,
  last_name,
  gender,
  date_of_birth,
  is_active,
  created_at,
  updated_at
)

## User Phones

user_phone_numbers (
  id PK,
  user_id FK -> users.id,
  phone_number,
  type,
  is_primary,
  is_verified,
  created_at
)

## Roles & Permissions

roles (
  id PK,
  name UNIQUE
)

permissions (
  id PK,
  name UNIQUE
)

user_roles (
  user_id FK,
  role_id FK,
  UNIQUE(user_id, role_id)
)

role_permissions (
  role_id FK,
  permission_id FK,
  UNIQUE(role_id, permission_id)
)

## Doctor Profiles

doctor_profiles (
  id PK,
  linked_user_id FK UNIQUE -> users.id,
  license_number,
  specialty,
  created_at,
  updated_at
)

## Patients

patients (
  id PK,
  first_name,
  last_name,
  gender,
  date_of_birth,
  created_at,
  updated_at
)

patient_phone_numbers (
  id PK,
  patient_id FK,
  phone_number,
  is_primary
)

## Clinics

clinics (
  id PK,
  name,
  created_at
)

## Appointments

appointments (
  id PK,
  patient_id FK,
  doctor_id FK,
  clinic_id FK,
  status,
  scheduled_for,
  created_by_user_id FK,
  source,
  reason,
  created_at,
  updated_at
)

## Clinical Data

encounters (
  id PK,
  appointment_id FK NULLABLE,
  patient_id FK,
  doctor_id FK,
  created_at
)

diagnoses (
  id PK,
  encounter_id FK,
  code,
  description
)

prescriptions (
  id PK,
  encounter_id FK,
  created_at
)

prescription_items (
  id PK,
  prescription_id FK,
  medication,
  dosage,
  instructions
)

exam_orders (
  id PK,
  encounter_id FK,
  exam_type,
  status
)

## Messaging

message_templates (
  id PK,
  channel,
  content
)

message_dispatches (
  id PK,
  patient_id FK,
  doctor_id FK NULL,
  appointment_id FK NULL,
  channel,
  status,
  scheduled_at
)

message_dispatch_attempts (
  id PK,
  dispatch_id FK,
  status,
  error,
  attempted_at
)

## Audit Logs

audit_logs (
  id PK,
  actor_user_id FK NULL,
  actor_type,
  entity_type,
  entity_id,
  action,
  old_values,
  new_values,
  created_at
)

---

# Final Notes

- Users own identity
- Doctors are profiles
- Patients remain separate
- Add permissions for scalability
- Normalize phones
- Introduce clinics early
