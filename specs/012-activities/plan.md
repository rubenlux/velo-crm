# Implementation Plan: Gestión de Actividades

**Branch**: `main` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/012-activities/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Quinto módulo real de la Fase 2 (CRM) y el primero que se conecta a **cuatro**
módulos de dominio simultáneamente (`CustomersModule`, `ContactsModule`,
`LeadsModule`, `OpportunitiesModule`) en vez de a uno o dos como las specs
anteriores. `Activity` registra cualquier interacción comercial (llamada, reunión,
email, nota, etc., de un catálogo configurable por Organization) asociada a uno o
más de {Customer, Contact, Lead, Opportunity}, con participantes, adjuntos,
comentarios internos, resultado y "próxima actividad programada". Cubre las 5
historias de usuario completas: registro/gestión (con cancelar/reactivar, mismo
patrón que `Lead.lose`/`reactivate`), resultado + próxima actividad, adjuntos +
comentarios (editables/eliminables solo por su autor), línea de tiempo automática
por entidad relacionada, y búsqueda/filtrado. La decisión de diseño más importante
(research.md #13) es **no** modificar los 4 módulos ya enviados (008-011) para que
sus propias timelines incluyan Activities — eso crearía el primer ciclo de
dependencias del proyecto (`Activities → Customers → Activities`, vía
`forwardRef()`); en cambio, el frontend de cada entidad compone su propia timeline
llamando también al endpoint de búsqueda de Activities ya planeado para US5. Ver
research.md para las 17 decisiones técnicas de esta spec.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS), consistente con el resto del
monorepo
**Primary Dependencies**: NestJS, Prisma ORM (+ `pg_trgm`, ya habilitado); reutiliza
`AuthGuard` (identity), `TenantContextGuard`/`AuditLogPublisher` (organizations),
`PermissionsGuard`/`@RequirePermission` (roles, spec 007 — `activity.*` ya
declaradas), `CustomerRepository`/`CustomerArchivedGuardService` (customers, spec
008), `ContactRepository` (contacts, spec 009), `LeadRepository` (leads, spec 010),
`OpportunityRepository` (opportunities, spec 011) para validar las FKs; ningún
módulo existente importa `ActivitiesModule` de vuelta (research.md #13)
**Storage**: PostgreSQL (vía Prisma) — 5 tablas nuevas (`ActivityType`, `Activity`,
`ActivityHistory`, `ActivityComment`, `ActivityAttachment`); `AuditLogAction` (spec
005) gana 12 valores nuevos; `Organization` gana dos relaciones nuevas
(`activities`, `activityTypes`)
**Testing**: Jest (unit + integration backend) contra `velo_test`, igual que specs
004-011; sin necesidad de re-ejecutar la suite de una spec anterior tras una
migración (a diferencia de spec 011) porque esta spec no reforma ninguna tabla
existente — solo agrega tablas y FKs nuevas
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo existente)
**Performance Goals**: búsquedas <300ms con hasta 1M Activities por Organization en
el 95% de los casos (SC-002, SC-003)
**Constraints**: toda Activity debe asociarse a al menos una de {Customer, Contact,
Lead, Opportunity} (FR-002, CHECK constraint agregada a mano en la migración,
research.md #1); si se asocian varias a la vez deben remitir al mismo Customer
(FR-002a); sin eliminación física en ningún estado (research.md #8); comentarios
editables/eliminables solo por su autor, sin excepción de Propietario
(research.md #9); concurrencia optimista en ediciones normales
**Scale/Scope**: 5 User Stories (P1-P5); todas se implementan completas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Specification First**: PASS — spec.md aprobada (Clarifications completas, sin
  `[NEEDS CLARIFICATION]` pendiente) precede a este plan.
- **II. Modular by Design**: PASS. Nuevo módulo `activities` que importa
  `identity`, `organizations`, `roles`, `customers`, `contacts`, `leads` y
  `opportunities` — primera vez que un módulo de esta Fase importa los cuatro
  módulos de dominio de CRM a la vez, pero la dirección de dependencia sigue siendo
  "el módulo más nuevo importa a los más viejos", sin excepción: ninguno de los
  cuatro importa `ActivitiesModule` de vuelta (research.md #13 explica por qué eso
  habría creado un ciclo, y por qué la timeline combinada se resuelve en el
  frontend en su lugar, no en el backend).
- **III. Business Domain First**: PASS — entidades y campos vienen directo del
  lenguaje de spec.md Key Entities y de las Clarifications; `ActivityType` como
  tabla real (catálogo compartido + custom) modela "configurable por Organization"
  tal como el negocio lo pide (FR-010), mismo criterio que `Role` (spec 007).
- **IV. Multi-Tenant by Default**: PASS — `Activity.organizationId` filtra cada
  query en el repositorio mismo, mismo criterio que Customer/Contact/Lead/
  Opportunity. Mismo gap conocido de specs 008-011 (sin guard de gating por
  `enabledModules` en runtime), heredado sin resolver.
- **V. Security by Default**: PASS — cada endpoint exige `TenantContextGuard` +
  `@RequirePermission('activity.*')`; configurar tipos custom exige
  específicamente `activity.manage_types` (research.md #4); editar/eliminar un
  comentario exige además ser su autor (research.md #9, chequeo de autoría, no de
  permisos); las acciones de FR-012 quedan auditadas.
- **VI. API First**: PASS — el frontend consume la misma API documentada en
  `contracts/activities-api.md`, incluido el endpoint de búsqueda reutilizado por
  las otras 4 entidades para componer su propia timeline (research.md #13).
- **VII. Quality Before Features**: PASS — tests de contrato/integración por
  historia; sin necesidad de re-ejecutar la suite de otra spec (a diferencia de
  spec 011) porque no se reforma ninguna tabla existente.
- **VIII. Simplicity Wins**: PASS — sin tabla de join para participantes (array
  escalar, research.md #6); sin `forwardRef()`/ciclo de módulos para la timeline
  combinada (research.md #13, la decisión de diseño más relevante de esta spec);
  PATCH genérico para Pendiente/EnProceso/Finalizada, solo Cancelada necesita
  endpoints dedicados (research.md #7); sin caché para búsqueda (mismo `pg_trgm`
  que specs 008-011).
- **IX. AI Assists — Never Governs**: N/A (sin componente predictivo en esta spec).
- **X. Observability by Design**: PASS — reutiliza `AuditLogPublisher`; agrega 12
  acciones nuevas al enum existente (data-model.md).

Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-activities/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── identity/                     # spec 004 (sin cambios)
│   │   ├── organizations/                # spec 005 (sin cambios)
│   │   ├── users/                        # spec 006 (sin cambios)
│   │   ├── roles/                        # spec 007 (permission-catalog.ts: 1 key nueva, activity.manage_types)
│   │   ├── customers/                    # spec 008 (sin cambios de esquema; CustomerArchivedGuardService reutilizado)
│   │   ├── contacts/                     # spec 009 (sin cambios)
│   │   ├── leads/                        # spec 010 (sin cambios)
│   │   ├── opportunities/                # spec 011 (sin cambios)
│   │   └── activities/                   # esta feature
│   │       ├── domain/
│   │       │   └── errors.ts             # ActivityNotFoundError, ActivityStaleUpdateError, ActivityNotCancelledError, ActivityNotFinishedError, ActivityRelatedEntitiesMismatchError, ActivityNoRelationError, CommentNotOwnedError, CommentNotFoundError
│   │       ├── infrastructure/
│   │       │   ├── activity-type.repository.ts
│   │       │   ├── activity.repository.ts
│   │       │   ├── activity-history.repository.ts
│   │       │   ├── activity-comment.repository.ts
│   │       │   └── activity-attachment.repository.ts
│   │       ├── application/
│   │       │   ├── list-activity-types.use-case.ts
│   │       │   ├── create-activity-type.use-case.ts
│   │       │   ├── create-activity.use-case.ts               # research.md #1, #2
│   │       │   ├── update-activity.use-case.ts                # status, result (research.md #7, #12)
│   │       │   ├── get-activity.use-case.ts
│   │       │   ├── search-activities.use-case.ts               # US5, reutilizado por otras timelines (research.md #13)
│   │       │   ├── cancel-activity.use-case.ts
│   │       │   ├── reactivate-activity.use-case.ts
│   │       │   ├── schedule-follow-up-activity.use-case.ts     # research.md #11
│   │       │   ├── add-activity-attachment.use-case.ts
│   │       │   ├── add-activity-comment.use-case.ts
│   │       │   ├── update-activity-comment.use-case.ts         # research.md #9
│   │       │   ├── delete-activity-comment.use-case.ts         # research.md #9
│   │       │   └── get-activity-timeline.use-case.ts           # research.md #14 (propia de la Activity)
│   │       └── api/
│   │           ├── activities.controller.ts
│   │           ├── activity-types.controller.ts
│   │           ├── activities-exceptions.filter.ts
│   │           └── dto/
│   └── tests/
│       ├── contract/
│       ├── integration/
│       └── e2e/

frontend/
└── src/
    ├── features/
    │   └── activities/
    │       ├── ActivityForm.tsx        # US1: alta, elige tipo + entidad(es) relacionada(s)
    │       ├── ActivityDetail.tsx      # US1/US2/US3: estado, resultado, próxima actividad, adjuntos, comentarios
    │       ├── ActivitiesList.tsx      # US5: búsqueda/filtro global
    │       └── ActivityTimeline.tsx    # timeline propia de la Activity (research.md #14)
    └── services/
        └── activities-api.ts
```

**Structure Decision**: Nuevo módulo NestJS `activities`, misma Clean Architecture
que `customers`/`contacts`/`leads`/`opportunities`. `CustomerTimeline.tsx`,
`ContactTimeline.tsx`, `LeadTimeline.tsx` y `OpportunityTimeline.tsx` (ya existentes)
se extienden para llamar también a `searchActivities({customerId/contactId/leadId/
opportunityId})` y mergear+ordenar el resultado con su propia timeline
(research.md #13) — sin cambios en sus respectivos módulos backend.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Ninguna violación registrada.
