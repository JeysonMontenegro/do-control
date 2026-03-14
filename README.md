# Do-Control

# do-control

Do-Control is a medical clinic management platform designed to manage patients, clinical records, appointments, billing, insurance, inventory, and intelligent operational support.

This repository is intended to be **LLM-friendly** from day one.  
All architecture, naming, module boundaries, and code-generation rules should optimize for reliable development with coding agents such as Codex.

Do-Control integrates with an external service called **appoint-me**, which handles WhatsApp messaging, reminders, and AI-assisted message parsing.

---

## System Vision

Do-Control is the **core transactional system** for the clinic.

It is responsible for:

- patient management
- appointments and scheduling
- clinical records
- diagnoses, prescriptions, and exams
- billing and payments
- insurance and insurer forms
- accounts receivable
- clinic expenses
- inventory and supplies
- doctor assistant queries
- reporting and operational intelligence

appoint-me is a separate component and **must never write directly to the database**.  
appoint-me communicates with Do-Control through APIs or controlled integration endpoints.

---

## Main Product Modules

### Module 1. Clinical Care
Includes:

- patients
- appointments
- clinical records
- encounters
- diagnoses
- prescriptions
- exams

### Module 2. Administration and Billing
Includes:

- payments
- cashier operations
- patient insurance
- insurers and agreements
- insurer forms
- accounts receivable
- clinic expenses
- inventory and supplies

### Module 3. Intelligence and Operational Support
Includes:

- doctor assistant bot
- reminders
- confirmations
- WhatsApp integration
- alerts
- smart summaries
- analytics dashboards
- operational audit trails

---

## Technology Stack

### Frontend
- Next.js
- TypeScript
- React

### Backend
- FastAPI
- SQLAlchemy
- Alembic

### Database
- PostgreSQL

### File Storage
- MinIO (S3-compatible)

### Authentication
- JWT

### Containerization
- Docker
- Docker Compose

### Future Deployment Targets
- Cloud Run
- AWS ECS
- Kubernetes
- VM or managed containers

---

## Architecture Principles

1. Modular architecture
2. API-first backend
3. Strict separation of concerns
4. Stateless backend services
5. All custom services containerized
6. Portable infrastructure
7. LLM-friendly code structure
8. Strong typing and explicit contracts
9. Auditability for clinical and financial actions
10. External integrations must never bypass domain rules

---

## High-Level Architecture

```text
Next.js Frontend
        |
        v
FastAPI Backend
        |
        +--> PostgreSQL
        +--> MinIO
        |
        +--> Integration APIs
                |
                v
            appoint-me
   (WhatsApp + Ollama + reminders)
```

---

## Core Business Rule

**appoint-me proposes, Do-Control decides.**

Examples:

- appoint-me may propose an appointment
- Do-Control validates availability and business rules
- only Do-Control persists the final appointment

This principle also applies to:
- reminders
- confirmations
- rescheduling requests
- patient messaging
- AI-assisted workflows

---

## Suggested Monorepo Structure

```text
docontrol/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── integrations/
│   │   └── main.py
│   ├── alembic/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── services/
│   ├── types/
│   ├── Dockerfile
│   └── package.json
├── infrastructure/
│   ├── docker/
│   └── docker-compose.yml
├── docs/
│   ├── README.md
│   ├── PROJECT_RULES.md
│   ├── ARCHITECTURE.md
│   └── DATABASE_SCHEMA.md
└── .env.example
```

---

## Backend Layering

The backend must follow this layered structure:

```text
API Layer
    |
Service Layer
    |
Repository Layer
    |
Database Layer
```

### API layer
- defines routes
- validates request/response schemas
- must not contain domain logic

### Service layer
- contains domain logic
- enforces business rules
- orchestrates repositories and external integrations

### Repository layer
- database access only
- no domain rules
- no HTTP knowledge

### Database layer
- SQLAlchemy models
- migrations
- database session handling

---

## Primary Domains

### Patients
Stores core patient identity and contact information.

### Appointments
Handles scheduling, rescheduling, confirmation, cancellation, and no-show tracking.

### Clinical Records
Handles medical encounters, notes, diagnoses, prescriptions, exams, and attachments.

### Billing
Handles charges, payments, partial payments, payment methods, and cashier operations.

### Insurance
Handles insurers, patient policies, coverage, insurer forms, and claim tracking.

### Inventory
Handles supplies, stock movements, low stock alerts, and expiration dates.

### Reports
Handles daily and monthly revenue, appointments, operational KPIs, and financial summaries.

### Bot Assistant
Allows doctors to query real system data through controlled internal APIs.

---

## Files and Storage

Large files must not be stored directly in PostgreSQL.

Use MinIO for:
- lab result PDFs
- prescriptions
- insurer forms
- medical attachments
- scanned documents
- clinical images

PostgreSQL stores metadata only.

Example:

```text
patient_files
-------------
id
patient_id
encounter_id
file_type
file_name
storage_key
content_type
created_at
```

---

## Authentication and Roles

Authentication uses JWT.

Initial roles:
- doctor
- receptionist
- admin
- billing

Role permissions must be enforced in the backend.

---

## Local Development

### Requirements
- Docker
- Docker Compose
- Node.js
- Python 3.11+

### Start development environment

```bash
docker-compose up --build
```

Suggested local URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- OpenAPI Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001

---

## Integration with appoint-me

Integration endpoints should be placed under a dedicated namespace.

Examples:

```http
POST /api/v1/integrations/appointments/proposed
POST /api/v1/integrations/appointments/confirmed
POST /api/v1/integrations/messages/inbound
POST /api/v1/integrations/reminders/status
```

These endpoints must:
- validate payloads
- authenticate the integration client
- apply domain rules
- write audit trails
- never bypass normal business validations

---

## Initial Development Priorities

### Phase 1
- patients
- appointments
- clinical records
- diagnoses
- prescriptions
- exams

### Phase 2
- payments
- insurance
- accounts receivable
- expenses
- inventory

### Phase 3
- bot assistant
- reminders
- WhatsApp integration
- alerts
- dashboards
- smart summaries

---

## LLM Development Goal

This repository must be easy for coding agents to understand and extend.

To achieve that:
- naming must be explicit
- modules must remain isolated
- functions must stay small
- request and response contracts must be typed
- domain rules must live in services
- migrations must be tracked
- architectural drift must be avoided

---

## License

Private project.
