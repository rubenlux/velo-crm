# Implementation Plan: Roles & Permissions (RBAC)

**Branch**: `main` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/007-roles-permissions/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar RBAC completo: catálogo de Permissions (`recurso.acción`, código estático,
extensible por specs futuras), Roles por defecto (compartidos, no por Organization) y
personalizados (por Organization, con herencia opcional de un rol por defecto),
asignación de múltiples Roles por Membership vía una tabla `RoleAssignment` nueva,
cálculo de permisos efectivos, y un `PermissionsGuard`/`@RequirePermission()`
reutilizable para futuras specs. **Decisión central de esta spec**: no se reemplaza
`Membership.role` (el campo único ya usado por specs 005/006) — RBAC se construye
**encima** de él como una capa adicional, sin tocar el código ya implementado y
testeado de esas specs. Ver research.md #1 para la justificación completa.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS), consistente con el resto del
monorepo
**Primary Dependencies**: NestJS, Prisma ORM, React + Vite; reutiliza `AuthGuard`
(identity, global), `TenantContextGuard`/`MembershipRepository`/`AuditLogPublisher`
(organizations)
**Storage**: PostgreSQL (vía Prisma) — dos tablas nuevas: `Role` y `RoleAssignment`;
ninguna tabla existente se modifica
**Testing**: Jest (unit + integration backend) contra `velo-test-db`, igual que specs
004-006
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo existente)
**Performance Goals**: Cambio de rol/permiso reflejado en <3s (SC-001); consulta de
permisos efectivos en <2s (SC-004)
**Constraints**: Ningún rol por defecto se puede eliminar (FR-007); ningún rol
personalizado se puede eliminar con Users asignados (FR-008); ningún User puede
otorgar un Permission que no posee (FR-013, sin escalamiento de privilegios)
**Scale/Scope**: Catálogo inicial de Permissions cubre los recursos ya implementados
(`organization.*`, `user.*`, `role.*`) más los recursos de CRM que specs 008-013 todavía
no implementan en código — ver research.md #5 sobre por qué el catálogo se declara
igual, por adelantado

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Specification First**: PASS — spec.md aprobada precede a este plan.
- **II. Modular by Design**: PASS — nuevo módulo `roles` que importa `identity` (por
  `AuthGuard`/tipos) y `organizations` (por `MembershipRepository`/`AuditLogPublisher`/
  `TenantContextGuard`); ningún módulo existente importa `roles`, evitando ciclos.
- **III. Business Domain First**: PASS — el catálogo de Roles y el formato
  `recurso.acción` de Permission vienen directo del lenguaje de spec.md.
- **IV. Multi-Tenant by Default**: PASS — los roles personalizados y las asignaciones
  son por Organization; los roles por defecto son compartidos pero sus asignaciones
  siempre están atadas a una Membership (User + Organization) concreta.
- **V. Security by Default**: PASS — FR-012/FR-013 exigen validar cada acción
  individualmente y prohibir escalamiento de privilegios; toda denegación y todo
  cambio de rol/permiso queda auditado (FR-014).
- **VI. API First**: PASS — el frontend consume la misma API documentada en
  `contracts/roles-api.md`.
- **VII. Quality Before Features**: PASS — tests de contrato/integración por historia,
  igual que specs 004-006.
- **VIII. Simplicity Wins**: PASS — no se reemplaza el modelo de roles ya funcional de
  specs 005/006 (research.md #1); `Permission` no es una tabla, es un catálogo estático
  en código (mismo patrón que `plan-catalog.ts` de spec 005); el acceso total de
  Propietario se resuelve como un bypass en código, no como una fila con todos los
  permisos enumerados (research.md #3).
- **IX. AI Assists — Never Governs**: N/A.
- **X. Observability by Design**: PASS — reutiliza el `AuditLogPublisher` ya
  persistente de spec 005; agrega `PermissionDenied` como nueva acción auditada
  (Acceptance Scenario 4 de US1, SC-002).

Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-roles-permissions/
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
│   │   ├── organizations/                # spec 005 (sin cambios de esquema; TenantContextGuard reutilizado tal cual)
│   │   ├── users/                        # spec 006 (sin cambios)
│   │   └── roles/                        # esta feature
│   │       ├── domain/
│   │       │   └── errors.ts
│   │       ├── infrastructure/
│   │       │   ├── permission-catalog.ts       # catálogo estático (research.md #5)
│   │       │   ├── role.repository.ts
│   │       │   ├── role-assignment.repository.ts
│   │       │   └── default-roles.seeder.ts     # siembra idempotente de roles por defecto (research.md #2)
│   │       ├── application/
│   │       │   ├── assign-role.use-case.ts
│   │       │   ├── revoke-role.use-case.ts
│   │       │   ├── get-effective-permissions.use-case.ts
│   │       │   ├── create-custom-role.use-case.ts
│   │       │   ├── update-custom-role.use-case.ts
│   │       │   ├── delete-custom-role.use-case.ts
│   │       │   ├── list-roles.use-case.ts
│   │       │   └── list-available-permissions.use-case.ts
│   │       └── api/
│   │           ├── roles.controller.ts
│   │           ├── permissions.guard.ts        # @RequirePermission(), reutilizable por specs futuras
│   │           └── dto/
└── tests/
    ├── contract/
    ├── integration/
    └── e2e/

frontend/
└── src/
    ├── features/
    │   └── roles/
    │       ├── RolesList.tsx
    │       ├── RoleEditor.tsx
    │       ├── AssignRoles.tsx
    │       └── EffectivePermissions.tsx
    └── services/
        └── roles-api.ts
```

**Structure Decision**: Nuevo módulo NestJS `roles`, misma Clean Architecture que los
módulos anteriores. No se modifica `Membership` ni ningún use case de specs 005/006.
`RoleAssignment` es una tabla puente nueva e independiente; el `PermissionsGuard`
nuevo es opt-in (se usa vía `@RequirePermission('recurso.acción')` en endpoints
nuevos o retro-adoptados), no reemplaza globalmente a `TenantContextGuard` ni a los
chequeos de rol existentes.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Ninguna violación registrada.
