# Database Architecture Proposal – do-control (Final Revised for Codex)

## Purpose

This document is a **target-state architecture proposal** for the current do-control schema.  
It is **not** a direct one-shot migration script. Its purpose is to guide Codex and future refactors toward a cleaner, scalable database design that matches the real business model and current MVP needs.

---

# 1. Product Model Clarification

This is **not** a clinic-first architecture right now.

The current product model is:

- Each doctor owns an independent workspace
- Doctors do **not** share data by default
- A receptionist or assistant may be granted access to one doctor, another doctor, or both
- That delegated access does **not** mean the doctors belong to the same tenant or share patients
- The same real-world patient may exist separately under two doctors, because the clinical relationship, diagnoses, prescriptions, and private history are isolated per doctor

This is closer to a **delegated admin / managed account model** than to a real multi-clinic shared organization model.

Because of that, the architecture should be centered on:

- **doctor-owned workspaces**
- **delegated staff access**
- **strict data isolation by doctor owner**
- **future extensibility** toward institutions later, without forcing that now

---

# 2. Core Architectural Principles

## 2.1 Users are the central identity table

All authenticated actors are users:

- doctors
- receptionists
- assistants
- admins
- future staff roles

Identity fields belong only in `users`.

Recommended shared identity fields:

- `email`
- `password_hash`
- `first_name`
- `last_name`
- `gender`
- `date_of_birth`
- `is_active`
- audit timestamps

## 2.2 Doctors are profiles, not separate identities

Doctors should not be a separate identity model.

Instead:

- `users` stores the shared identity
- `doctor_profiles` stores doctor-specific business data

Doctor-specific fields may include:

- `license_number`
- `specialty`
- optional professional configuration fields

## 2.3 Staff access is delegated, not shared ownership

A receptionist should not own data.

Instead:

- the doctor owns the workspace and business data
- the receptionist receives scoped access to act on behalf of that doctor

This is the central concept of the product.

---

# 3. Proposed Core Schema

## 3.1 Users

