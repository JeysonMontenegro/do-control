# PROJECT_RULES.md

This document defines the mandatory coding and architecture rules for Do-Control.

These rules are especially important for LLM coding agents such as Codex.

---

## 1. General Rules

1. Follow the existing project structure.
2. Do not invent parallel architectures.
3. Do not introduce unnecessary abstractions.
4. Keep code explicit and readable.
5. Prefer simple and maintainable solutions over clever ones.
6. All new code must respect module boundaries.
7. All new database changes must include Alembic migrations.
8. Never bypass service-layer business rules.

---

## 2. Backend Rules

### 2.1 Routing
- Route files only define HTTP endpoints.
- Routes must not contain business logic.
- Routes must call service functions.

### 2.2 Services
- Business rules belong in services.
- Services may orchestrate repositories, validators, and integrations.
- Services must raise domain-specific errors when validation fails.

### 2.3 Repositories
- Repositories only perform database access.
- Repositories must not contain business rules.
- Repositories must not know about HTTP or API response formats.

### 2.4 Schemas
- Use Pydantic schemas for request and response contracts.
- Keep schemas explicit.
- Avoid using raw SQLAlchemy models as API responses.

### 2.5 Models
- SQLAlchemy models must stay in the models package.
- Use consistent naming for primary keys and foreign keys.
- Avoid hidden behaviors in ORM events unless strictly necessary.

### 2.6 Validation
- Validate domain rules in services.
- Validate shape and types in Pydantic schemas.
- Important operations must fail loudly and predictably.

### 2.7 Transactions
- Critical multi-step operations must be transactional.
- Clinical, billing, and scheduling integrity takes priority over convenience.

---

## 3. Frontend Rules

### 3.1 Structure
- Organize by feature when possible.
- Reusable UI components go in components/.
- Domain-specific code goes in features/.

### 3.2 Data Fetching
- All API calls must go through service/client helpers.
- Avoid scattering fetch logic across random components.

### 3.3 Forms
- Forms must use typed models.
- Validate forms before submission.
- Keep form logic isolated from presentation when complexity grows.

### 3.4 State Management
- Prefer local state first.
- Use shared state only when necessary.
- Do not introduce a global state library without a clear need.

### 3.5 UI
- Favor clarity and usability over visual complexity.
- Medical and administrative flows must prioritize speed and reliability.
- Avoid overengineering the UI layer.

---

## 4. Database Rules

1. Use PostgreSQL as the source of truth.
2. Store business data in normalized relational tables.
3. Use JSONB only for flexible data that truly benefits from it.
4. Large files must not be stored inside the database.
5. Soft delete is preferred over hard delete for sensitive domains.
6. Clinical records should not be physically deleted.
7. Financial records should never be hard-deleted in normal operation.
8. Add indexes for search-critical fields.

---

## 5. Naming Rules

### Backend
- snake_case for files, variables, and database columns
- PascalCase only for class names
- clear module names like:
  - patients
  - appointments
  - encounters
  - billing
  - insurance

### Frontend
- PascalCase for React components
- camelCase for variables and functions
- explicit names like:
  - PatientForm
  - AppointmentCalendar
  - EncounterSummaryCard

### Database
- singular or plural naming must be consistent
- recommended plural table names:
  - patients
  - appointments
  - encounters
  - diagnoses
  - payments

---

## 6. Error Handling Rules

1. Never swallow exceptions silently.
2. Return meaningful validation messages.
3. Domain validation failures must be distinguishable from unexpected server errors.
4. Integration errors must be logged with enough detail for troubleshooting.
5. Sensitive information must never be leaked in API responses.

---

## 7. Security Rules

1. Every protected endpoint must require authentication.
2. Sensitive operations must enforce role checks.
3. Logs must avoid storing secrets.
4. JWT handling must be centralized.
5. Access to clinical and financial data must be auditable.
6. Integration endpoints must authenticate the calling service.

---

## 8. Integration Rules

appoint-me is an external integration.

Rules:
1. appoint-me never writes directly to PostgreSQL.
2. appoint-me only communicates through official integration APIs.
3. integration payloads must be validated with schemas.
4. all integration actions must generate audit logs.
5. ambiguous requests must not trigger automatic irreversible actions.

---

## 9. Audit Rules

The following actions must be auditable:
- appointment creation and updates
- appointment cancellation and rescheduling
- encounter creation and updates
- diagnosis changes
- payment creation and cancellation
- insurance claim state changes
- inventory adjustments
- bot-assisted queries and AI suggestions

Audit logs must capture:
- actor
- action
- target entity
- timestamp
- relevant identifiers
- before/after when applicable

---

## 10. LLM-Specific Rules

These rules are mandatory for code generation:

1. Do not generate giant files when smaller modules are more appropriate.
2. Keep functions short and explicit.
3. Avoid magic behavior.
4. Prefer composition over hidden inheritance complexity.
5. When modifying the database schema, also generate migrations.
6. When adding a feature, update:
   - models
   - schemas
   - repositories
   - services
   - routes
   - tests
7. Never mix unrelated concerns in a single file.
8. Do not create duplicate abstractions if an existing one already solves the need.

---

## 11. Testing Rules

1. Add tests for service-layer logic.
2. Add tests for important API endpoints.
3. Cover scheduling, billing, and insurance logic carefully.
4. Validate edge cases for:
   - double booking
   - invalid insurance coverage
   - partial payments
   - closed encounter editing
   - invalid role access

---

## 12. Rule Priority

If there is a conflict:
1. patient safety and data integrity come first
2. financial integrity comes second
3. architectural consistency comes third
4. developer convenience comes last
