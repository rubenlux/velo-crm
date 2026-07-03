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

- Authentication ✅ **implementado** (2026-07-02) — ver estado abajo
- Organizations ✅ **implementado** (2026-07-02) — ver estado abajo
- Users ✅ **implementado** (2026-07-02) — ver estado abajo
- Roles
- Permissions
- Audit Log

**Deliverable**: Secure multi-tenant platform.

Mapea a [specs/004-authentication-identity/spec.md](../specs/004-authentication-identity/spec.md),
[specs/005-organizations-multi-tenant/spec.md](../specs/005-organizations-multi-tenant/spec.md)
y [specs/006-users/spec.md](../specs/006-users/spec.md).

### Estado de implementación — Authentication (spec 004)

Las 5 historias de usuario están implementadas y testeadas (`backend/src/modules/identity/`,
`frontend/src/features/auth/`): registro/login/logout/verificación de email,
recuperación y cambio de contraseña, login con Google/Microsoft, gestión de sesiones y
dispositivos, y MFA por TOTP con códigos de recuperación. 35 tests (contract +
integration + E2E) pasando contra una base Postgres real. El endpoint de aceptación de
invitaciones (FR-018), antes diferido por depender de `Organization`/`Membership`, ya
está implementado — ver spec 005 abajo. El login social no se probó contra
Google/Microsoft reales (requiere credenciales OAuth que este entorno no tiene) — la
lógica de creación/vinculación de cuenta sí está testeada con perfiles simulados.

CSRF no aplica a esta superficie: los access/refresh tokens viajan por header
`Authorization: Bearer` y body JSON, nunca por cookies de navegador, así que no hay
estado ambiental que un sitio de terceros pueda explotar. Reevaluar si en el futuro se
migra a cookies de sesión. Los tests de integración/E2E (`backend/tests/`) comparten una
única base Postgres real y llaman `resetDatabase()` entre casos, por eso
`backend/jest.config.js` fija `maxWorkers: 1` — correrlos en paralelo trunca tablas que
otro worker está usando a mitad de test.

### Estado de implementación — Organizations (spec 005)

Las 5 historias de usuario están implementadas y testeadas
(`backend/src/modules/organizations/`, `frontend/src/features/organizations/`): crear y
configurar una Organization (con Membership Propietario automática), branding/
impuestos/módulos habilitados según plan, invitaciones (cerrando el FR-018 diferido de
spec 004), cambio de plan con validación de límites, y suspensión/reactivación
administrativa. 31 tests nuevos (contract + integration + E2E) pasando contra la misma
base Postgres real, para un total de 67 tests en el backend.

Aislamiento multi-tenant: cada request a un recurso de Organization exige el header
`X-Organization-Id`, validado por `TenantContextGuard` contra la Membership activa del
User — ver `specs/005-organizations-multi-tenant/research.md` #1. Se agregó un chequeo
adicional contra ataques de "confused deputy" (header validado para una Organization,
`:id` de la URL apuntando a otra). Se encontró y corrigió durante la implementación un
problema real: `AcceptInvitationUseCase` no verificaba que el email del User autenticado
coincidiera con el email invitado, lo que permitía que cualquiera con el token de
invitación se uniera con el rol invitado — ahora se valida y, si no coincide, la
invitación permanece válida para su destinatario real (queda cubierto por test de
regresión).

**Hardening post-revisión**: `AuthGuard` pasó a ser un guard global
(`APP_GUARD` en `AppModule`, deny-by-default) con un decorator `@Public()` para las
rutas que no lo requieren; `TenantContextGuard` se aplica a nivel de clase en
`OrganizationsController` (no por método) con `@SkipTenantContext()` para las 3
excepciones reales. Esto cierra el riesgo de que un endpoint nuevo quede sin protección
por simple olvido — antes cada guard era opt-in por método. También se reforzó
`OrganizationInvitationRepository` para filtrar `organizationId` en la query misma
(`WHERE`/`updateMany` de Prisma), no solo en una comparación posterior del use case —
defensa en profundidad, no una vulnerabilidad explotable hoy. Ver la nota "Post-revisión"
en `specs/005-organizations-multi-tenant/tasks.md`.

Se introdujo el primer `AuditLog` persistido y consultable de la plataforma
(`GET /organizations/:id/audit-log`), a diferencia del logger de solo-consola usado como
seam temporal en `identity` (spec 004) — migrar `identity` a este mismo mecanismo queda
fuera de alcance de esta fase. El catálogo de planes (`Free`/`Pro`/`Enterprise`, límites
de usuarios y módulos) se modela como configuración estática en código
(`backend/src/modules/organizations/infrastructure/plan-catalog.ts`), no como tabla en
base de datos. La suspensión/reactivación de Organizations (acción administrativa de
plataforma) se protege con un allowlist de emails vía `PLATFORM_ADMIN_EMAILS`, no con un
sistema de roles de plataforma completo (fuera de alcance de esta spec).

### Estado de implementación — Users (spec 006)

Las 4 historias de usuario están implementadas y testeadas
(`backend/src/modules/users/`, `frontend/src/features/users/`): editar perfil y
preferencias, listar/"cambiar" entre Organizations propias, administrar el ciclo de
vida de Users de una Organization (desactivar/reactivar/eliminar con el invariante de
"nunca sin administrador"), e historial de accesos de solo lectura. 19 tests nuevos
(contract + integration + E2E) pasando contra la misma base Postgres real, para un
total de 82 tests en el backend.

`User` sigue siendo una única tabla (propiedad de `identity` a nivel de schema): las
columnas de perfil/estado se agregaron ahí y el `UserRepository` de `identity` se
extendió y se exportó para que `users` lo consuma, en vez de crear un segundo
repositorio sobre la misma tabla — ver `specs/006-users/research.md` #1. `AuditLog`
(spec 005) pasó a aceptar `organizationId` nulo para eventos de cuenta no atados a
ninguna Organization (por ejemplo, que un User edite su propio nombre) — ver
research.md #7. El invariante de "nunca sin administrador" (`FR-008`), preparado pero
sin usar desde spec 005, se ejercita por primera vez acá al desactivar/eliminar un
User. `TenantContextGuard` (spec 005) se extendió para rechazar también si
`User.status` no es `Active`, cerrando el requisito de que un User suspendido/
inactivo/eliminado no pueda acceder a datos de ninguna Organization aunque sus
credenciales de login sigan siendo válidas (`FR-012`).

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
