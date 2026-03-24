# Database Refactor Plan

## Purpose

This document turns the target-state database proposal into an incremental implementation plan against the current `do-control` schema.

It is designed to be:

- incremental
- reversible where possible
- low-risk for existing behavior
- aligned with the current codebase and current database state

It is not a one-shot migration spec.

---

## Current Direction Already Completed

The following normalization has already been applied:

- shared identity fields for doctors now live in `users`
- `doctors` now behaves as the doctor profile table
- duplicated doctor identity columns were removed from the database

That work should remain in place and be treated as the foundation for the next phases.

---

## Refactor Principles

Each phase should follow the same rollout pattern:

1. add new schema objects
2. backfill existing data
3. dual-write from application code
4. switch reads to the new model
5. enforce stronger constraints
6. remove deprecated schema only after stability

General rules:

- prefer additive migrations first
- keep API behavior stable during transition
- avoid big-bang renames where existing table names are acceptable
- use feature-compatible backfills before making columns non-null
- keep old columns/tables until application reads are fully migrated

---

# Phase 1: Normalize User Phone Numbers

## Goal

Replace `users.phone_number` with a normalized `user_phone_numbers` table without breaking:

- auth/profile behavior
- doctor creation/update flows
- receptionist and assistant login/phone matching
- bot interaction logic

## Why First

This is low-risk and highly foundational.

It improves:

- normalization
- future multi-number support
- bot-aware number semantics
- verification support
- future separation between identity numbers and informational contact numbers

## 1.1 Schema Changes

Add table:

