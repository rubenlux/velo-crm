# Implementation Plan: Gestión de Customers (Clientes)

**Branch**: `main` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/008-customers/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Primer módulo real de la Fase 2 (CRM): módulo NestJS nuevo `customers` con una tabla
`Customer` (identificación, datos fiscales, contacto, ubicación, comerciales, tags,
campos personalizados) aislada por `organizationId`, prevención de duplicados por
CUIT/NIF por Organization, historial de cambios propio (`CustomerHistory`) que alimenta
una línea de tiempo calculada (no persistida), baja lógica/restauración, fusión de
duplicados y exportación/importación en CSV. Reutiliza `AuthGuard` (identity),
`TenantContextGuard`/`MembershipRepository`/`AuditLogPublisher` (organizations) y
`PermissionsGuard`/`@RequirePermission` con los permission keys `customer.*` ya
declarados por spec 007 — sin agregar permission keys nuevas (research.md #2). Ver
research.md para las 10 decisiones técnicas de esta spec.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS), consistente con el resto del
monorepo
**Primary Dependencies**: NestJS, Prisma ORM (+ extensión Postgres `pg_trgm`), React +
Vite; reutiliza `AuthGuard` (identity, global), `TenantContextGuard`/
`MembershipRepository`/`AuditLogPublisher` (organizations), `PermissionsGuard`/
`@RequirePermission` (roles, spec 007)
**Storage**: PostgreSQL (vía Prisma) — dos tablas nuevas: `Customer` y
`CustomerHistory`; `AuditLogAction` (spec 005, tabla existente) gana 7 valores nuevos;
ninguna tabla existente se modifica de otra forma
**Testing**: Jest (unit + integration backend) contra `velo-test-db`, igual que specs
004-007
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo existente)
**Performance Goals**: búsquedas <300ms con hasta 1M Customers por Organization en el
95% de los casos (SC-001, SC-002) — índices `pg_trgm`/GIN (research.md #9)
**Constraints**: sin eliminación física de Customers en ninguna fase (RN-004, FR-011);
unicidad de `taxId` por Organization, no global (RN-002/RN-003); ningún Customer
archivado admite nuevas Opportunities sin autorización explícita (FR-011, enforcement
real diferido a spec 011); concurrencia optimista en edición (research.md #8)
**Scale/Scope**: 5 User Stories (P1-P5); US4 (timeline) y US5 (fusión/export/import)
dependen de decisiones de extensibilidad para specs futuras (research.md #5, #6) más
que de nueva infraestructura

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Specification First**: PASS — spec.md aprobada (checklist sin
  `[NEEDS CLARIFICATION]`) precede a este plan.
- **II. Modular by Design**: PASS — módulo nuevo `customers` que importa `identity`
  (por `AuthGuard`/tipos de `User`), `organizations` (por `MembershipRepository`/
  `AuditLogPublisher`/`TenantContextGuard`) y `roles` (por `PermissionsGuard`/
  `@RequirePermission`); ningún módulo existente importa `customers` (research.md #1).
- **III. Business Domain First**: PASS — entidades y campos (`Customer`,
  `CustomerStatus`, `CustomerHistory`) vienen directo del lenguaje de spec.md Key
  Entities.
- **IV. Multi-Tenant by Default**: PASS — `Customer.organizationId` filtra cada query
  en el repositorio mismo (FR-016), mismo patrón que `OrganizationInvitationRepository`
  (spec 005). Gap conocido y documentado: sin guard de gating por
  `Organization.enabledModules` en runtime (research.md #10, heredado de spec 007).
- **V. Security by Default**: PASS — cada endpoint exige `TenantContextGuard` +
  `@RequirePermission('customer.*')`; las 7 acciones de FR-015 quedan auditadas en
  `AuditLog` (data-model.md).
- **VI. API First**: PASS — el frontend consume la misma API documentada en
  `contracts/customers-api.md`.
- **VII. Quality Before Features**: PASS — tests de contrato/integración por historia,
  igual que specs 004-007.
- **VIII. Simplicity Wins**: PASS — sin tabla `Tag` separada (tags como `string[]`),
  sin tabla `TimelineEntry` persistida (vista calculada, research.md #5), sin nuevo
  valor de `CustomerStatus` para fusión (`mergedIntoCustomerId` en su lugar,
  research.md #6), sin permission keys nuevas (research.md #2), import/export
  síncrono sin cola (research.md #7) — cada decisión documentada con su alternativa
  descartada.
- **IX. AI Assists — Never Governs**: N/A.
- **X. Observability by Design**: PASS — reutiliza `AuditLogPublisher` ya persistente
  de spec 005; agrega 7 acciones nuevas al enum existente (data-model.md).

Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-customers/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
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
│   │   ├── organizations/                # spec 005 (sin cambios de esquema)
│   │   ├── users/                        # spec 006 (sin cambios)
│   │   ├── roles/                        # spec 007 (sin cambios de esquema; permission-catalog reutilizado tal cual)
│   │   └── customers/                    # esta feature
│   │       ├── domain/
│   │       │   └── errors.ts             # CustomerDuplicateTaxIdError, CustomerMergedError, CustomerStaleUpdateError, CustomerArchivedError
│   │       ├── infrastructure/
│   │       │   ├── customer.repository.ts
│   │       │   └── customer-history.repository.ts
│   │       ├── application/
│   │       │   ├── create-customer.use-case.ts
│   │       │   ├── update-customer.use-case.ts
│   │       │   ├── get-customer.use-case.ts
│   │       │   ├── search-customers.use-case.ts
│   │       │   ├── archive-customer.use-case.ts
│   │       │   ├── restore-customer.use-case.ts
│   │       │   ├── get-customer-timeline.use-case.ts    # research.md #5
│   │       │   ├── merge-customers.use-case.ts           # research.md #6
│   │       │   ├── export-customers.use-case.ts          # research.md #7
│   │       │   └── import-customers.use-case.ts          # research.md #7, reutiliza create-customer.use-case.ts por fila
│   │       └── api/
│   │           ├── customers.controller.ts
│   │           ├── customers-exceptions.filter.ts
│   │           └── dto/
└── tests/
    ├── contract/
    ├── integration/
    └── e2e/

frontend/
└── src/
    ├── features/
    │   └── customers/
    │       ├── CustomersList.tsx        # US2: búsqueda/filtros
    │       ├── CustomerForm.tsx         # US1: alta/edición
    │       ├── CustomerDetail.tsx       # US3: archivar/restaurar
    │       ├── CustomerTimeline.tsx     # US4
    │       └── MergeCustomers.tsx       # US5
    └── services/
        └── customers-api.ts
```

**Structure Decision**: Nuevo módulo NestJS `customers`, misma Clean Architecture que
los módulos anteriores. No se modifica ningún módulo existente; `customers` es
puramente un consumidor de `identity`/`organizations`/`roles`. `CustomerHistory` es una
tabla hija de `Customer`, propiedad exclusiva de este módulo (ningún otro módulo la
consulta directamente — la línea de tiempo se expone solo vía
`GetCustomerTimelineUseCase`).

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Ninguna violación registrada.
