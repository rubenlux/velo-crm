# Implementation Plan: Gestión de Oportunidades de Venta (Pipeline Comercial)

**Branch**: `main` | **Date**: 2026-07-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/011-opportunities/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Cuarto módulo de la Fase 2 (CRM), y el primero que **reforma** una tabla creada por
otra spec en vez de partir de cero: spec 010 (Leads) ya creó una tabla `Opportunity`
mínima (research.md #10 de esa spec) porque su conversión necesitaba crear una
Opportunity real sin esperar a esta spec. Esta spec absorbe esa propiedad: reemplaza
el enum `PipelineStage` de spec 010 por dos tablas reales (`Pipeline`/`PipelineStage`,
configurables por Organization — FR-004), agrega los campos comerciales que faltaban
(probabilidad, fecha estimada de cierre, prioridad, competidor, observaciones,
etiquetas), y cubre las 5 historias de usuario: creación/gestión del pipeline, valor
ponderado, cierre/reapertura/archivado, KPIs/forecast, y búsqueda/timeline. `LeadsModule`
dejará de usar su `OpportunityStubRepository` temporal y pasará a importar
`OpportunitiesModule`, cumpliendo la migración que spec 010 ya había documentado como
plan. El Pipeline por defecto de una Organization se crea de forma **perezosa**
(primer uso), no en un hook de `CreateOrganizationUseCase` (spec 005) — evita una
dependencia invertida entre módulos de plataforma y de dominio. Ver research.md para
las 15 decisiones técnicas de esta spec.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS), consistente con el resto del
monorepo
**Primary Dependencies**: NestJS, Prisma ORM (+ `pg_trgm`, ya habilitado); reutiliza
`AuthGuard` (identity), `TenantContextGuard`/`AuditLogPublisher` (organizations),
`PermissionsGuard`/`@RequirePermission` (roles, spec 007), `CustomerRepository`
(customers, spec 008) y `ContactRepository` (contacts, spec 009) para validar
referencias; `LeadsModule` (spec 010) pasa a consumir este módulo en vez de su
repositorio temporal
**Storage**: PostgreSQL (vía Prisma) — dos tablas nuevas (`Pipeline`, `PipelineStage`),
una tabla nueva de historial (`OpportunityHistory`), la tabla `Opportunity` (creada por
spec 010) reformada con 8 columnas nuevas y sin su antiguo enum `stage`; el enum
`PipelineStage` (spec 010) se elimina; `AuditLogAction` (spec 005) gana 10 valores
nuevos
**Testing**: Jest (unit + integration backend) contra `velo-test-db`, igual que specs
004-010; se vuelve a correr la suite completa después de la migración de `Opportunity`
para confirmar que spec 010 sigue pasando (con sus 2 aserciones afectadas actualizadas,
research.md #4)
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo existente)
**Performance Goals**: búsquedas <300ms con hasta 1M Oportunidades por Organization en
el 95% de los casos (SC-002, SC-003); KPIs/forecast reflejan cambios en <5s (SC-005,
satisfecho trivialmente por agregación en vivo, research.md #13)
**Constraints**: toda Oportunidad pertenece a exactamente un Pipeline y una
PipelineStage de ese Pipeline (FR-004); mover a una etapa `isWonStage`/`isLostStage`
sincroniza `state` automáticamente (research.md #2); editar una Oportunidad `Ganada`
exige un permiso distinto del CRUD normal (RN-005); sin eliminación física en ningún
estado; concurrencia optimista en ediciones normales
**Scale/Scope**: 5 User Stories (P1-P5); todas se implementan completas — a diferencia
de spec 010, esta spec no tiene una historia con alcance deliberadamente acotado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Specification First**: PASS — spec.md aprobada (checklist sin
  `[NEEDS CLARIFICATION]`) precede a este plan.
- **II. Modular by Design**: PASS, y además **resuelve** la excepción temporal que
  spec 010 había dejado abierta. Nuevo módulo `opportunities` que importa `identity`,
  `organizations`, `roles`, `customers` y `contacts`. `LeadsModule` pasa a importar
  `OpportunitiesModule` (elimina `opportunity-stub.repository.ts`) — la dirección de
  dependencia sigue siendo "el módulo más nuevo importa al más viejo" incluso aunque
  010 < 011 numéricamente, porque la dependencia real siempre fue de Leads hacia
  Opportunities, nunca al revés (spec 010 solo tenía un repositorio temporal por no
  existir todavía el módulo real). El Pipeline por defecto se crea perezosamente
  (`findOrCreateDefault`) precisamente para **evitar** que `OrganizationsModule`
  (spec 005, plataforma) tuviera que importar `OpportunitiesModule` (dominio) — esa sí
  habría sido una dependencia invertida real.
- **III. Business Domain First**: PASS — entidades y campos vienen directo del
  lenguaje de spec.md Key Entities; `Pipeline`/`PipelineStage` como tablas reales
  (no enum) es la única forma de modelar "configurable por Organization" tal como el
  negocio lo pide (FR-004).
- **IV. Multi-Tenant by Default**: PASS — `Pipeline.organizationId`/
  `Opportunity.organizationId` filtran cada query en el repositorio mismo, mismo
  criterio que Customer/Contact/Lead. Mismo gap conocido de specs 008-010 (sin guard
  de gating por `enabledModules` en runtime), heredado sin resolver.
- **V. Security by Default**: PASS — cada endpoint exige `TenantContextGuard` +
  `@RequirePermission('opportunity.*')`; editar una Oportunidad `Ganada` exige
  específicamente `opportunity.edit_won` (RN-005); las acciones de FR-016 quedan
  auditadas.
- **VI. API First**: PASS — el frontend consume la misma API documentada en
  `contracts/opportunities-api.md`.
- **VII. Quality Before Features**: PASS — tests de contrato/integración por historia,
  más una re-ejecución completa de la suite de specs 004-010 tras la migración de
  `Opportunity` (ver Technical Context).
- **VIII. Simplicity Wins**: PASS — sin caché/materialized view para KPIs (research.md
  #13); `weightedValue` calculado, no persistido (#7); sin `currency` propio en
  Opportunity (#8); sin tabla de notas ilimitadas para "observaciones" (#9, a
  diferencia de `LeadNote`, sin un FR que lo exija aquí); sin acciones de Audit Log
  para configuración de Pipeline (FR-016 no las pide); Activities/Tasks/Documentos/
  Comentarios (FR-008) diferidos a sus specs dueñas en vez de construir stand-ins
  (#10) — cada decisión con su alternativa descartada en research.md.
- **IX. AI Assists — Never Governs**: N/A (forecast es aritmético, sin modelos
  predictivos, spec.md Assumptions).
- **X. Observability by Design**: PASS — reutiliza `AuditLogPublisher`; agrega 10
  acciones nuevas al enum existente (data-model.md).

Sin violaciones que requieran justificación en Complexity Tracking — a diferencia de
spec 010, esta spec no introduce una excepción nueva; **resuelve** la única excepción
que quedaba pendiente en el proyecto.

## Project Structure

### Documentation (this feature)

```text
specs/011-opportunities/
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
│   │   ├── organizations/                # spec 005 (sin cambios — ver Constitution Check)
│   │   ├── users/                        # spec 006 (sin cambios)
│   │   ├── roles/                        # spec 007 (permission-catalog.ts + default-roles.seeder.ts: 2 keys nuevas)
│   │   ├── customers/                    # spec 008 (sin cambios de esquema)
│   │   ├── contacts/                     # spec 009 (sin cambios de esquema)
│   │   ├── leads/                        # spec 010 — opportunity-stub.repository.ts ELIMINADO; convert-lead.use-case.ts actualizado; leads.module.ts importa OpportunitiesModule
│   │   └── opportunities/                # esta feature
│   │       ├── domain/
│   │       │   └── errors.ts             # OpportunityNotFoundError, OpportunityStaleUpdateError, OpportunityNotWonError, OpportunityNotLostError, OpportunityNotArchivedError, OpportunityArchivedError, StageNotFoundError, StageHasOpenOpportunitiesError, RequiresEditWonPermissionError
│   │       ├── infrastructure/
│   │       │   ├── pipeline.repository.ts        # findOrCreateDefault (research.md #3)
│   │       │   ├── pipeline-stage.repository.ts
│   │       │   ├── opportunity.repository.ts
│   │       │   └── opportunity-history.repository.ts
│   │       ├── application/
│   │       │   ├── create-opportunity.use-case.ts
│   │       │   ├── update-opportunity.use-case.ts        # incluye valor/probabilidad
│   │       │   ├── get-opportunity.use-case.ts
│   │       │   ├── search-opportunities.use-case.ts
│   │       │   ├── move-opportunity-stage.use-case.ts     # research.md #2
│   │       │   ├── win-opportunity.use-case.ts            # research.md #15
│   │       │   ├── lose-opportunity.use-case.ts           # research.md #15
│   │       │   ├── reopen-opportunity.use-case.ts         # research.md #15
│   │       │   ├── archive-opportunity.use-case.ts
│   │       │   ├── restore-opportunity.use-case.ts
│   │       │   ├── get-opportunity-timeline.use-case.ts
│   │       │   ├── get-opportunity-kpis.use-case.ts       # research.md #13
│   │       │   ├── get-opportunity-forecast.use-case.ts   # research.md #13
│   │       │   ├── list-pipelines.use-case.ts             # llama a findOrCreateDefault
│   │       │   ├── create-pipeline.use-case.ts
│   │       │   ├── create-pipeline-stage.use-case.ts
│   │       │   ├── update-pipeline-stage.use-case.ts
│   │       │   └── delete-pipeline-stage.use-case.ts      # research.md #11
│   │       └── api/
│   │           ├── opportunities.controller.ts
│   │           ├── pipelines.controller.ts
│   │           ├── opportunities-exceptions.filter.ts
│   │           └── dto/
│   └── tests/
│       ├── contract/
│       ├── integration/
│       └── e2e/

frontend/
└── src/
    ├── features/
    │   └── opportunities/
    │       ├── PipelineBoard.tsx       # US1: Kanban por etapas, mover → move-stage
    │       ├── OpportunityForm.tsx     # US1/US2: alta/edición, valor/probabilidad
    │       ├── OpportunityDetail.tsx   # US2/US3: ganar/perder/reabrir/archivar/restaurar
    │       ├── OpportunityTimeline.tsx # US5
    │       ├── PipelineSettings.tsx    # US1 AC4: configurar etapas (opportunity.manage_pipeline)
    │       └── OpportunityKpis.tsx     # US4: KPIs + forecast
    └── services/
        └── opportunities-api.ts
```

**Structure Decision**: Nuevo módulo NestJS `opportunities`, misma Clean Architecture
que `customers`/`contacts`/`leads`. Reemplaza la pantalla mock existente
(`frontend/src/features/pipeline/Pipeline.tsx`, datos estáticos del rediseño de UI) por
páginas reales conectadas a esta API — `nav-config.ts` actualiza los ítems
`crm`/`prospectos`/`oportunidades` que hoy apuntan a esa pantalla mock compartida.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Ninguna violación registrada — ver nota al final de Constitution Check.
