# Implementation Plan: Gestión de Contactos (Contacts)

**Branch**: `main` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/009-contacts/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Segundo módulo de la Fase 2 (CRM): módulo NestJS nuevo `contacts` con una tabla
`Contact` dependiente de `Customer` (spec 008, FK obligatoria — RN-001), múltiples
emails/teléfonos (principal + secundarios), contacto principal único por Customer
(transacción + índice único parcial), historial propio (`ContactHistory`) y línea de
tiempo calculada con el mismo patrón que spec 008, transferencia entre Customers y
fusión de duplicados restringida al mismo Customer. Reutiliza `AuthGuard` (identity),
`TenantContextGuard`/`MembershipRepository`/`AuditLogPublisher` (organizations),
`PermissionsGuard`/`@RequirePermission` con los permission keys `contact.*` ya
declarados por spec 007, y el enum `CustomerPriority` de spec 008 (sin duplicarlo). Ver
research.md para las 8 decisiones técnicas de esta spec, varias heredadas
explícitamente de spec 008 por consistencia arquitectónica.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS), consistente con el resto del
monorepo
**Primary Dependencies**: NestJS, Prisma ORM (+ `pg_trgm`, ya habilitado por spec 008),
React + Vite; reutiliza `AuthGuard` (identity), `TenantContextGuard`/
`MembershipRepository`/`AuditLogPublisher` (organizations), `PermissionsGuard`/
`@RequirePermission` (roles, spec 007), y consume `CustomerRepository` (customers,
spec 008) para validar que `customerId` existe al crear/transferir
**Storage**: PostgreSQL (vía Prisma) — dos tablas nuevas: `Contact` y
`ContactHistory`; `AuditLogAction` (spec 005) gana 7 valores nuevos; un índice único
parcial creado a mano en la migración (research.md #4, Prisma no expresa `WHERE` en
`@@unique`)
**Testing**: Jest (unit + integration backend) contra `velo-test-db`, igual que specs
004-008
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo existente)
**Performance Goals**: búsquedas <300ms con hasta 1M Contacts por Organization en el
95% de los casos (SC-001, SC-002) — mismos índices `pg_trgm`/GIN que spec 008
**Constraints**: todo Contact pertenece a exactamente un Customer, sin excepción
(RN-001, FR-002); a lo sumo un contacto principal por Customer en todo momento
(FR-004, SC-004); fusión solo entre Contacts del mismo Customer (FR-013, edge case);
sin eliminación física en ninguna fase (FR-012); concurrencia optimista en edición
**Scale/Scope**: 5 User Stories (P1-P5); comparte la mayoría de sus decisiones
arquitectónicas con spec 008 por ser el mismo tipo de entidad de dominio (research.md)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Specification First**: PASS — spec.md aprobada (checklist sin
  `[NEEDS CLARIFICATION]`) precede a este plan.
- **II. Modular by Design**: PASS — módulo nuevo `contacts` que importa `identity`,
  `organizations`, `roles` y además `customers` (spec 008, por `CustomerRepository` —
  primera dependencia dura entre dos módulos de la Fase 2); ningún módulo existente
  importa `contacts` (research.md #1).
- **III. Business Domain First**: PASS — entidades y campos vienen directo del
  lenguaje de spec.md Key Entities.
- **IV. Multi-Tenant by Default**: PASS — `Contact.organizationId` filtra cada query
  en el repositorio mismo (FR-017), mismo patrón que `Customer`/
  `OrganizationInvitationRepository`. Mismo gap conocido de spec 008 #10 (sin guard de
  gating por `enabledModules` en runtime), heredado sin resolver por no estar en
  alcance de esta spec tampoco.
- **V. Security by Default**: PASS — cada endpoint exige `TenantContextGuard` +
  `@RequirePermission('contact.*')`; las 7 acciones de FR-016 quedan auditadas.
- **VI. API First**: PASS — el frontend consume la misma API documentada en
  `contracts/contacts-api.md`.
- **VII. Quality Before Features**: PASS — tests de contrato/integración por historia.
- **VIII. Simplicity Wins**: PASS — sin tabla `ContactChannel` normalizada (columnas +
  arrays alcanzan, research.md #3), sin `ContactPriority` duplicado (reutiliza
  `CustomerPriority` de spec 008), sin tabla `TimelineEntry` (research.md #7, mismo
  patrón calculado de spec 008), `company` denormalizado en vez de JOIN en cada
  búsqueda (research.md #8) — cada decisión con su alternativa descartada.
- **IX. AI Assists — Never Governs**: N/A.
- **X. Observability by Design**: PASS — reutiliza `AuditLogPublisher`; agrega 7
  acciones nuevas al enum existente (data-model.md).

Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/009-contacts/
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
│   │   ├── roles/                        # spec 007 (sin cambios de esquema)
│   │   ├── customers/                    # spec 008 (sin cambios de esquema; CustomerRepository reutilizado para validar customerId)
│   │   └── contacts/                     # esta feature
│   │       ├── domain/
│   │       │   └── errors.ts             # ContactDuplicateError, ContactMergedError, ContactStaleUpdateError, ContactCustomerMismatchError
│   │       ├── infrastructure/
│   │       │   ├── contact.repository.ts
│   │       │   └── contact-history.repository.ts
│   │       ├── application/
│   │       │   ├── create-contact.use-case.ts
│   │       │   ├── update-contact.use-case.ts
│   │       │   ├── get-contact.use-case.ts
│   │       │   ├── search-contacts.use-case.ts
│   │       │   ├── archive-contact.use-case.ts
│   │       │   ├── restore-contact.use-case.ts
│   │       │   ├── set-primary-contact.use-case.ts       # research.md #4
│   │       │   ├── transfer-contact.use-case.ts           # research.md #5
│   │       │   ├── merge-contacts.use-case.ts              # research.md #6
│   │       │   └── get-contact-timeline.use-case.ts        # research.md #7
│   │       └── api/
│   │           ├── contacts.controller.ts
│   │           ├── contacts-exceptions.filter.ts
│   │           └── dto/
└── tests/
    ├── contract/
    ├── integration/
    └── e2e/

frontend/
└── src/
    ├── features/
    │   └── contacts/
    │       ├── ContactsList.tsx        # US3: búsqueda/filtros
    │       ├── ContactForm.tsx         # US1: alta/edición
    │       ├── ContactDetail.tsx       # US1/US2: archivar/restaurar, marcar principal
    │       ├── ContactTimeline.tsx     # US4
    │       └── TransferOrMergeContact.tsx  # US5
    └── services/
        └── contacts-api.ts
```

**Structure Decision**: Nuevo módulo NestJS `contacts`, misma Clean Architecture que
`customers`. Es el primer módulo de la Fase 2 que importa otro módulo de la misma fase
(`customers`) además del core de plataforma — se hace vía su `CustomerRepository`
exportado (mismo mecanismo que `IdentityModule` exporta `UserRepository`/
`PrismaService`), no accediendo a la tabla `customers` directamente desde `contacts`.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Ninguna violación registrada.
