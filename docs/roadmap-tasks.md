# Tasks — VELO CRM Roadmap (Macro Backlog)

Backlog de alto nivel para todo el roadmap del producto, compañero de
[docs/implementation-plan.md](implementation-plan.md). Estas tareas son epics/backlog
por fase, no el desglose ejecutable por historia de usuario: para eso ver
`specs/<feature>/tasks.md` generado por `/speckit-tasks` (ej.
[specs/004-authentication-identity/tasks.md](../specs/004-authentication-identity/tasks.md)).

## Phase 0 — Foundation

- [x] T001 Initialize repository
- [ ] T002 Configure development environment
- [ ] T003 Configure linting and formatting
- [ ] T004 Configure testing framework
- [ ] T005 Configure Docker environment
- [ ] T006 Configure CI pipeline
- [ ] T007 Configure environment variables
- [ ] T008 Configure logging
- [ ] T009 Configure health checks
- [x] T010 Create project documentation

---

## Phase 1 — Platform Core

Mapea a [specs/004-authentication-identity/](../specs/004-authentication-identity/) y
[specs/005-organizations-multi-tenant/](../specs/005-organizations-multi-tenant/).

### Authentication

- [ ] T011 Implement authentication module
- [ ] T012 Implement JWT authentication
- [ ] T013 Implement refresh tokens
- [ ] T014 Implement password hashing
- [ ] T015 Implement password reset
- [ ] T016 Implement email verification

### Organizations

- [ ] T017 Create Organization entity
- [ ] T018 Organization CRUD
- [ ] T019 Organization settings
- [ ] T020 Organization onboarding

### Users

- [ ] T021 Create User entity
- [ ] T022 User CRUD
- [ ] T023 User profile
- [ ] T024 User preferences

### Roles & Permissions

- [ ] T025 Role entity
- [ ] T026 Permission entity
- [ ] T027 Membership entity
- [ ] T028 RBAC authorization
- [ ] T029 Route guards

### Audit

- [ ] T030 Audit Log module

---

## Phase 2 — CRM

Mapea a [specs/001-crm-fase1-clientes-pipeline/](../specs/001-crm-fase1-clientes-pipeline/).

### Customers

- [ ] T031 Customer entity
- [ ] T032 Customer CRUD

### Contacts

- [ ] T033 Contact entity
- [ ] T034 Contact CRUD

### Leads

- [ ] T035 Lead entity
- [ ] T036 Lead CRUD
- [ ] T037 Lead qualification

### Opportunities

- [ ] T038 Opportunity entity
- [ ] T039 Sales pipeline
- [ ] T040 Stage management

### Activities

- [ ] T041 Activity entity
- [ ] T042 Timeline

### Tasks

- [ ] T043 Task entity
- [ ] T044 Task assignment

### Dashboard

- [ ] T045 CRM dashboard

---

## Phase 3 — Sales

> **Nota**: `Product catalog` se movió a Phase 4 (Inventory / Catalog). Sales consume el
> catálogo, no lo posee (ver corrección aplicada en
> [docs/implementation-plan.md](implementation-plan.md) § Phase 3/4).

- [ ] T046 Quote module
- [ ] T047 Invoice module
- [ ] T048 Payment module

---

## Phase 4 — Inventory / Catalog

- [ ] T049 Product catalog
- [ ] T050 Categories
- [ ] T051 Inventory
- [ ] T052 Suppliers
- [ ] T053 Purchases

---

## Phase 5 — Collaboration

- [ ] T054 Calendar
- [ ] T055 Documents
- [ ] T056 Notifications

---

## Phase 6 — Automation

- [ ] T057 Workflow engine
- [ ] T058 Triggers
- [ ] T059 Actions

---

## Phase 7 — AI

- [ ] T060 AI Assistant
- [ ] T061 AI Agents
- [ ] T062 AI Suggestions

---

## Phase 8 — Platform

- [ ] T063 Reporting
- [ ] T064 Public API
- [ ] T065 Webhooks
- [ ] T066 Marketplace
- [ ] T067 SDK

---

## Final Validation

- [ ] T068 Unit tests
- [ ] T069 Integration tests
- [ ] T070 End-to-end tests
- [ ] T071 Performance validation
- [ ] T072 Security review
- [ ] T073 Documentation review
- [ ] T074 Production readiness review