```sql
users (
  id PK,
  email UNIQUE NOT NULL,
  password_hash NOT NULL,
  first_name NOT NULL,
  last_name NOT NULL,
  gender NULL,
  date_of_birth NULL,
  is_active NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

## 3.2 User phone numbers

Replace a single `users.phone_number` field with a normalized phone table.

```sql
user_phone_numbers (
  id PK,
  user_id FK -> users.id NOT NULL,
  phone_number NOT NULL,
  type NOT NULL, -- bot_primary, mobile, whatsapp, work, contact_info, etc.
  is_primary NOT NULL DEFAULT false,
  is_verified NOT NULL DEFAULT false,
  can_talk_to_bot NOT NULL DEFAULT false,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

### Clarified phone semantics

This product has two distinct phone concepts:

1. **Bot-interaction numbers**
   - doctor phone number that can talk to the bot
   - receptionist phone number that can also talk to the bot
   - if the receptionist is assigned to more than one doctor, the bot must ask on whose behalf the action is being made

2. **Contact/info numbers**
   - clinic phone
   - office contact number
   - informational numbers that are not identity/auth numbers

### Recommendation

Use `user_phone_numbers` for numbers tied to authenticated users and bot interactions.

If later you need office or clinic contact numbers not tied to a specific user, keep those in a separate future table such as:

- `doctor_contact_numbers`
- or later `institution_contact_numbers`

Recommended constraints:

- unique on `(user_id, phone_number)`
- partial unique index for one primary phone per user

---

# 4. Roles, Modules, and Permissions

## 4.1 Roles

Keep roles simple.

```sql
roles (
  id PK,
  name UNIQUE NOT NULL
)

user_roles (
  user_id FK -> users.id NOT NULL,
  role_id FK -> roles.id NOT NULL,
  UNIQUE(user_id, role_id)
)
```

Suggested starting roles:

- doctor
- receptionist
- assistant
- admin

## 4.2 Permissions and module-based authorization

Because the product needs parametrized access, add permissions explicitly.

The recommendation is to support both:

- **module-level permissions**
- **fine-grained action permissions**

Examples:

- `patients.manage`
- `appointments.manage`
- `appointments.create`
- `appointments.edit`
- `appointments.cancel`
- `messages.manage`
- `files.view`
- `files.manage`

```sql
permissions (
  id PK,
  name UNIQUE NOT NULL,
  module NOT NULL,
  action NOT NULL
)

role_permissions (
  role_id FK -> roles.id NOT NULL,
  permission_id FK -> permissions.id NOT NULL,
  UNIQUE(role_id, permission_id)
)
```

Optional direct assignment if needed later:

```sql
user_permissions (
  user_id FK -> users.id NOT NULL,
  permission_id FK -> permissions.id NOT NULL,
  UNIQUE(user_id, permission_id)
)
```

### Practical recommendation for MVP

Start by enabling modules for the receptionist such as:

- patient management
- appointment management

Then grow into finer permissions later without redesigning the schema.

---

# 5. Doctor Profiles

```sql
doctor_profiles (
  id PK,
  linked_user_id FK -> users.id NOT NULL UNIQUE,
  license_number NULL,
  specialty NULL,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

Important:

- `linked_user_id` must be unique
- identity fields must not be duplicated here
- `doctor_profiles` is a 1-to-1 extension of `users`

---

# 6. Delegated Access Model

## 6.1 Doctor staff assignments

This is one of the most important tables for the actual business model.

```sql
doctor_staff_assignments (
  id PK,
  doctor_id FK -> doctor_profiles.id NOT NULL,
  staff_user_id FK -> users.id NOT NULL,
  assignment_type NOT NULL, -- receptionist, assistant, scheduler
  is_active NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL,
  UNIQUE(doctor_id, staff_user_id, assignment_type)
)
```

This table means:

- doctor A can authorize receptionist X
- doctor B can also authorize receptionist X
- receptionist X can operate in both contexts
- doctor A and doctor B still remain isolated from each other

## 6.2 Assignment-scoped permissions

If a receptionist can have different permissions per doctor, add a join table:

```sql
doctor_staff_assignment_permissions (
  id PK,
  assignment_id FK -> doctor_staff_assignments.id NOT NULL,
  permission_id FK -> permissions.id NOT NULL,
  UNIQUE(assignment_id, permission_id)
)
```

This supports cases like:

- receptionist can fully manage appointments for doctor A
- receptionist can only view/manage patients for doctor B
- receptionist can talk to the bot for both, but must choose context when needed

### Recommendation

Even if the initial UI is simple, design this table now because it matches the intended direction.

---

# 7. Ownership Rules

This is the most important design rule.

## 7.1 Every business record should belong to a doctor context

The core business data should belong to one doctor owner:

- patients
- appointments
- templates
- reminder rules
- files
- settings
- communications
- email templates and dispatches

This prevents accidental cross-doctor data leaks.

## 7.2 Staff users act on behalf of the doctor owner

Example:

- a patient belongs to doctor A
- receptionist X creates an appointment
- the appointment still belongs to doctor A
- the actor is receptionist X

So the model should distinguish:

- **owner**
- **actor**

Recommended audit fields:

- `owner_doctor_id`
- `created_by_user_id`
- `updated_by_user_id`

---

# 8. Patients

## 8.1 Doctor-owned patients

Given the clarified business rules, a patient must be unique **per doctor**, not globally shared.

That means the same real-world person may be represented as separate patient records under different doctors.

```sql
patients (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  first_name NOT NULL,
  last_name NOT NULL,
  gender NULL,
  date_of_birth NULL,
  notes NULL,
  is_active NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

### Key rule

The system should **not** assume a globally shared patient identity across doctors.

This is intentional because:

- diagnoses are private
- prescriptions are private
- encounters are private
- the doctor-patient relationship is isolated per doctor workspace

## 8.2 Patient phone numbers

```sql
patient_phone_numbers (
  id PK,
  patient_id FK -> patients.id NOT NULL,
  phone_number NOT NULL,
  type NOT NULL, -- mobile, whatsapp, home, etc.
  is_primary NOT NULL DEFAULT false,
  is_verified NOT NULL DEFAULT false,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

## 8.3 About patient-to-doctor assignments

Under the clarified business rules, `patient_doctor_assignments` is **not needed** as the default model.

### Recommendation

Use:

- `patients.owner_doctor_id`

and do **not** introduce cross-doctor patient sharing by default.

If one day the product adds shared clinical care, then a future controlled sharing table can be added. For now, ownership is enough and safer.

---

# 9. Appointments

Appointments must belong to a doctor context.

```sql
appointments (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  patient_id FK -> patients.id NOT NULL,
  created_by_user_id FK -> users.id NOT NULL,
  updated_by_user_id FK -> users.id NULL,
  status NOT NULL,
  scheduled_for NOT NULL,
  reason NULL,
  source NOT NULL, -- manual, whatsapp, web, phone, import
  created_at NOT NULL,
  updated_at NOT NULL
)
```

Recommended status values:

- scheduled
- confirmed
- checked_in
- completed
- cancelled
- no_show
- rescheduled

Recommended indexes:

- `(owner_doctor_id, scheduled_for)`
- `(patient_id, scheduled_for)`
- `(status, scheduled_for)`

---

# 10. Appointment History

Keep business history separate from technical audit logs.

```sql
appointment_history (
  id PK,
  appointment_id FK -> appointments.id NOT NULL,
  event_type NOT NULL,
  description NULL,
  created_by_user_id FK -> users.id NULL,
  created_at NOT NULL
)
```

Examples:

- appointment_created
- appointment_confirmed
- appointment_cancelled
- reminder_sent
- rescheduled

---

# 11. Clinical Data

## 11.1 Encounters

```sql
encounters (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  patient_id FK -> patients.id NOT NULL,
  appointment_id FK -> appointments.id NULL,
  created_by_user_id FK -> users.id NOT NULL,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

Note: `appointment_id` should be nullable to support encounters created without a formal appointment.

## 11.2 Diagnoses

```sql
diagnoses (
  id PK,
  encounter_id FK -> encounters.id NOT NULL,
  code NULL,
  description NOT NULL,
  created_at NOT NULL
)
```

## 11.3 Prescriptions

```sql
prescriptions (
  id PK,
  encounter_id FK -> encounters.id NOT NULL,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

## 11.4 Prescription items

```sql
prescription_items (
  id PK,
  prescription_id FK -> prescriptions.id NOT NULL,
  medication NOT NULL,
  dosage NULL,
  instructions NULL,
  created_at NOT NULL
)
```

## 11.5 Exam orders

```sql
exam_orders (
  id PK,
  encounter_id FK -> encounters.id NOT NULL,
  exam_type NOT NULL,
  status NOT NULL,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

---

# 12. File Attachments

File attachments are part of the real domain and should stay explicit.

## Recommended approach: specific foreign keys first

```sql
file_attachments (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  patient_id FK -> patients.id NULL,
  encounter_id FK -> encounters.id NULL,
  exam_order_id FK -> exam_orders.id NULL,
  uploaded_by_user_id FK -> users.id NOT NULL,
  file_name NOT NULL,
  storage_key NOT NULL,
  mime_type NULL,
  created_at NOT NULL
)
```

### Recommendation

Prefer specific foreign keys first instead of a polymorphic attachment model unless the system later needs attachments on many unrelated entities.

---

# 13. Messaging, Reminders, and Email

The architecture should explicitly support:

- generic messaging
- reminder rules
- email as a separate channel if needed

## 13.1 Communication templates

Templates should belong to a doctor context.

```sql
communication_templates (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  channel NOT NULL, -- whatsapp, sms, email
  name NOT NULL,
  content NOT NULL,
  is_active NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

## 13.2 Reminder rules

Reminder rules should remain explicit.

```sql
reminder_rules (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  template_id FK -> communication_templates.id NOT NULL,
  trigger_type NOT NULL, -- before_appointment, after_appointment, etc.
  offset_minutes NOT NULL,
  channel NOT NULL,
  is_active NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

Examples:

- 24 hours before appointment
- 2 hours before appointment
- follow-up reminder after encounter

## 13.3 Communication dispatches

```sql
communication_dispatches (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  patient_id FK -> patients.id NOT NULL,
  appointment_id FK -> appointments.id NULL,
  reminder_rule_id FK -> reminder_rules.id NULL,
  template_id FK -> communication_templates.id NULL,
  channel NOT NULL,
  status NOT NULL,
  scheduled_at NULL,
  sent_at NULL,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

## 13.4 Communication dispatch attempts

```sql
communication_dispatch_attempts (
  id PK,
  dispatch_id FK -> communication_dispatches.id NOT NULL,
  status NOT NULL,
  provider_message_id NULL,
  error_message NULL,
  attempted_at NOT NULL
)
```

## 13.5 Email templates

Since email is part of the product needs, keep it explicit.

```sql
email_templates (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  name NOT NULL,
  subject NOT NULL,
  body NOT NULL,
  is_active NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

## 13.6 Email dispatches

```sql
email_dispatches (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL,
  patient_id FK -> patients.id NULL,
  user_id FK -> users.id NULL,
  email_template_id FK -> email_templates.id NULL,
  subject NOT NULL,
  body NOT NULL,
  status NOT NULL,
  scheduled_at NULL,
  sent_at NULL,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

### Recommendation

Keep email-specific tables for now if the pipeline, templates, or provider logic are materially different from other channels.

Later, if the implementation becomes unified, email can be absorbed into the generic communication model.

---

# 14. User Action Tokens

This should remain explicit in the model.

```sql
user_action_tokens (
  id PK,
  user_id FK -> users.id NOT NULL,
  token_hash NOT NULL,
  action_type NOT NULL, -- password_reset, verify_email, invite_acceptance, etc.
  expires_at NOT NULL,
  consumed_at NULL,
  created_at NOT NULL
)
```

Use cases:

- password reset
- email verification
- invite acceptance
- activation flows

Recommended constraints:

- index on `(user_id, action_type)`
- index on `expires_at`
- never store raw tokens; store token hashes

---

# 15. Audit Logs

Technical/legal audit is different from business history.

```sql
audit_logs (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NULL,
  actor_user_id FK -> users.id NULL,
  actor_type NOT NULL, -- user, system, integration
  entity_type NOT NULL,
  entity_id NOT NULL,
  action NOT NULL,
  old_values NULL,
  new_values NULL,
  created_at NOT NULL
)
```

Important distinction:

- `owner_doctor_id` = whose workspace owns the record
- `actor_user_id` = who actually performed the action

This matters greatly when staff acts on behalf of a doctor.

---

# 16. Settings

Instead of clinic settings, use doctor-scoped settings for now.

```sql
doctor_settings (
  id PK,
  owner_doctor_id FK -> doctor_profiles.id NOT NULL UNIQUE,
  timezone NULL,
  appointment_duration_minutes NULL,
  messaging_enabled NOT NULL DEFAULT true,
  email_enabled NOT NULL DEFAULT true,
  bot_enabled NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

---

# 17. Future Institution / Clinic Layer

The product may later grow into a more formal organization model.

That future model could include:

- `institutions`
- `institution_doctors`
- `institution_staff`
- institution-level settings
- institution-level reporting
- institution-level branding/templates

But that should be introduced **later**, only when the product actually needs shared organization behavior.

For now:

- keep the MVP centered on doctor-owned workspaces
- do not force a clinic-first abstraction prematurely
- leave room for institution support later

---

# 18. Direct Next Steps for Codex

These are the best practical next steps.

## 18.1 Keep the users/doctors normalization already done

Do not revert it.

## 18.2 Normalize phone numbers next

Replace:

- `users.phone_number`

with:

- `user_phone_numbers`

Also separate:

- user/bot numbers
- informational contact numbers

## 18.3 Add delegated access tables

Implement:

- `doctor_staff_assignments`
- optionally `doctor_staff_assignment_permissions`

## 18.4 Make patients doctor-owned

Use:

- `patients.owner_doctor_id`

and avoid global/shared patients

## 18.5 Replace string actor fields

Change string actor fields like:

- `created_by`
- `updated_by`

into relational fields like:

- `created_by_user_id`
- `updated_by_user_id`

## 18.6 Keep reminders, tokens, files, and email explicit

These are part of the current real domain and should stay visible in the target architecture.

## 18.7 Keep the architecture small but extensible

Do not overbuild institutions/clinics yet, but leave clear extension points for later.

---

# 19. Final Recommendation

The best target-state architecture for the currently described business is:

- `users` as the identity table
- `doctor_profiles` as a 1-to-1 doctor extension of users
- doctor-owned workspaces for business data
- explicit delegated access through `doctor_staff_assignments`
- module-based and permission-based authorization
- normalized phone numbers with bot-aware semantics
- patients unique per doctor, not globally shared
- explicit messaging, reminder, file, token, and email models
- separate ownership and actor fields
- future institution support later, without forcing it into the MVP now

This is the most accurate handoff version for Codex based on the current product rules.
