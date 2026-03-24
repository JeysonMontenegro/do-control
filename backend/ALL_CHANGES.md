# ALL_CHANGES

## Summary
This session completed a backend database refactor and hardening pass, produced a current schema dump, and saved handoff files for the next session.

## Main Structural Changes
- Normalized doctor/user identity so shared person data lives in `users` instead of duplicated `doctors` fields.
- Replaced legacy `users.phone_number` with normalized `user_phone_numbers`.
- Replaced `receptionist_doctor_assignments` with generic `doctor_staff_assignments`.
- Added explicit `owner_doctor_id` across doctor-owned records.
- Made `patients.owner_doctor_id` canonical.
- Added additive actor FK columns like `created_by_user_id`, `changed_by_user_id`, and `uploaded_by_user_id`.
- Removed obsolete schema pieces after cutover:
  - dropped `receptionist_doctor_assignments`
  - dropped `users.phone_number`

## Schema Hardening Added
- Added FK/query indexes across relationship-heavy tables.
- Added one-primary-phone constraints for doctor/patient phones.
- Added unique phone constraints and nonblank phone checks.
- Added global unique `user_phone_numbers.phone_number`.
- Added appointment date-range check.
- Added enum-like DB checks for:
  - appointments
  - encounters
  - exam orders
  - communication dispatches
  - reminder rules
  - communication templates
  - doctor staff assignments
  - email dispatches
- Added patient nonblank data checks.
- Added user/doctor nonblank quality checks.
- Added partial unique doctor license index.
- Added file attachment metadata quality checks.
- Added communication template quality checks.
- Added reminder rule quality and uniqueness.
- Added email template and email dispatch quality checks.
- Added audit log nonblank identity/action/entity checks.

## Data Cleanup Performed
- Removed duplicate user phone rows for inactive duplicate users so global unique user phone could be enforced.
- Chose canonical patient ownership from existing assignments.
- Merged duplicate global reminder rules by repointing dispatches and deleting the duplicate.
- Deleted 2 bad dev-only audit rows with blank `entity_id`.

## Alembic Revisions Added/Applied
- `0025_add_relationship_indexes`
- `0026_normalize_doctor_identity_fields`
- `0027_user_phone_numbers`
- `0028_doctor_staff_assignments`
- `0029_owner_doctor_fields`
- `0030_patient_owner_and_attachment_owner`
- `0031_actor_user_fks`
- `0032_drop_receptionist_doctor_assignments`
- `0033_drop_users_phone_number`
- `0034_add_phone_and_schedule_constraints`
- `0035_add_phone_value_constraints`
- `0036_unique_user_phone_numbers`
- `0037_add_status_check_constraints`
- `0038_patient_ownership_constraints`
- `0039_patient_data_quality_checks`
- `0040_user_doctor_data_quality`
- `0041_actor_string_not_blank_checks`
- `0042_file_attachment_quality_checks`
- `0043_template_and_reminder_quality`
- `0044_reminder_rule_uniqueness`
- `0045_email_quality_constraints`
- `0046_audit_log_quality_constraints`

## Important Areas Updated
Main backend changes are under:
- `/home/jeyson/Documents/Personal Projects/do-control/backend/app/models`
- `/home/jeyson/Documents/Personal Projects/do-control/backend/app/services`
- `/home/jeyson/Documents/Personal Projects/do-control/backend/app/repositories`
- `/home/jeyson/Documents/Personal Projects/do-control/backend/alembic/versions`

Important artifacts:
- `/home/jeyson/Documents/Personal Projects/do-control/backend/refactor_db.md`
- `/home/jeyson/Documents/Personal Projects/do-control/backend/current_db_schema.sql`
- `/home/jeyson/Documents/Personal Projects/do-control/backend/SESSION_HANDOFF.md`
- `/home/jeyson/Documents/Personal Projects/do-control/backend/FRONTEND_HANDOFF.md`

## Verification Performed
Repeatedly passed:
- `python -m compileall /app/app`
- `python -m unittest tests.test_integration_service -v`
- `python -m unittest tests.test_appointment_review_item_http_smoke.AppointmentReviewItemHttpSmokeTests.test_manual_review_item_is_created_for_unresolved_doctor -v`
- `docker compose ps`

## Not Started
- Service-layer validation alignment with the new DB rules was not started.
- Frontend UX implementation was not started.

## Git/Push Context
- Host-side git commands could not be run from this session because of the sandbox error:
  - `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`
- Your push was also blocked by GitHub Push Protection because a Brevo key exists in `.env` history.
