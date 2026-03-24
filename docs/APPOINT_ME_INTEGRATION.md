# Appoint-Me Integration

## Integration model

`appoint-me` and `do-control` are separate systems with a strict division of responsibility.

Rule:
- `appoint-me` proposes
- `do-control` decides

## Responsibilities

### do-control

- frontend and operational UI
- patient CRUD
- appointment state
- encounter / chart state
- business-rule validation
- doctor and patient resolution
- reminder configuration
- communication templates
- official communication dispatch state
- retry policy
- audit trail

### appoint-me

- WhatsApp send/receive
- AI/Ollama extraction
- operational worker behavior
- scheduler-side polling behavior
- consumes `do-control` integration APIs

It should not be the source of truth for patients, appointments, or clinical records.

## Integration base

- backend base: `http://localhost:18000`
- integrations base: `http://localhost:18000/api/integrations`
- auth header: `x-integration-key`

Current local key:
- `appoint-me-dev-key`

## Expected flow examples

### Appointment proposal

1. `appoint-me` extracts patient/doctor/date intent from WhatsApp
2. `appoint-me` calls `do-control`
3. `do-control` validates doctor, patient resolution, and schedule conflicts
4. `do-control` creates or rejects according to business rules
5. `appoint-me` responds back through WhatsApp

### Communication dispatch flow

1. `do-control` generates official dispatches
2. `appoint-me` polls pending dispatches
3. `appoint-me` attempts delivery
4. `appoint-me` reports `sent`, `delivered`, or `failed`
5. `do-control` stores the official state
6. `do-control` owns retry/backoff policy

## Important communication rule

`appoint-me` must not own official retry scheduling for communication dispatches.

`do-control` already handles:
- retry scheduling
- backoff policy
- terminal failure cutoff
- attempt logs

## Data model expectations

### Patients

- `do-control` owns patient records
- phone is primary operational lookup
- expediente and internal patient id remain stable
- old phone numbers remain searchable through phone history

### Doctors

- `do-control` owns doctor records
- doctor phone is lookup only
- internal `doctor.id` is the stable reference

## Current communication maturity

Already implemented in `do-control`:
- dispatch generation
- manual generation
- internal automatic generation job
- retries/backoff
- batch requeue
- dispatch summary
- attempt logs
- attempt history view

