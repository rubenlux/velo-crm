# Implementation Plan: Gestión de Prospectos (Leads)

**Branch**: `main` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/010-leads/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Tercer módulo de la Fase 2 (CRM): módulo NestJS nuevo `leads` con una tabla `Lead`
independiente (registro, calificación, seguimiento, pérdida/reactivación y búsqueda),
más una operación de conversión (US3) que crea automáticamente un Customer (spec 008),
un Contact principal (spec 009) y una Opportunity — esta última en una tabla mínima
nueva, ya que spec 011 (Opportunities) todavía no está implementada. Dos decisiones de
alcance se resolvieron explícitamente con el usuario antes de este plan: (1) la tabla
`Opportunity` se crea ahora en su forma mínima y spec 011 la amplía después, en vez de
invertir el orden de implementación o dejar la conversión sin construir; (2)
"registrar actividades" (llamada/reunión/email, Acceptance Scenario 1 de US2) queda
diferido a spec 012 (Activities), que declara explícitamente ser la única dueña de ese
concepto — mismo límite que specs 008/009 ya respetaron. Reutiliza `AuthGuard`
(identity), `TenantContextGuard`/`AuditLogPublisher` (organizations),
`PermissionsGuard`/`@RequirePermission` con los permission keys `lead.*` ya declarados
por spec 007, y los repositorios exportados de `customers`/`contacts` para la
conversión. Ver research.md para las 16 decisiones técnicas de esta spec.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS), consistente con el resto del
monorepo
**Primary Dependencies**: NestJS, Prisma ORM (+ `pg_trgm`, ya habilitado por spec 008),
React + Vite; reutiliza `AuthGuard` (identity), `TenantContextGuard`/
`MembershipRepository`/`AuditLogPublisher` (organizations), `PermissionsGuard`/
`@RequirePermission` (roles, spec 007), y consume `CustomerRepository` (customers, spec
008) + `ContactRepository` (contacts, spec 009) para la conversión (US3)
**Storage**: PostgreSQL (vía Prisma) — cuatro tablas nuevas: `Lead`, `LeadHistory`,
`LeadNote`, `LeadAttachment`, más una quinta (`Opportunity`) en su forma mínima
(research.md #10); `AuditLogAction` (spec 005) gana 7 valores nuevos
**Testing**: Jest (unit + integration backend) contra `velo-test-db`, igual que specs
004-009
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo existente)
**Performance Goals**: búsquedas <300ms con hasta 1M Leads por Organization en el 95% de
los casos (SC-002, SC-003) — mismos índices `pg_trgm`/GIN que specs 008/009
**Constraints**: sin eliminación física en ningún estado (FR-014); conversión ocurre
como mucho una vez por Lead, incluso bajo solicitudes concurrentes (FR-011, research.md
#11); reactivación desde `Perdido` restaura el estado previo exacto, no un valor fijo
(research.md #12); concurrencia optimista en ediciones normales
**Scale/Scope**: 5 User Stories (P1-P5); US2 se implementa parcialmente (notas, próxima
acción, adjuntos — no el registro de actividades tipo llamada/reunión/email, diferido a
spec 012, research.md #9)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Specification First**: PASS — spec.md aprobada (checklist sin
  `[NEEDS CLARIFICATION]`) precede a este plan.
- **II. Modular by Design**: PASS con una excepción documentada y acotada — módulo
  nuevo `leads` que importa `identity`, `organizations`, `roles`, y además `customers`
  (spec 008) y `contacts` (spec 009) para la conversión, mismo mecanismo de
  repositorio exportado ya usado entre `contacts`↔`customers`. **Excepción**: la tabla
  `Opportunity` se define en este plan pero conceptualmente pertenece a spec 011 (no
  implementada); mientras eso no ocurra, `leads` es su único escritor a través de un
  repositorio deliberadamente angosto (`opportunity-stub.repository.ts`, solo
  `create`), documentado en research.md #10 con una ruta de resolución clara: spec 011
  absorbe la propiedad y `leads` pasa a consumir el repositorio real que esa spec
  exporte. Se registra en Complexity Tracking por afectar el límite modular con una
  spec futura.
- **III. Business Domain First**: PASS — entidades y campos vienen directo del
  lenguaje de spec.md Key Entities; los enums de `Opportunity` se toman literalmente de
  las Key Entities ya redactadas en spec 011 (research.md #10), no se inventan.
- **IV. Multi-Tenant by Default**: PASS — `Lead.organizationId`/
  `Opportunity.organizationId` filtran cada query en el repositorio mismo (FR-017),
  mismo patrón que `Customer`/`Contact`. Mismo gap conocido de specs 008/009 (sin guard
  de gating por `enabledModules` en runtime), heredado sin resolver por no estar en
  alcance de esta spec tampoco.
- **V. Security by Default**: PASS — cada endpoint exige `TenantContextGuard` +
  `@RequirePermission('lead.*')`; las 7 acciones de FR-016 quedan auditadas.
- **VI. API First**: PASS — el frontend consume la misma API documentada en
  `contracts/leads-api.md`.
- **VII. Quality Before Features**: PASS — tests de contrato/integración por historia
  implementada (US1, US3-US5; US2 parcial según su alcance acotado).
- **VIII. Simplicity Wins**: PASS — sin `LeadActivity` (research.md #9, diferido a
  spec 012 en vez de construir una tabla que esa spec tendría que migrar); sin motor de
  fórmulas configurable para el Score (research.md #5, campo manual); sin
  almacenamiento binario propio para adjuntos (research.md #8, metadata + URL externa,
  mismo patrón que `avatarUrl`/`logoUrl`); sin `LeadPriority` duplicado (reutiliza
  `CustomerPriority`); `Opportunity` mínima sin KPIs/forecast/pipeline configurable
  (eso es spec 011) — cada decisión con su alternativa descartada en research.md.
- **IX. AI Assists — Never Governs**: N/A (scoring por IA explícitamente fuera de
  alcance, spec.md Assumptions).
- **X. Observability by Design**: PASS — reutiliza `AuditLogPublisher`; agrega 7
  acciones nuevas al enum existente (data-model.md).

Una violación registrada y justificada en Complexity Tracking (propiedad temporal de
`Opportunity`).

## Project Structure

### Documentation (this feature)

```text
specs/010-leads/
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
│   │   ├── organizations/                # spec 005 (sin cambios de esquema)
│   │   ├── users/                        # spec 006 (sin cambios)
│   │   ├── roles/                        # spec 007 (sin cambios de esquema)
│   │   ├── customers/                    # spec 008 (sin cambios de esquema; CustomerRepository reutilizado en la conversión)
│   │   ├── contacts/                     # spec 009 (sin cambios de esquema; ContactRepository reutilizado en la conversión)
│   │   └── leads/                        # esta feature
│   │       ├── domain/
│   │       │   └── errors.ts             # LeadAlreadyConvertedError, LeadNotConvertibleError, LeadDuplicateWarning, LeadStaleUpdateError
│   │       ├── infrastructure/
│   │       │   ├── lead.repository.ts
│   │       │   ├── lead-history.repository.ts
│   │       │   ├── lead-note.repository.ts
│   │       │   ├── lead-attachment.repository.ts
│   │       │   └── opportunity-stub.repository.ts    # research.md #10 — temporal hasta spec 011
│   │       ├── application/
│   │       │   ├── create-lead.use-case.ts
│   │       │   ├── update-lead.use-case.ts            # incluye score, ownerUserId, nextAction
│   │       │   ├── get-lead.use-case.ts
│   │       │   ├── search-leads.use-case.ts
│   │       │   ├── add-lead-note.use-case.ts
│   │       │   ├── add-lead-attachment.use-case.ts
│   │       │   ├── convert-lead.use-case.ts           # research.md #10, #11
│   │       │   ├── lose-lead.use-case.ts              # research.md #12
│   │       │   ├── reactivate-lead.use-case.ts        # research.md #12
│   │       │   ├── import-leads.use-case.ts           # research.md #16
│   │       │   └── get-lead-timeline.use-case.ts      # research.md #14
│   │       └── api/
│   │           ├── leads.controller.ts
│   │           ├── leads-exceptions.filter.ts
│   │           └── dto/
│   └── tests/
│       ├── contract/
│       ├── integration/
│       └── e2e/

frontend/
└── src/
    ├── features/
    │   └── leads/
    │       ├── LeadsList.tsx        # US5: búsqueda/filtros
    │       ├── LeadForm.tsx         # US1: alta/edición
    │       ├── LeadDetail.tsx       # US1/US2/US4: calificar, notas, próxima acción, adjuntos, perder/reactivar/archivar
    │       ├── LeadTimeline.tsx     # US2/US5
    │       └── ConvertLead.tsx      # US3: confirmación de conversión, resolución de duplicados
    └── services/
        └── leads-api.ts
```

**Structure Decision**: Nuevo módulo NestJS `leads`, misma Clean Architecture que
`customers`/`contacts`. Es el primer módulo de la Fase 2 que importa **dos** módulos de
la misma fase (`customers` y `contacts`) además del core de plataforma, y el primero
que introduce una tabla (`Opportunity`) cuya propiedad definitiva no le corresponde —
ver la excepción documentada en Constitution Check y Complexity Tracking.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| `leads` escribe en la tabla `Opportunity`, que conceptualmente pertenece a spec 011 (no implementada) — violación acotada de Modular by Design (Principio II) | US3 (conversión) es la historia de mayor valor de negocio de spec 010 (P3) y exige crear una Opportunity real en la misma operación (FR-010); esperar a spec 011 dejaría el módulo sin su capacidad central | (a) Implementar spec 011 completa primero — rechazada por el usuario: invierte el orden numérico/de prioridad y expande el alcance de esta tarea muy por encima de lo pedido; (b) US3 sin conversión, diferida — rechazada por el usuario: vacía el propósito central de spec 010. La excepción queda acotada (repositorio de solo `create`, sin lógica de negocio de pipeline/KPIs) y con ruta de resolución clara: spec 011 absorbe la propiedad de la tabla cuando se implemente (research.md #10) |
