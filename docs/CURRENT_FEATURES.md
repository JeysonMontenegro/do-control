# Current Features

## Core platform

- Docker-only local environment
- FastAPI backend
- Next.js frontend
- PostgreSQL
- MinIO
- Alembic migrations

## Authentication and roles

- JWT login
- Role-based backend protection
- Role-aware frontend
- Roles:
  - admin
  - doctor
  - receptionist

## Module 1 clinical

- Patient registration
- Patient search
- Auto/manual expediente number
- Guatemala-aligned patient fields:
  - phone
  - DPI via `national_id`
  - NIT via `tax_id`
  - email
- Patient phone history
- Doctor phone history
- Multi-doctor-safe appointment model
- Appointment creation
- Appointment status changes
- Appointment confirm/cancel flows
- Patient summary/history
- Encounter creation
- Encounter close restriction
- Diagnoses
- Prescriptions
- Exam orders
- Exam order `expected_date`
- File attachments with MinIO
- Backend-served attachment access

## Integration with appoint-me

- Patient match
- Patient create
- Doctor verification
- Doctor match
- Proposed appointment
- Appointment confirm
- Appointment cancel
- Appointment schedule lookup
- Pending appointment lookup
- Encounter creation
- Pending communication dispatch polling
- Communication dispatch status callback

## Communications

- Reminder rules
- Communication templates
- Template variable validation
- Template preview with real context
- Communication dispatch generation
- Automatic internal dispatch generation job
- Manual dispatch generation
- Dispatch log
- Dispatch filters
- Dispatch summary
- Manual dispatch status actions
- Single dispatch requeue
- Batch requeue
- Retry/backoff policy
- Dispatch attempt logging
- Dispatch attempt history view

