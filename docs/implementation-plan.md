# Implementation Plan — Velo CRM / Business OS

Plan maestro de fases del roadmap (ver [docs/product-vision.md](product-vision.md)) y
arquitectura técnica de referencia para todo el proyecto. Los planes técnicos por
feature (`specs/<feature>/plan.md`, generados por `/speckit-plan`) deben ser
consistentes con la arquitectura técnica definida acá salvo justificación explícita.

Ver [docs/roadmap-tasks.md](roadmap-tasks.md) para el backlog macro por fase (compañero
de este plan); el desglose ejecutable por historia de usuario vive en
`specs/<feature>/tasks.md`.

## Phase 0 — Project Foundation

- Repository
- Constitution
- Product Vision
- Domain Model
- Development standards
- CI/CD
- Docker
- Monorepo structure

**Deliverable**: Project skeleton ready.

---

## Phase 1 — Platform Core

Modules:

- Authentication
- Organizations
- Users
- Roles
- Permissions
- Audit Log

**Deliverable**: Secure multi-tenant platform.

Mapea a [specs/004-authentication-identity/spec.md](../specs/004-authentication-identity/spec.md)
y [specs/005-organizations-multi-tenant/spec.md](../specs/005-organizations-multi-tenant/spec.md).

---

## Phase 2 — CRM

Modules:

- Customers
- Contacts
- Leads
- Opportunities
- Activities
- Tasks
- Dashboard

**Deliverable**: Complete CRM.

Mapea a [specs/001-crm-fase1-clientes-pipeline/spec.md](../specs/001-crm-fase1-clientes-pipeline/spec.md).

---

## Phase 3 — Sales

Modules: Quotes, Invoices, Payments.

Sales consume el catálogo de productos del contexto Inventory/Catalog (Phase 4); no lo
posee. Un Quote/Invoice referencia Products existentes, pero su creación, precios y
categorización son responsabilidad exclusiva de Inventory.

**Deliverable**: Commercial management.

---

## Phase 4 — Inventory / Catalog

Modules: Products, Categories, Inventory, Suppliers, Purchases.

Products es el dueño del catálogo (artículo o servicio comercializable) consumido tanto
por Sales (Quotes/Invoices) como por el resto de la plataforma; ver
[docs/bounded-contexts.md](bounded-contexts.md) (contexto Inventory) y
[docs/domain-model.md](domain-model.md) (`Product └── Inventory`).

**Deliverable**: Inventory & catalog management.

---

## Phase 5 — Collaboration

Modules: Calendar, Documents, Notifications.

**Deliverable**: Internal collaboration.

---

## Phase 6 — Automation

Modules: Workflows, Triggers, Actions.

**Deliverable**: Business automation.

---

## Phase 7 — Artificial Intelligence

Modules: AI Agents, AI Assistant, Smart Suggestions.

**Deliverable**: AI-assisted platform.

---

## Phase 8 — Platform

Modules: Reporting, Public API, Webhooks, Marketplace, SDK.

**Deliverable**: Complete Business OS ecosystem.

---

## Technical Architecture

### Frontend

- React
- TypeScript
- Vite

### Backend

- NestJS
- TypeScript

### Database

- PostgreSQL
- Prisma

### Storage

- S3 Compatible

### Authentication

- JWT
- Refresh Tokens
- OAuth

### Infrastructure

- Docker
- Docker Compose

### Observability

- Logs
- Metrics
- Health Checks

### Testing

- Unit
- Integration
- E2E

### Deployment

- Cloud Native