```sql
user_phone_numbers (
  id PK,
  user_id FK -> users.id NOT NULL,
  phone_number NOT NULL,
  type NOT NULL,
  is_primary NOT NULL DEFAULT false,
  is_verified NOT NULL DEFAULT false,
  can_talk_to_bot NOT NULL DEFAULT false,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

Recommended indexes and constraints:

- unique `(user_id, phone_number)`
- index on `phone_number`
- index on `(user_id, is_primary)`
- partial unique index enforcing one primary phone per user where `is_primary = true`

## 1.2 Backfill Strategy

Backfill from existing `users.phone_number`:

- for each user with a non-null phone number, create one `user_phone_numbers` row
- suggested defaults:
  - `type = 'mobile'`
  - `is_primary = true`
  - `is_verified = false`
  - `can_talk_to_bot = true` only if current product behavior assumes that number is bot-capable

## 1.3 Application Updates

Update code to read primary user phone from `user_phone_numbers` instead of `users.phone_number`.

Main affected areas:

- `UserRepository.get_by_phone_number`
- auth/profile reads and writes
- doctor create/update logic where linked user phone is set
- any bot/integration flows that match users by phone number
- any serializers that expose a single user phone number

## 1.4 Transition Strategy

During transition:

- dual-write to both `user_phone_numbers` and legacy `users.phone_number`
- switch reads progressively to `user_phone_numbers`
- keep `users.phone_number` as compatibility only

## 1.5 Cleanup

After all reads/writes use `user_phone_numbers`:

- remove `users.phone_number`

## 1.6 Important Note

This phase should not yet collapse `doctor_phone_numbers`.

At this point there are still two concepts:

- user-owned identity/bot numbers
- doctor contact/operational numbers

Unifying those should happen only after the phone semantics are stable.

---

# Phase 2: Add Delegated Staff Access

## Goal

Replace receptionist-specific assignment modeling with a generic doctor-to-staff assignment model.

This reflects the real business rule:

- doctors own the workspace
- staff acts on behalf of the doctor
- staff may be assigned to multiple doctors
- doctors remain isolated from each other

## Why Second

This unlocks the real authorization model without forcing a full permission system immediately.

It also removes the current receptionist-specific schema bias.

## 2.1 Schema Changes

Add table:

```sql
doctor_staff_assignments (
  id PK,
  doctor_id FK -> doctors.id NOT NULL,
  staff_user_id FK -> users.id NOT NULL,
  assignment_type NOT NULL,
  is_active NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL,
  UNIQUE(doctor_id, staff_user_id, assignment_type)
)
```

Recommended indexes:

- index on `doctor_id`
- index on `staff_user_id`
- index on `(staff_user_id, is_active)`
- optional index on `(doctor_id, is_active)`

## 2.2 Backfill Strategy

Backfill from current `receptionist_doctor_assignments`:

- `doctor_id` maps directly
- `staff_user_id = user_id`
- `assignment_type = 'receptionist'`
- `is_active = true`

## 2.3 Application Updates

Update access-control and doctor visibility logic to use `doctor_staff_assignments`.

Affected areas include:

- doctor accessibility checks
- receptionist assigned-doctor listing
- any route guards or service logic that currently assumes only receptionists can be assigned
- future assistant support

## 2.4 Optional Next Table

If per-assignment permissions are needed, add later:

```sql
doctor_staff_assignment_permissions (
  id PK,
  assignment_id FK -> doctor_staff_assignments.id NOT NULL,
  permission_id FK -> permissions.id NOT NULL,
  UNIQUE(assignment_id, permission_id)
)
```

Do not block the first delegation phase on this unless the UI already requires it.

## 2.5 Transition Strategy

During transition:

- backfill new table
- dual-read if necessary
- gradually move services and authorization logic to new table
- keep `receptionist_doctor_assignments` temporarily as compatibility

## 2.6 Cleanup

After migration is complete:

- remove `receptionist_doctor_assignments`

---

# Phase 3: Introduce Ownership Fields

## Goal

Make doctor ownership explicit for all doctor-scoped business data.

This is the main structural step for aligning the schema with doctor-owned workspaces.

## Why Third

Ownership fields are higher impact than phones or delegated staff assignments.

They affect:

- data isolation
- query patterns
- access control
- audit semantics
- future reporting

## 3.1 Ownership Rule

Every business record that belongs to a doctor workspace should carry `owner_doctor_id` explicitly.

This separates:

- ownership context
- acting user

## 3.2 Priority Tables

Add `owner_doctor_id` in this order:

1. `appointments`
2. `encounters`
3. `communication_templates`
4. `reminder_rules`
5. `communication_dispatches`
6. `email_templates`
7. `email_dispatches`
8. `file_attachments`
9. `audit_logs`
10. `patients`

## 3.3 Backfill Strategy

Backfill from existing relationships:

- `appointments`: use current `doctor_id`
- `encounters`: use current `doctor_id`
- `communication_templates`: infer from current doctor relation
- `reminder_rules`: infer from current doctor relation
- `communication_dispatches`: infer from doctor or appointment/patient chain depending on nullability
- `email_templates`: infer ownership from current usage model
- `email_dispatches`: infer from actor/user/template context
- `file_attachments`: infer from encounter or patient ownership chain once available
- `audit_logs`: owner may be null initially if historical ownership cannot be safely derived

## 3.4 Patients Are Special

`patients` is the most sensitive table in this refactor.

Current schema allows broader relationship patterns through `patient_doctor_assignments`.

Target state says:

- patient belongs to one doctor owner
- same real-world person may exist separately under another doctor

That means the migration needs a deliberate rule for existing data.

### Recommended patient migration strategy

1. add nullable `owner_doctor_id`
2. backfill using a deterministic rule:
   - first choice: assigned doctor if only one exists
   - fallback: doctor from earliest appointment
   - fallback: doctor from earliest encounter
3. identify ambiguous multi-doctor patients
4. review those manually or with a rule before enforcing non-null ownership
5. once stable, remove `patient_doctor_assignments`

Do not rush this step.

## 3.5 Constraints and Indexes

For each ownership field:

- index `owner_doctor_id`
- add composite indexes where access patterns require it
- make non-null only after full backfill and application write support

Examples:

- appointments: `(owner_doctor_id, scheduled_start)`
- encounters: `(owner_doctor_id, created_at)`
- reminder rules: `(owner_doctor_id, is_active)`
- templates: `(owner_doctor_id, is_active)`

---

# Phase 4: Replace String Actor Fields with Foreign Keys

## Goal

Replace free-text actor fields with relational user references.

This improves:

- audit correctness
- reporting
- authorization traceability
- staff-on-behalf-of-doctor visibility

## Why Fourth

This is easier after user and ownership semantics are clearer.

## 4.1 Candidate Fields

Replace or supplement these string fields:

- `appointments.created_by`
- `appointment_history.changed_by`
- `encounters.created_by`
- `file_attachments.uploaded_by`
- any similar actor text columns elsewhere

## 4.2 New FK Fields

Add fields such as:

- `created_by_user_id`
- `updated_by_user_id`
- `changed_by_user_id`
- `uploaded_by_user_id`

## 4.3 Transition Strategy

1. add nullable FK fields
2. dual-write text and FK values
3. backfill historical rows where possible
4. switch reads and serializers to FK-backed references
5. keep text columns only if needed for legacy compatibility
6. remove text actor columns later if no longer necessary

## 4.4 Audit Model Recommendation

When staff acts on behalf of a doctor, preserve both:

- `owner_doctor_id`
- `actor_user_id`

This distinction is important and should remain explicit.

---

# Phase 5: Roles, Permissions, and Scoped Access

## Goal

Evolve from role-only authorization to module/action permissions without breaking current role-based behavior.

## Why Later

The current app can continue functioning with roles plus delegated staff assignments.

Permissions should be introduced after the assignment model exists.

## 5.1 Base Tables

Add:

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

Optional later:

```sql
user_permissions (
  user_id FK -> users.id NOT NULL,
  permission_id FK -> permissions.id NOT NULL,
  UNIQUE(user_id, permission_id)
)
```

## 5.2 MVP Permission Strategy

Seed only the permissions you need first.

Examples:

- `patients.manage`
- `appointments.manage`
- `appointments.create`
- `appointments.edit`
- `appointments.cancel`
- `messages.manage`
- `files.view`
- `files.manage`

## 5.3 Optional Scoped Permissions

If receptionist A should have different capabilities for doctor A and doctor B, then add:

- `doctor_staff_assignment_permissions`

This should come only when the product needs it.

---

# Phase 6: Normalize Doctor and Informational Contact Numbers

## Goal

Separate identity/bot numbers from non-user informational contact numbers.

## Why Later

This depends on Phase 1 being stable first.

## 6.1 Current Situation

There is overlap between:

- `user_phone_numbers` target model
- current `doctor_phone_numbers`

These are not necessarily the same thing.

## 6.2 Target Separation

Use:

- `user_phone_numbers` for authenticated user identity/bot-capable numbers
- a separate table for office/informational/contact numbers if needed

Possible future table:

```sql
doctor_contact_numbers (
  id PK,
  doctor_id FK -> doctors.id NOT NULL,
  phone_number NOT NULL,
  type NOT NULL,
  is_primary NOT NULL DEFAULT false,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

## 6.3 Decision Rule

Only keep `doctor_phone_numbers` as-is if the product truly means:

- numbers owned by the doctor user identity

If they are office or channel numbers, separate them.

---

# Phase 7: Settings Refactor

## Goal

Move from global/clinic-style settings toward doctor-scoped settings.

## Why

The current business model is doctor-owned workspaces, not clinic-first tenancy.

## 7.1 Target

Use a doctor-scoped settings table such as:

```sql
doctor_settings (
  id PK,
  owner_doctor_id FK -> doctors.id NOT NULL UNIQUE,
  timezone NULL,
  appointment_duration_minutes NULL,
  messaging_enabled NOT NULL DEFAULT true,
  email_enabled NOT NULL DEFAULT true,
  bot_enabled NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

## 7.2 Migration Strategy

- evaluate whether current `clinic_settings` is effectively global or doctor-scoped
- if doctor-scoped behavior is needed, add `doctor_settings`
- backfill from existing defaults
- transition reads to doctor-scoped settings
- keep any global fallback only if product still requires it

---

# Phase 8: Final Cleanup of Legacy Relationship Tables and Columns

## Goal

Remove deprecated schema elements after the new model is stable.

## Cleanup Candidates

Depending on earlier phases, remove:

- `users.phone_number`
- `receptionist_doctor_assignments`
- `patient_doctor_assignments`
- string actor fields like `created_by`, `changed_by`, `uploaded_by`
- any doctor phone fields/tables that duplicate normalized user phone data

## Condition for Removal

Only remove legacy schema when:

- backfill is complete
- application no longer reads legacy fields
- tests pass on the new path
- admin/debug queries can rely on the new schema

---

# Suggested Order of Execution

Recommended practical order:

1. normalize `user_phone_numbers`
2. add `doctor_staff_assignments`
3. replace low-risk actor string fields with FK columns
4. add `owner_doctor_id` to appointments, encounters, templates, reminders, dispatches, files, audit logs
5. migrate patients to doctor-owned records
6. remove `patient_doctor_assignments`
7. normalize informational doctor contact numbers if still needed
8. refactor settings to doctor scope
9. remove remaining deprecated schema

---

# Per-Phase Verification Checklist

For each phase:

1. schema migration applies cleanly
2. backfill is idempotent or safely rerunnable
3. application supports dual-write where needed
4. reads are switched only after backfill validation
5. indexes exist for the new access patterns
6. old behavior remains intact during transition
7. smoke tests pass for affected flows when environment permits
8. compose stack remains healthy

---

# Known High-Risk Areas

These need special care:

## Patients ownership migration

This is the highest-risk business migration because it changes the underlying care model.

## Phone semantics

Be explicit about whether a phone number is:

- identity/authentication
- bot-capable
- informational only

## Audit semantics

Do not lose the distinction between:

- owner doctor
- acting user

## Historical data ambiguity

Some old rows may not have enough information for perfect automated ownership or actor backfill.

Allow nullable intermediate states when necessary.

---

# Final Recommendation

Use this as the working implementation roadmap:

- additive first
- dual-write before cutover
- ownership explicit
- actor explicit
- doctor-owned isolation preserved
- no big-bang redesign

The best immediate engineering sequence is:

1. `user_phone_numbers`
2. `doctor_staff_assignments`
3. ownership fields
4. actor foreign keys

That sequence gives the highest architectural value with the lowest breakage risk.


---

# Phase 1 Detailed Implementation Checklist: `user_phone_numbers`

This section translates Phase 1 into concrete work against the current backend.

## Current Schema Touchpoints

The current schema still stores user phone data in:

- `users.phone_number`

Current application behavior depends on that column in several places:

- user lookup by phone in `UserRepository.get_by_phone_number`
- auth profile serialization and update
- doctor creation and update flows
- receptionist creation and update flows
- integration verification and requester matching flows
- doctor/receptionist payload serialization

It also coexists with:

- `doctor_phone_numbers`

That table should remain in place during this phase.

---

## Phase 1A: Add New Table and Backfill

### Migration 1

Add `user_phone_numbers` with these fields:

```sql
user_phone_numbers (
  id PK,
  user_id FK -> users.id NOT NULL,
  phone_number NOT NULL,
  type NOT NULL,
  is_primary NOT NULL DEFAULT false,
  is_verified NOT NULL DEFAULT false,
  can_talk_to_bot NOT NULL DEFAULT false,
  created_at NOT NULL,
  updated_at NOT NULL
)
```

### Required constraints and indexes

- unique `(user_id, phone_number)`
- index on `phone_number`
- index on `(user_id, is_primary)`
- partial unique index for one primary phone per user

### Backfill rules

For every user with non-null `users.phone_number`:

- create one `user_phone_numbers` row
- use:
  - `type = 'mobile'`
  - `is_primary = true`
  - `is_verified = false`
  - `can_talk_to_bot = true`

### Validation queries after backfill

Check counts:

- count of users with non-null `users.phone_number`
- count of inserted `user_phone_numbers`

Check duplicates:

- users with more than one primary phone
- duplicate `(user_id, phone_number)` rows

---

## Phase 1B: Add Backend Model and Relationships

### Add new model

Create:

- `app/models/user_phone_number.py`

Model fields should match the migration.

### Update model registry

Update:

- `app/models/all_models.py`

### Update user model

Update:

- `app/models/user.py`

Add relationship:

- `phone_numbers = relationship(...)`

Keep existing `phone_number` column for now.

---

## Phase 1C: Add Repository Support

### Update user repository

Primary file:

- `app/repositories/user.py`

Changes:

1. add eager loading for `User.phone_numbers`
2. change `get_by_phone_number` to search `user_phone_numbers.phone_number`
3. add helper methods such as:
   - `list_phone_numbers(user_id)`
   - `get_primary_phone(user_id)`
   - `get_phone_number(user_id, phone_number)`
   - `add_phone_number(...)`
   - `unset_primary_phone_numbers(user_id)`
   - `deactivate_primary_phone_numbers(user_id)` only if required by semantics

### Recommended repository behavior

During transition, `get_by_phone_number` should read from `user_phone_numbers` first.

Compatibility fallback to `users.phone_number` is acceptable temporarily if needed for safety.

---

## Phase 1D: Dual-Write Service Logic

### Auth profile flow

Primary file:

- `app/services/auth.py`

Changes:

1. `_serialize_profile` should expose the primary user phone from `user_phone_numbers`
2. `update_profile` should:
   - validate against `user_phone_numbers`
   - update the normalized phone record
   - continue writing `users.phone_number` during transition
3. `_sync_doctor_profile_phone` should continue updating `doctor_phone_numbers` for now

### Doctor flow

Primary file:

- `app/services/doctor.py`

Changes:

1. `create_doctor` should:
   - create the `User`
   - create a primary `user_phone_numbers` row
   - still populate `users.phone_number` during transition
   - continue creating `doctor_phone_numbers` as today
2. `update_doctor` should:
   - update the normalized user phone record
   - keep `users.phone_number` in sync temporarily
   - keep `doctor_phone_numbers` sync behavior unchanged for now
3. serializer output for assigned receptionists should read the primary user phone from the normalized table once available

### Receptionist flow

Primary file:

- `app/services/receptionist.py`

Changes:

1. `create_receptionist` should create a primary `user_phone_numbers` row
2. `update_receptionist` should update normalized phone data when phone changes
3. serializer output should read primary phone from normalized data

---

## Phase 1E: Integration and Bot Flow Updates

Primary file:

- `app/services/integration.py`

Required changes:

1. `verify_user_by_phone` should use normalized phone lookup
2. requester resolution by phone should use normalized phone lookup
3. any doctor/staff identity lookups based on user phone should no longer depend on `users.phone_number`
4. keep doctor primary phone matching through `doctor_phone_numbers` unchanged in this phase

Important distinction:

- user identity lookup should move to `user_phone_numbers`
- doctor professional/contact/bot-number logic may still depend on `doctor_phone_numbers` until the later phone-semantics phase

---

## Phase 1F: Schemas and Serialization

Files likely affected:

- `app/schemas/auth.py`
- `app/schemas/doctor.py`
- `app/schemas/receptionist.py`

Recommendation:

Do not change public API shapes yet.

Keep returning a single `phone_number` field while internally resolving it from:

- primary row in `user_phone_numbers`

This keeps frontend and integration contracts stable.

---

## Phase 1G: Compatibility Window

During this period:

- reads should gradually move to `user_phone_numbers`
- writes should update both:
  - `user_phone_numbers`
  - `users.phone_number`

This phase should stay in place until:

- all user phone reads come from normalized data
- smoke tests for auth/profile/receptionist/doctor/integration flows pass
- no application path relies on direct `users.phone_number`

---

## Phase 1H: Cleanup Migration

### Migration 2

After normalized reads/writes are stable:

- drop `users.phone_number`

Before dropping:

- confirm all repository lookup paths use `user_phone_numbers`
- confirm serializers no longer read directly from `users.phone_number`
- confirm no backfill gaps remain

---

## Phase 1 Verification Checklist

### Schema checks

- `user_phone_numbers` exists
- indexes and unique constraints exist
- backfill row counts match expectations
- one primary phone per user is enforced

### Application checks

- login by email still works
- profile read still returns the expected phone number
- profile update changes the primary phone correctly
- doctor creation still succeeds
- doctor update still succeeds
- receptionist creation/update still succeeds
- integration phone verification still resolves users correctly
- requester phone-based doctor access still works

### Data checks

- every active user with legacy phone has a normalized row
- no user has two primary phone rows
- `users.phone_number` and normalized primary phone remain in sync during transition

### Compose checks

- backend still starts
- migrations apply cleanly
- no query path regresses due to missing eager loads or joins

---

## Suggested Implementation Order Inside Phase 1

1. migration to create `user_phone_numbers`
2. backfill existing user phone data
3. add ORM model and relationships
4. update repository lookup methods
5. dual-write from auth service
6. dual-write from doctor service
7. dual-write from receptionist service
8. switch serializers to normalized primary phone
9. switch integration user-phone lookups fully to normalized table
10. remove direct reads of `users.phone_number`
11. drop legacy `users.phone_number`

---

## Concrete File List for Phase 1

Expected files to touch:

- `alembic/versions/<new_migration>.py`
- `app/models/user.py`
- `app/models/user_phone_number.py`
- `app/models/all_models.py`
- `app/repositories/user.py`
- `app/services/auth.py`
- `app/services/doctor.py`
- `app/services/receptionist.py`
- `app/services/integration.py`
- possibly `app/schemas/auth.py`
- possibly `app/schemas/doctor.py`
- possibly `app/schemas/receptionist.py`
- tests covering auth, doctor, receptionist, and integration phone flows

---

## Notes Before Implementing Phase 1

- Do not remove `doctor_phone_numbers` in this phase.
- Do not change public API contracts unless necessary.
- Do not mix phone normalization with delegated staff refactor in the same migration set.
- Keep the change small enough that rollback is easy.


---

# Phase 2 Detailed Implementation Checklist: `doctor_staff_assignments`

This section translates Phase 2 into concrete work against the current backend.

Because this environment is dev/test data only, the migration can be simpler:

- aggressive backfill is acceptable
- manual cleanup is acceptable if edge cases appear
- we do not need production-grade coexistence for a long period
- we can shorten the compatibility window once the app is updated

---

## Current Schema Touchpoints

The current delegated-access model is receptionist-specific.

Current table:

- `receptionist_doctor_assignments`

Current application usage:

- `User.receptionist_assignments`
- doctor visibility for receptionists
- receptionist create/update flows
- doctor serializers that list assigned receptionists
- route/service logic that assumes the only delegated staff role is `receptionist`

This is the main limitation the refactor should remove.

---

## Phase 2A: Add New Delegated Access Table

### Migration 1

Add table:

```sql
doctor_staff_assignments (
  id PK,
  doctor_id FK -> doctors.id NOT NULL,
  staff_user_id FK -> users.id NOT NULL,
  assignment_type NOT NULL,
  is_active NOT NULL DEFAULT true,
  created_at NOT NULL,
  updated_at NOT NULL,
  UNIQUE(doctor_id, staff_user_id, assignment_type)
)
```

### Recommended indexes

- index on `doctor_id`
- index on `staff_user_id`
- index on `(staff_user_id, is_active)`
- index on `(doctor_id, is_active)`

### Suggested enum values for `assignment_type`

Start with string values in dev if you want flexibility:

- `receptionist`
- `assistant`
- `scheduler`

For now, only `receptionist` needs to be backfilled.

---

## Phase 2B: Backfill Existing Receptionist Assignments

### Backfill rule

For every row in `receptionist_doctor_assignments`:

- `doctor_id = receptionist_doctor_assignments.doctor_id`
- `staff_user_id = receptionist_doctor_assignments.user_id`
- `assignment_type = 'receptionist'`
- `is_active = true`
- copy timestamps if useful, otherwise use current timestamps

### Validation after backfill

Check:

- count of old rows equals count of new backfilled rows for `assignment_type = 'receptionist'`
- duplicates do not exist
- every receptionist assignment is represented in the new table

Because this is test/dev data, if duplicates or junk appear, clean the data directly before continuing.

---

## Phase 2C: Add ORM Model and Relationships

### Add new model

Create:

- `app/models/doctor_staff_assignment.py`

Suggested fields:

- `id`
- `doctor_id`
- `staff_user_id`
- `assignment_type`
- `is_active`
- `created_at`
- `updated_at`

### Update doctor model

Update:

- `app/models/doctor.py`

Add a generic relationship such as:

- `staff_assignments`

This should eventually replace:

- `receptionist_assignments`

### Update user model

Update:

- `app/models/user.py`

Add a generic relationship such as:

- `doctor_staff_assignments`

Keep old receptionist-specific relationships temporarily only if needed for compatibility.

### Update model registry

Update:

- `app/models/all_models.py`

---

## Phase 2D: Repository Refactor

### Doctor repository

Primary file:

- `app/repositories/doctor.py`

Changes:

1. eager load new `staff_assignments`
2. eager load `staff_assignments.staff_user`
3. replace receptionist-specific joins for access checks where possible

### User repository

Primary file:

- `app/repositories/user.py`

Changes:

1. add helpers to manage doctor staff assignments
2. add methods such as:
   - `add_doctor_staff_assignment(...)`
   - `clear_doctor_staff_assignments(user_id, assignment_type=None)`
   - `list_staff_for_doctor(doctor_id)`
   - `list_doctors_for_staff(user_id, assignment_type=None)`
3. keep old receptionist-specific helpers only during transition

---

## Phase 2E: Service Layer Refactor

### Doctor service

Primary file:

- `app/services/doctor.py`

Changes:

1. `accessible_doctor_ids` should stop depending on receptionist-specific assignments
2. doctor serialization should build assigned staff from generic assignments
3. if you still want the API to say `assigned_receptionists`, filter generic assignments where:
   - `assignment_type = 'receptionist'`

Recommendation:

Keep API contract stable for now, but source it from the new table.

### Receptionist service

Primary file:

- `app/services/receptionist.py`

Changes:

1. `create_receptionist` should insert `doctor_staff_assignments` rows instead of `receptionist_doctor_assignments`
2. `update_receptionist` should replace assignments in the new table
3. listing assigned doctors should read from the new table
4. receptionist role creation logic can stay unchanged

### Future assistant support

Once the generic assignment table exists, adding an assistant flow becomes mainly an API/service concern, not a schema redesign.

---

## Phase 2F: Authorization Logic Refactor

Primary areas:

- doctor access checks
- scoped doctor visibility for staff users
- any flow that maps current user to accessible doctors

Recommendation:

Refactor access logic to the following general rule:

- admins: unrestricted
- doctors: access via linked doctor profile
- staff users: access via active `doctor_staff_assignments`

This removes the special-case receptionist assumption from the access layer.

---

## Phase 2G: Compatibility Strategy

Because this is not production data, you can use a shorter compatibility strategy.

Recommended dev/test approach:

1. add new table
2. backfill from old table
3. update code to read/write new table immediately
4. run smoke verification
5. drop old table when stable

You do not need a long dual-write period unless you want extra safety.

---

## Phase 2H: Cleanup Migration

### Migration 2

After the app is using `doctor_staff_assignments`:

- drop `receptionist_doctor_assignments`

Before dropping:

- confirm no repository/service still loads old relationship paths
- confirm doctor access logic is fully migrated
- confirm receptionist CRUD still works

---

## Phase 2 Verification Checklist

### Schema checks

- `doctor_staff_assignments` exists
- unique constraint exists
- indexes exist
- old receptionist assignments were backfilled correctly

### Application checks

- admin still sees all doctors
- doctor still sees only own doctor context
- receptionist still sees assigned doctors
- receptionist create/update still works
- doctor serializer still shows assigned receptionists correctly
- any integration/requester scoped doctor resolution still works if it depends on accessible doctor IDs

### Data checks

- every old receptionist assignment exists in the new table
- no duplicate assignment rows
- inactive handling behaves as expected if used

### Cleanup checks

- no code still depends on `ReceptionistDoctorAssignment`
- old table can be dropped safely

---

## Suggested Implementation Order Inside Phase 2

1. migration to create `doctor_staff_assignments`
2. backfill from `receptionist_doctor_assignments`
3. add ORM model and relationships
4. update repositories
5. update doctor access logic
6. update receptionist create/update/list flows
7. update doctor serialization of assigned staff
8. run verification
9. drop `receptionist_doctor_assignments`

---

## Concrete File List for Phase 2

Expected files to touch:

- `alembic/versions/<new_migration>.py`
- `app/models/doctor_staff_assignment.py`
- `app/models/doctor.py`
- `app/models/user.py`
- `app/models/all_models.py`
- `app/repositories/doctor.py`
- `app/repositories/user.py`
- `app/services/doctor.py`
- `app/services/receptionist.py`
- possibly `app/api/deps.py`
- possibly any service using `accessible_doctor_ids`
- tests for receptionist assignment and doctor scoping

---

## Notes Before Implementing Phase 2

- Keep table name `doctors`; do not rename to `doctor_profiles` in code.
- Keep external API shapes stable where possible.
- Do not mix this phase with patient ownership migration.
- Since this is test data, prefer cleaner schema/application cutover over long compatibility complexity.


---

# Phase 3 Detailed Implementation Checklist: Ownership Fields

This section translates the ownership refactor into concrete work against the current backend.

Because this is dev/test data, we can use pragmatic backfill rules and simplify edge-case handling, especially for historical rows.

---

## Goal

Make doctor ownership explicit on doctor-scoped records using `owner_doctor_id`.

This is the key schema move that aligns the database with the actual product model:

- one doctor owns the workspace
- staff acts inside that doctor context
- data is isolated by doctor owner

---

## Current Ownership Situation

Today ownership is mostly implicit.

Examples:

- `appointments` imply ownership through `doctor_id`
- `encounters` imply ownership through `doctor_id`
- `reminder_rules` imply ownership through `doctor_id`
- `communication_templates` imply ownership through `doctor_id`
- `patients` do not yet have a single explicit owner
- `patient_doctor_assignments` allows a many-to-many model that conflicts with the target architecture

This phase makes ownership explicit instead of inferred.

---

## Phase 3A: Add Ownership Columns to Low-Risk Tables First

### Migration Set 1

Add nullable `owner_doctor_id` to these low-risk tables first:

- `appointments`
- `encounters`
- `communication_templates`
- `reminder_rules`
- `communication_dispatches`
- `email_templates`
- `email_dispatches`
- `file_attachments`
- `audit_logs`

### Indexes

Add indexes immediately:

- `appointments(owner_doctor_id, scheduled_start)`
- `encounters(owner_doctor_id, encounter_date)` or created/updated timestamps depending on access pattern
- `communication_templates(owner_doctor_id)`
- `reminder_rules(owner_doctor_id, is_active)`
- `communication_dispatches(owner_doctor_id, status)`
- `email_templates(owner_doctor_id, is_active)`
- `email_dispatches(owner_doctor_id, status)`
- `file_attachments(owner_doctor_id, created_at)`
- `audit_logs(owner_doctor_id, created_at)`

Do not make these non-null in the first migration.

---

## Phase 3B: Backfill Low-Risk Ownership Fields

### Backfill rules

Use direct deterministic mappings where possible:

- `appointments.owner_doctor_id = appointments.doctor_id`
- `encounters.owner_doctor_id = encounters.doctor_id`
- `communication_templates.owner_doctor_id = communication_templates.doctor_id`
- `reminder_rules.owner_doctor_id = reminder_rules.doctor_id`

For derived tables:

- `communication_dispatches.owner_doctor_id`
  - first use `doctor_id` if present
  - otherwise infer through `appointment_id`
  - otherwise infer through `reminder_rule_id`
  - otherwise infer through patient ownership later if needed
- `email_templates.owner_doctor_id`
  - derive from current usage or set null temporarily if the current model is effectively global
- `email_dispatches.owner_doctor_id`
  - derive from template or user context where possible
- `file_attachments.owner_doctor_id`
  - derive from linked encounter first
  - otherwise derive from patient ownership once patient phase is complete
- `audit_logs.owner_doctor_id`
  - backfill only when the owner can be confidently inferred
  - otherwise keep null

### Verification queries

After backfill, identify null ownership rows per table.

Because this is dev/test data, it is acceptable to manually fix or purge ambiguous rows before tightening constraints.

---

## Phase 3C: Update Application Writes for Low-Risk Tables

Once columns exist, update service-layer writes so new records always set `owner_doctor_id`.

Likely files:

- `app/services/appointment.py`
- `app/services/communication_template.py`
- `app/services/reminder_rule.py`
- `app/services/communication_dispatch.py`
- `app/services/email_service.py`
- `app/services/file_attachment.py`
- audit helpers such as `app/services/audit.py`

Write rule:

- when acting as a doctor, `owner_doctor_id` is that doctor's id
- when acting as staff, `owner_doctor_id` is the doctor context being acted on
- actor user and owner doctor are not interchangeable

---

## Phase 3D: Make Low-Risk Ownership Fields Required

After backfill and write-path migration:

- make `owner_doctor_id` non-null on low-risk tables where every row should belong to a doctor

Expected candidates:

- `appointments`
- `encounters`
- `communication_templates`
- `reminder_rules`
- likely `communication_dispatches`
- likely `file_attachments`

Keep `audit_logs.owner_doctor_id` nullable if some global/system actions do not belong to a doctor context.

---

## Phase 3E: Patient Ownership Refactor

This is the highest-risk ownership step and should be isolated from the low-risk ownership migration.

### Migration Set 2

Add nullable field:

- `patients.owner_doctor_id`

Add index:

- `patients(owner_doctor_id, last_name, first_name)`

### Backfill strategy for patients

Use a deterministic priority:

1. if the patient has exactly one row in `patient_doctor_assignments`, use that doctor
2. else if the patient has appointments with one doctor, use that doctor
3. else if the patient has encounters with one doctor, use that doctor
4. else mark the row ambiguous for manual cleanup

### Dev-data shortcut

Since this is test data, acceptable cleanup options include:

- manually assigning an owner
- deleting ambiguous rows
- splitting data if needed

### Once patient ownership is stable

- make `patients.owner_doctor_id` non-null
- stop using `patient_doctor_assignments`
- plan a cleanup migration to drop `patient_doctor_assignments`

---

## Phase 3F: Replace Ownership Inference in Queries

After ownership fields exist, queries should filter by explicit owner rather than relationship inference.

Examples:

- list patients for doctor: filter by `patients.owner_doctor_id`
- list appointments for doctor: filter by `appointments.owner_doctor_id`
- list reminders/templates/dispatches: filter by `owner_doctor_id`

Benefits:

- clearer authorization
- simpler query plans
- lower leak risk
- better future auditability

---

## Phase 3G: Verification Checklist

### Schema checks

- all new ownership columns exist
- indexes exist
- backfill completed for low-risk tables
- patient ownership nulls are understood and intentional before enforcement

### Application checks

- doctor-scoped list views still work
- staff users only see data for accessible doctors
- appointment creation/update writes correct owner
- reminder/template/dispatch creation writes correct owner
- file uploads write correct owner
- audit rows capture owner when appropriate

### Data checks

- no low-risk table rows remain without owner unless explicitly allowed
- patient ambiguities are resolved before making patient ownership non-null
- derived ownership matches business expectations for sampled rows

---

## Suggested Implementation Order Inside Phase 3

1. add nullable `owner_doctor_id` to low-risk tables
2. backfill low-risk tables
3. update service write paths
4. switch read filters to explicit owner where safe
5. make low-risk ownership non-null
6. add `patients.owner_doctor_id`
7. backfill patients with deterministic rules
8. resolve ambiguous patient rows
9. make `patients.owner_doctor_id` non-null
10. deprecate and remove `patient_doctor_assignments`

---

## Concrete File List for Phase 3

Expected files to touch:

- `alembic/versions/<new_migration>.py`
- `app/models/patient.py`
- `app/models/appointment.py`
- `app/models/encounter.py`
- `app/models/communication_template.py`
- `app/models/reminder_rule.py`
- `app/models/communication_dispatch.py`
- `app/models/email_template.py`
- `app/models/email_dispatch.py`
- `app/models/file_attachment.py`
- `app/models/audit.py`
- relevant repositories for doctor-scoped filtering
- relevant services that create these records
- tests for doctor isolation and staff scoping

---

## Notes Before Implementing Phase 3

- Do not combine patient ownership migration with Phase 1 or Phase 2.
- Backfill low-risk ownership first to reduce ambiguity.
- Treat `patients` as a separate mini-project inside Phase 3.
- Prefer explicit owner filters over inferred doctor joins once fields exist.


---

# Phase 4 Detailed Implementation Checklist: Actor Foreign Keys

This section translates the actor refactor into concrete work against the current backend.

The goal is to stop storing who performed actions as free text and instead use relational user references.

Because this is dev/test data, historical backfill can be pragmatic:

- best-effort mapping is acceptable
- ambiguous legacy values can remain null
- preserving forward correctness matters more than perfect legacy reconstruction

---

## Goal

Replace free-text actor fields with foreign keys to `users`.

This improves:

- auditability
- consistency
- staff-on-behalf-of-doctor traceability
- reporting
- future permission enforcement

This phase should preserve the distinction between:

- `owner_doctor_id`
- acting user

Those are related but not the same.

---

## Current Actor Situation

The current schema still uses string actor fields in several places.

Known examples:

- `appointments.created_by`
- `appointment_history.changed_by`
- `encounters.created_by`
- `file_attachments.uploaded_by`

The exact values stored there may represent:

- email
- display name
- role label
- manual text
- system/integration markers

That means not every historical row will map cleanly to a `users.id`.

---

## Phase 4A: Add Actor FK Columns

### Migration Set 1

Add nullable FK columns first.

Suggested additions:

- `appointments.created_by_user_id`
- `appointments.updated_by_user_id` if update tracking is needed
- `appointment_history.changed_by_user_id`
- `encounters.created_by_user_id`
- `encounters.updated_by_user_id` if update tracking is needed
- `file_attachments.uploaded_by_user_id`

Use foreign keys to `users.id`.

### Indexes

Add indexes on the new actor fields where query or audit access is expected:

- `appointments(created_by_user_id)`
- `appointment_history(changed_by_user_id)`
- `encounters(created_by_user_id)`
- `file_attachments(uploaded_by_user_id)`

Do not remove the legacy text columns in the first migration.

---

## Phase 4B: Backfill Actor Fields Where Possible

### Mapping strategy

Use best-effort mapping rules in this order:

1. if legacy actor value exactly matches a known user email, map by email
2. if legacy actor value matches a unique known display form used in the app, map by that rule
3. if the row was created in a context with a known current user relation, infer from related records if safe
4. otherwise leave the FK null

### Important rule

Do not invent uncertain mappings.

For dev/test data, it is better to leave `*_user_id` null than to insert wrong actor references.

### Practical examples

- `appointments.created_by`
  - if it stores user email, map directly
- `appointment_history.changed_by`
  - map only if values are clearly user-identifiable
- `file_attachments.uploaded_by`
  - infer through request context only if safely available, otherwise null

---

## Phase 4C: Update Write Paths

Once the columns exist, new writes should always set the FK fields.

Likely service files:

- `app/services/appointment.py`
- `app/services/file_attachment.py`
- `app/services/encounter.py` if/when present
- `app/services/audit.py` where business history entries are created
- any route/service that mutates appointment status and writes history

### Write rule

When an authenticated user performs an action:

- write the corresponding `*_user_id`
- optionally continue writing the legacy text column during transition

When the system or integration performs an action without a real user:

- leave the FK null
- preserve context through audit fields such as `actor_type`
- do not create fake users for system actions

---

## Phase 4D: Read Path and Serializer Updates

Update any serializers or service responses that expose actor information.

Recommendation:

- prefer deriving actor display info from the FK relation when present
- fall back to legacy text only during transition

This preserves compatibility while moving toward normalized actor references.

Examples:

- appointment history response can show user name/email derived from `changed_by_user_id`
- file attachment metadata can show uploader derived from `uploaded_by_user_id`

---

## Phase 4E: Audit and Ownership Semantics

This phase should reinforce the intended semantics:

- `owner_doctor_id` = whose workspace owns the record
- `actor_user_id` or equivalent = who performed the action

Examples:

- receptionist updates doctor-owned appointment
  - `owner_doctor_id = doctor`
  - `updated_by_user_id = receptionist`
- doctor uploads file
  - `owner_doctor_id = doctor`
  - `uploaded_by_user_id = doctor's linked user`

These semantics should stay explicit in service code and audit records.

---

## Phase 4F: Compatibility Window

During the transition:

- continue writing legacy text columns if existing API or debug tooling still reads them
- treat FK columns as the new source of truth for new writes
- gradually move reads to FK-backed actor data

Because this is dev/test data, this compatibility window can be short.

Once verified, remove legacy text actor dependencies quickly.

---

## Phase 4G: Cleanup Migration

### Migration Set 2

After all writes and reads use FK actor references:

- drop legacy text actor columns where no longer needed

Likely candidates:

- `appointments.created_by`
- `appointment_history.changed_by`
- `encounters.created_by`
- `file_attachments.uploaded_by`

If any legacy text field still has business value distinct from actor identity, keep it, but rename or clarify semantics before doing so.

---

## Phase 4H: Verification Checklist

### Schema checks

- new actor FK columns exist
- indexes exist
- backfill completed where possible
- no invalid FK references exist

### Application checks

- appointment create/update writes actor FK
- appointment history writes actor FK
- encounter create/update writes actor FK if applicable
- file upload writes uploader FK
- serializers still return expected actor information

### Data checks

- new rows always populate FK actor fields when a real authenticated user exists
- system/integration rows are intentionally null where no user exists
- no wrong guessed backfills were introduced

### Cleanup checks

- no service still depends on legacy text actor columns
- old columns can be dropped safely

---

## Suggested Implementation Order Inside Phase 4

1. add nullable actor FK columns
2. backfill obvious mappings only
3. update write paths for new records
4. switch serializers to prefer FK-backed actor data
5. remove read dependence on legacy text columns
6. drop legacy actor text columns

---

## Concrete File List for Phase 4

Expected files to touch:

- `alembic/versions/<new_migration>.py`
- `app/models/appointment.py`
- `app/models/encounter.py`
- `app/models/file_attachment.py`
- relevant repositories for eager loading actor relationships
- `app/services/appointment.py`
- `app/services/file_attachment.py`
- `app/services/audit.py`
- possibly history serializers/schemas
- tests for actor attribution on appointment/file flows

---

## Notes Before Implementing Phase 4

- Keep actor FK fields nullable initially.
- Do not attempt perfect historical reconstruction.
- Do not conflate actor user with owner doctor.
- Forward correctness matters more than retroactive perfection in this environment.
