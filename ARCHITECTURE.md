# ARCHITECTURE.md

This document describes the target architecture of Do-Control.

---

## 1. Architecture Style

Do-Control uses:

- Next.js frontend
- FastAPI backend
- PostgreSQL as transactional database
- MinIO as file storage
- JWT authentication
- Docker-based development and deployment portability

The architecture is designed to be:

- modular
- API-first
- portable
- LLM-friendly
- suitable for transactional medical and administrative workflows

---

## 2. High-Level Components

### Frontend
Responsibilities:
- user login
- dashboards
- patient views
- appointment calendar
- encounter forms
- billing screens
- insurance forms
- operational reports
- doctor assistant interface

### Backend
Responsibilities:
- API contracts
- domain logic
- validation
- persistence
- authorization
- audit logging
- integration handling
- file metadata management

### PostgreSQL
Responsibilities:
- transactional data storage
- relational consistency
- reporting source data
- audit persistence

### MinIO
Responsibilities:
- binary file storage
- medical attachments
- insurance documents
- exported PDFs

### appoint-me
External service responsibilities:
- WhatsApp messaging
- reminders
- message parsing
- AI-assisted intent extraction
- notification event forwarding

---

## 3. Domain Module Boundaries

### 3.1 Clinical Module
Contains:
- patients
- appointments
- encounters
- diagnoses
- prescriptions
- exams
- attachments

### 3.2 Administration Module
Contains:
- payments
- cashier
- insurers
- patient insurance
- insurer forms
- accounts receivable
- clinic expenses
- inventory

### 3.3 Intelligence Module
Contains:
- doctor assistant bot
- reminders
- confirmations
- alerts
- summaries
- operational analytics
- AI audit traces

---

## 4. Backend Internal Structure

Recommended structure:

```text
backend/app/
├── api/
├── core/
├── db/
├── models/
├── repositories/
├── schemas/
├── services/
├── integrations/
└── main.py
```

### api/
FastAPI routers and endpoint definitions.

### core/
Application configuration, auth, security, exceptions, shared utilities.

### db/
Database session management, base metadata, initialization helpers.

### models/
SQLAlchemy ORM models.

### repositories/
Data access logic.

### schemas/
Pydantic request and response schemas.

### services/
Business logic and domain orchestration.

### integrations/
Controlled adapters for external systems such as appoint-me.

---

## 5. Request Flow

Typical request flow:

```text
Frontend
  -> API Router
    -> Service
      -> Repository
        -> Database
```

Response flow:

```text
Database
  -> Repository
    -> Service
      -> API Router
        -> Frontend
```

Important rule:
- business rules stay in services
- database access stays in repositories
- routes remain thin

---

## 6. Appointment Flow

### Normal appointment creation
1. user selects patient
2. user selects doctor and time
3. backend validates schedule
4. backend checks overlap rules
5. backend creates appointment
6. backend writes audit record

### appoint-me proposed appointment
1. appoint-me sends proposed appointment payload
2. integration endpoint validates authentication
3. payload is parsed into internal schema
4. appointment service validates business rules
5. if valid, appointment is created or marked pending
6. backend stores audit trail
7. response returned to appoint-me

---

## 7. Clinical Record Flow

1. doctor opens patient record
2. frontend retrieves patient summary and history
3. doctor creates encounter
4. doctor adds notes, diagnoses, prescriptions, and exams
5. files are uploaded to MinIO
6. metadata is stored in PostgreSQL
7. encounter may be closed
8. closed encounter editing requires privileged access or controlled versioning

---

## 8. Billing Flow

1. patient encounter or appointment generates billable service
2. payment is recorded
3. if insurance applies:
   - system calculates patient portion
   - system calculates insurer portion
   - system generates account receivable if needed
4. payment and insurance traces are audited

---

## 9. Doctor Assistant Architecture

The doctor assistant must not query the database directly through the LLM.

Correct pattern:

```text
Doctor question
  -> backend query service
    -> fetch structured patient data
      -> AI summarization layer
        -> response with evidence
```

Rules:
- assistant answers only from retrieved data
- assistant must not invent facts
- assistant must not modify records autonomously
- assistant interactions must be logged

---

## 10. File Handling Architecture

Binary files:
- stored in MinIO

Metadata:
- stored in PostgreSQL

Example metadata fields:
- entity_type
- entity_id
- patient_id
- file_type
- storage_key
- content_type
- uploaded_by
- uploaded_at

This design keeps PostgreSQL efficient and portable.

---

## 11. Authentication and Authorization

### Authentication
JWT-based authentication.

### Authorization
Role-based authorization in backend services and protected endpoints.

Initial roles:
- doctor
- receptionist
- admin
- billing

Important rule:
Frontend restrictions are not enough. Backend must always enforce authorization.

---

## 12. Audit Architecture

Audit is not optional.

Audit logging must exist for:
- appointment changes
- encounter changes
- diagnosis modifications
- payment creation and reversal
- insurer form state changes
- inventory adjustments
- bot interactions
- AI-generated suggestions

Recommended audit fields:
- id
- actor_type
- actor_id
- action
- entity_type
- entity_id
- before_data
- after_data
- created_at

---

## 13. Deployment Design Principles

The system must remain portable.

Requirements:
- all custom services containerized
- environment-driven configuration
- no hardcoded infrastructure assumptions
- PostgreSQL connection via environment variables
- MinIO configuration abstracted behind storage settings

This allows migration later to:
- Cloud Run
- ECS
- Kubernetes
- VM-based Docker deployment

---

## 14. Non-Goals for Early Versions

Early versions should avoid:
- premature microservices
- overly complex event-driven architecture
- multiple databases for the same transactional domain
- direct LLM access to core transactional storage
- uncontrolled automation in scheduling or clinical updates

---

## 15. Evolution Path

### Stage 1
Core transactional platform:
- patients
- appointments
- encounters
- payments

### Stage 2
Administrative growth:
- insurance
- forms
- accounts receivable
- expenses
- inventory

### Stage 3
Operational intelligence:
- reminders
- WhatsApp
- bot assistant
- dashboards
- smart summaries

This sequence keeps data foundations stable before advanced automation is introduced.
