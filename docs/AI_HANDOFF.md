# AI Handoff

Date: 2026-03-14
Branch: `development`
Latest pushed commit: `5beaa4c` `add dispatch attempt history view`

## Product context

`do-control` is the source-of-truth clinic platform.

Current architectural rule:
- `appoint-me` proposes
- `do-control` decides

`appoint-me` responsibilities:
- WhatsApp messaging
- AI/Ollama extraction
- scheduler worker behavior
- consumes `do-control` integration APIs

`do-control` responsibilities:
- patients
- appointments
- encounters / chart
- validations and business rules
- reminder rules
- communication templates
- official communication dispatch state
- retries / audit / integration contracts

This is a multi-doctor platform.
- Real keys are internal IDs, not phone numbers.
- Phone numbers are operational lookup fields for both patients and doctors.

## Stack

- Frontend: Next.js
- Backend: FastAPI
- DB: PostgreSQL
- Files: MinIO
- Infra: Docker Compose only

Local dev ports:
- frontend: `http://localhost:13000`
- backend: `http://localhost:18000`

## Current state

### Module 1 clinical

Implemented:
- patients
- expediente via `medical_record_number`
- appointments
- encounters
- diagnoses
- prescriptions
- exam orders
- attachments
- encounter close restriction
- patient summary/history

Guatemala-specific patient data:
- phone is the operational lookup key
- stable identity remains internal `patient.id` + expediente
- patient supports:
  - `national_id` used as DPI for now
  - `tax_id` used as NIT for now
  - `email`
- patient phone history exists via `patient_phone_numbers`

Doctor side:
- doctor phone history exists via `doctor_phone_numbers`
- doctor phone is lookup only
- appointments persist `doctor_id`

### Auth and roles

Implemented:
- JWT login
- roles:
  - admin
  - doctor
  - receptionist
- backend role protection
- frontend role-aware UI

Seeded users:
- `admin@docontrol.local / ChangeMe123!`
- `doctor@docontrol.local / Doctor123!`
- `reception@docontrol.local / Reception123!`

## Integration with appoint-me

Base:
- `http://localhost:18000/api/integrations`

Header:
- `x-integration-key: appoint-me-dev-key`

Implemented integration endpoints:
- patient match
- patient create
- doctor verification by numeric `doctor_id`
- doctor match by phone
- proposed appointment
- appointment confirm
- appointment cancel
- appointment schedule lookup
- pending appointment lookup
- encounter creation
- communication dispatch pending polling
- communication dispatch status callback

Contracts were coordinated through:
- `/home/jeyson/Documents/Personal Projects/contracts-appoint-me_do-docontrol`

Stable contract files exist there, including retries:
- `contracts/communication-dispatch-retries-v1.md`

## Communications state

Implemented:
- reminder rules
- communication templates
- template variable validation
- template preview with real context
- communication dispatch log
- dispatch filters
- dispatch summary
- manual dispatch status actions
- individual requeue
- batch requeue
- automatic retries/backoff
- internal generation job
- dispatch attempt logs
- dispatch attempt history view in frontend

### Reminder / dispatch generation

Implemented triggers:
- `before_appointment`
- `on_expected_exam_date`

Dispatch generation works in three ways:
1. internal periodic job inside backend process
2. manual admin trigger
3. pending polling path still generates due dispatches defensively

Scheduler config in backend settings:
- `dispatch_generation_job_enabled`
- `dispatch_generation_job_interval_seconds`

### Retry policy

On failure callback from `appoint-me`, `do-control` schedules retries automatically:
- retry 1: +5 minutes
- retry 2: +15 minutes
- retry 3: +60 minutes
- retry 4: +180 minutes
- retry 5: terminal failure

`appoint-me` should not own official retry scheduling.

### Attempt logs

New table:
- `communication_dispatch_attempts`

Attempt source values currently used:
- `appoint_me`
- `admin_manual`

Attempt history endpoint:
- `GET /api/communication-dispatches/{dispatch_id}/attempts`

## Important backend files

- `backend/app/main.py`
- `backend/app/core/config.py`
- `backend/app/api/routes/integrations.py`
- `backend/app/api/routes/communication_dispatches.py`
- `backend/app/api/routes/communication_templates.py`
- `backend/app/services/integration.py`
- `backend/app/services/communication_dispatch.py`
- `backend/app/services/communication_template.py`
- `backend/app/services/dispatch_scheduler.py`
- `backend/app/services/appointment.py`
- `backend/app/services/encounter.py`

## Important frontend files

- `frontend/features/module1/clinical-console.tsx`
- `frontend/features/module1/types.ts`
- `frontend/lib/api.ts`

## Recent migrations

- `0010_exam_order_expected_date.py`
- `0011_dispatch_exam_order_and_exam_rule.py`
- `0012_dispatch_retry_backoff.py`
- `0013_dispatch_attempts.py`

## Verified behavior

Verified in Docker during this session:
- backend health OK
- frontend responds on `13000`
- integration endpoints working
- appointment proposal/confirm/cancel flow working
- encounter integration endpoint working
- dispatch pending polling working
- dispatch status callback working
- retries/backoff working
- batch requeue working
- summary endpoint working
- attempt history endpoint working
- internal generation job created new dispatches without manual button/poll dependency

## Known caveats

- working tree currently only shows `__pycache__` changes, no real code changes pending
- do not commit `__pycache__`
- frontend `next dev` logs may still contain old historical error lines after prior hot-reload failures, but current code serves correctly

## Recommended next priorities

1. Expand reminder rule/event model:
   - pending confirmation
   - follow-up
   - post-consultation

2. Add automated tests for:
   - integration contracts
   - retries/backoff
   - dispatch generation
   - role enforcement

3. Improve operations UI:
   - cleaner dispatch/attempt review
   - better patient/appointment navigation

4. Harden audit trail and message lifecycle details if production readiness becomes immediate.

## Git state

Recent commits:
- `5beaa4c` `add dispatch attempt history view`
- `80b10ff` `add dispatch scheduler and attempt logs`
- `25e5f31` `add batch requeue for communication dispatches`
- `da43dbb` `add communication dispatch summary`
- `47676c9` `add manual communication dispatch actions`
- `00b1916` `add communication dispatch log filters`
- `18adaa4` `add communication template preview`
- `8eb13d9` `add dispatch retry backoff and template validation`
- `d7fc383` `implement integration contracts and dispatch automation`

Remote:
- `origin/development` is up to date with latest real work

