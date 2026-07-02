# Implementation Plan: Organizations (Multi-Tenant)

**Branch**: `main` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/005-organizations-multi-tenant/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar el módulo `organizations`: creación y configuración de `Organization`
(nombre, zona horaria, moneda, idioma, branding, impuestos, módulos habilitados, plan),
asignación automática del rol Propietario a su creador vía `Membership`, invitación de
Users (delegando la aceptación al endpoint ya reservado en spec 004,
`POST /auth/invitations/:token/accept`), cambio de plan con validación de límites, y
suspensión/reactivación administrativa — todo bajo aislamiento estricto por
`organizationId` (Constitución, Principio IV) y con Audit Log persistido y consultable
(a diferencia del logger de sólo-consola usado como "seam" temporal en Identity).
Enfoque técnico: módulo NestJS independiente (`organizations`), aislamiento por columna
`organizationId` + un `TenantContextGuard` que resuelve la Organization activa desde un
header validado contra las Memberships del User autenticado, y un nuevo `AuditLog`
persistido en PostgreSQL vía Prisma.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS), consistente con el resto del
monorepo (backend NestJS + frontend React)
**Primary Dependencies**: NestJS (backend), Prisma ORM, React + Vite (frontend);
reutiliza `AuthGuard`/`AccessTokenService` del módulo `identity` (spec 004) para
resolver el User autenticado
**Storage**: PostgreSQL (vía Prisma) para `Organization`, `Membership`,
`OrganizationInvitation`, `AuditLog`
**Testing**: Jest (unit + integration backend) contra el mismo Postgres real aislado que
usa `identity` (`velo-test-db`), Vitest/Testing Library (frontend) — ver
[docs/implementation-plan.md](../../docs/implementation-plan.md)
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo existente)
**Performance Goals**: Cambios de configuración reflejados en <5s (SC-003); suspensión
efectiva en <5s (SC-005)
**Constraints**: Ningún dato de una Organization accesible desde otra bajo ninguna
operación (FR-011); una Organization nunca queda con cero Propietarios (FR-012);
dominios personalizados únicos entre Organizations (FR-014)
**Scale/Scope**: Al menos 100 Organizations activas simultáneas sin fuga de datos
(SC-002); catálogo de planes fuera de alcance (se modela como enum simple con límites en
código, ver research.md #2)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Specification First**: PASS — spec.md aprobada precede a este plan.
- **II. Modular by Design**: PASS — nuevo módulo NestJS `organizations`, independiente de
  `identity`; se comunican solo a través de servicios exportados (resolución de User) y
  del endpoint de aceptación de invitación ya reservado en el contrato de `identity`.
- **III. Business Domain First**: PASS — entidades y lenguaje (`Organization`,
  `Membership`, `Propietario`, `Plan`) provienen del Domain Model, no de decisiones
  técnicas.
- **IV. Multi-Tenant by Default**: PASS — es la feature que introduce el mecanismo de
  aislamiento (`organizationId` + `TenantContextGuard`) que el resto de la plataforma
  reutilizará.
- **V. Security by Default**: PASS — todas las acciones de ciclo de vida quedan
  auditadas (FR-013); ningún endpoint de Organization opera sin resolver antes la
  Membership del User contra esa Organization.
- **VI. API First**: PASS — el frontend consume la misma API REST documentada en
  `contracts/organizations-api.md`.
- **VII. Quality Before Features**: PASS — cada User Story lleva tests de contrato/
  integración antes de darse por completa (ver tasks.md una vez generado).
- **VIII. Simplicity Wins**: PASS — el catálogo de planes se resuelve como configuración
  estática en código (no un motor de precios), y el aislamiento se hace explícito por
  parámetro en cada repositorio en vez de middleware "mágico" (ver research.md #1).
- **IX. AI Assists — Never Governs**: N/A — esta feature no introduce componentes de IA.
- **X. Observability by Design**: PASS — introduce el primer `AuditLog` persistido y
  consultable de la plataforma (research.md #4); reemplaza el logger de sólo-consola de
  `identity` como el modelo a seguir hacia adelante (la migración retroactiva de
  `identity` queda fuera de alcance de esta feature).

Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-organizations-multi-tenant/
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
│   │   ├── identity/                     # spec 004 (ya implementado)
│   │   └── organizations/                # esta feature
│   │       ├── domain/
│   │       │   └── errors.ts
│   │       ├── application/
│   │       │   ├── create-organization.use-case.ts
│   │       │   ├── update-organization-settings.use-case.ts
│   │       │   ├── invite-member.use-case.ts
│   │       │   ├── cancel-invitation.use-case.ts
│   │       │   ├── accept-invitation.use-case.ts
│   │       │   ├── change-plan.use-case.ts
│   │       │   ├── suspend-organization.use-case.ts
│   │       │   └── reactivate-organization.use-case.ts
│   │       ├── infrastructure/
│   │       │   ├── organization.repository.ts
│   │       │   ├── membership.repository.ts
│   │       │   ├── organization-invitation.repository.ts
│   │       │   ├── audit-log.repository.ts
│   │       │   └── plan-catalog.ts        # límites/módulos por Plan (config estática)
│   │       └── api/
│   │           ├── organizations.controller.ts
│   │           ├── tenant-context.guard.ts
│   │           └── dto/
│   └── shared/
│       └── audit/
│           └── audit-log.publisher.ts     # persiste en AuditLog (reemplaza el seam de identity hacia adelante)
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
└── src/
    ├── features/
    │   └── organizations/
    │       ├── CreateOrganization.tsx
    │       ├── OrganizationSettings.tsx
    │       ├── Members.tsx
    │       └── PlanBilling.tsx
    └── services/
        └── organizations-api.ts
```

**Structure Decision**: Se extiende el monorepo `backend/` + `frontend/` ya existente
(mismo creado para spec 004) con un nuevo módulo NestJS `organizations`, siguiendo la
misma Clean Architecture por capas (`domain/application/infrastructure/api`) usada en
`identity`. No se introduce un tercer proyecto ni un paquete compartido nuevo: el
`AuthGuard` de `identity` se reutiliza tal cual para resolver el User autenticado, y el
nuevo `TenantContextGuard` se compone después de él en la cadena de Guards.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Ninguna violación registrada.
