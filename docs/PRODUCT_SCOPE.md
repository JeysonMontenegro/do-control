# Product Scope

## General objective

`do-control` is the core operating system for a multi-doctor medical clinic.

Its purpose is to centralize:
- patient data
- appointments
- clinical records
- operational validations
- reminders and communication rules
- future administrative and billing processes

It is the system of record.

## Product principles

- `do-control` is the source of truth
- multi-doctor by design
- Docker-only local environment
- backend-enforced permissions
- auditable clinical and communication actions
- phone is an operational lookup key, not the permanent identity key

## Module 1: Clinical care

Current functional target:
- patient registration and search
- expedientes / medical record numbers
- appointment scheduling
- appointment confirmation/cancellation/reprogramming support
- encounter / consultation records
- diagnoses
- prescriptions
- exam orders
- clinical history
- attachments

Important identity rules:
- stable patient identity: `patient.id`
- stable business identifier: expediente
- patient operational lookup: phone
- Guatemalan fields:
  - DPI
  - NIT
  - email
- phone history must preserve grouping when numbers change

Important multi-doctor rules:
- stable doctor identity: `doctor.id`
- doctor phone is lookup only
- appointments and encounters must always use `doctor_id`

## Module 2: Administration and billing

Planned target:
- payments
- billing
- insurance providers and plans
- insurance forms
- accounts receivable
- clinic expenses
- inventory

Module 2 is not the current focus, but the platform must stay compatible with it.

## Module 3: Intelligence and operational support

Planned target:
- reminders
- communication workflows
- WhatsApp operational support
- analytics
- audit expansion
- assistance/intelligence features

The communication/reminder foundation for this module is already being built inside `do-control`.

