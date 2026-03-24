# Session Handoff

## Current State
- Repo: `/home/jeyson/Documents/Personal Projects/do-control`
- Main DB hardening pass is complete through Alembic revision `0046_audit_log_quality`.
- Current schema snapshot: `/app/current_db_schema.sql`
  - Host path: `/home/jeyson/Documents/Personal Projects/do-control/backend/current_db_schema.sql`
- Targeted backend verification is passing.
- I did **not** start the follow-up service-layer validation alignment pass.
- User wants to end this session and restart without sandbox, then continue from this handoff.

## Git / Push Blocker
Push to `development` was blocked by GitHub Push Protection because a Brevo/Sendinblue key exists in commit history:
- blocked commit: `cf7a3d43e90110435e888dd207d70fabf0e2e674`
- reported path: `.env:10`

Current guidance already given to user:
- add `.env` to `.gitignore`
- stop tracking `.env`
- rewrite history to remove the secret-containing commit(s)
- rotate/revoke the exposed Brevo key

Sandbox limitation in this session:
- host-side commands fail with `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`
- because of that, I could not run host `git` commands or perform commit/rewrite/push from here

## Files Added/Updated During This DB Pass
Important artifacts:
- `/home/jeyson/Documents/Personal Projects/do-control/backend/current_db_schema.sql`
- `/home/jeyson/Documents/Personal Projects/do-control/backend/refactor_db.md`

## Alembic Revisions Added/Applied
- `0025_add_relationship_indexes`
- `0026_normalize_doctor_identity_fields`
- `0027_user_phone_numbers`
- `0028_doctor_staff_assignments`
- `0029_owner_doctor_fields`
- `0030_patient_owner_attach`
- `0031_actor_user_fks`
- `0032_drop_receptionist`
- `0033_drop_user_phone`
- `0034_phone_schedule_ck`
- `0035_phone_value_ck`
- `0036_unique_user_phone`
- `0037_status_checks`
- `0038_patient_ownership`
- `0039_patient_quality`
- `0040_user_doctor_quality`
- `0041_actor_string_quality`
- `0042_file_attachment_quality`
- `0043_template_reminder_quality`
- `0044_reminder_rule_uniqueness`
- `0045_email_quality`
- `0046_audit_log_quality`

## Major Schema/Model Outcomes
### Identity and doctor normalization
- `users` is the canonical identity source.
- `doctors` no longer duplicates shared identity fields.
- normalized `user_phone_numbers` replaces legacy `users.phone_number`.
- generic `doctor_staff_assignments` replaced `receptionist_doctor_assignments`.

### Ownership model
- doctor-owned records gained `owner_doctor_id` where appropriate.
- `patients.owner_doctor_id` is canonical.
- patient ownership is enforced via a deferred composite FK to `patient_doctor_assignments`.
- file attachments now carry explicit owner doctor.

### Actor foreign keys
- additive `*_user_id` columns were added for actor linkage on appointments/history/encounters/file attachments.
- legacy actor strings remain, but blank strings are now blocked.

### Constraint hardening completed
- phone integrity and primary-phone constraints
- schedule range check on appointments
- enum-like checks for appointment/encounter/exam/reminder/dispatch/template/staff-assignment statuses and channels
- patient data quality checks
- user/doctor data quality checks
- file attachment data quality checks
- communication template and reminder rule quality checks
- reminder rule dedupe and uniqueness indexes
- email template and email dispatch quality checks
- audit log nonblank identity/action/entity checks

## Reminder Rule Note
`0044_reminder_rule_uniqueness` did two things:
- repointed `communication_dispatches.reminder_rule_id = 2` to `1`
- deleted duplicate global reminder rule `id=2`
- added two unique indexes on `reminder_rules`:
  - `uq_reminder_rules_global_trigger_channel_minutes`
  - `uq_reminder_rules_doctor_trigger_channel_minutes`

This was verified live afterward.

## Verification Status
Repeatedly passing targeted checks:
- `python -m compileall /app/app`
- `python -m unittest tests.test_integration_service -v`
- `python -m unittest tests.test_appointment_review_item_http_smoke.AppointmentReviewItemHttpSmokeTests.test_manual_review_item_is_created_for_unresolved_doctor -v`
- `docker compose ps`

Known pre-existing gaps not resolved in this session:
- broader HTTP smoke tests still have environment/auth-related failures such as reCAPTCHA-gated login and a separate existing `422` smoke case.

## Recommended Next Step For New Session
User requested:
- finish git cleanup/commit/push outside sandbox
- then move to frontend UX work
- avoid starting more backend changes before frontend begins

So the next session should do this order:
1. remove secret from history and push successfully
2. preserve backend as-is except for any minimal git hygiene needed
3. start frontend/UX work only

## If You Need To Resume Backend Later
A reasonable next backend task, not yet started, is:
- align service-layer validation everywhere with the DB rules that now exist

But this was intentionally left untouched for now because the user wants to switch focus to frontend after commit/push.
