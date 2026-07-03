# Implementation Plan: Users

**Branch**: `main` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/006-users/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implementar el módulo `users`: perfil (nombre, apellido, avatar, idioma, zona horaria),
preferencias, ciclo de vida (`UserStatus`: Pending/Active/Inactive/Suspended/Deleted) del
`User` ya definido por spec 004, listar las Organizations donde el User tiene Membership
y "cambiar" de contexto activo (research.md #2), administración de ciclo de vida por un
Administrador (desactivar/reactivar/eliminar, con el invariante de "nunca sin
administrador" heredado de spec 005), e historial de accesos de solo lectura sobre
`Session` (spec 004). `User` sigue siendo una única tabla/entidad; este módulo agrega
columnas de perfil/estado y las use cases que las gobiernan, sin duplicar el modelo de
autenticación de `identity` ni el de `Membership` de `organizations`.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS), consistente con el resto del
monorepo
**Primary Dependencies**: NestJS, Prisma ORM, React + Vite; reutiliza `UserRepository`
(extendido) y `AuthGuard` de `identity` (spec 004), y `MembershipRepository`/
`TenantContextGuard` de `organizations` (spec 005)
**Storage**: PostgreSQL (vía Prisma) — nuevas columnas en el modelo `User` existente
(`firstName`, `lastName`, `avatarUrl`, `language`, `timezone`, `preferences`, `status`,
`deletedAt`); ninguna tabla nueva
**Testing**: Jest (unit + integration backend) contra `velo-test-db`, igual que specs
004/005
**Target Platform**: Servicio web backend (Linux container) + SPA frontend, cloud native
**Project Type**: Web application (backend NestJS + frontend React, monorepo existente)
**Performance Goals**: Edición de perfil reflejada en <3s (SC-001); cambio de
Organization activa en <3s (SC-002); historial de accesos en <2s (SC-006)
**Constraints**: Un User en `Suspended`/`Inactive`/`Deleted` no accede a datos de
ninguna Organization aunque sus credenciales sigan siendo válidas (FR-012); nunca
desactivar/eliminar al único administrador de una Organization (FR-008)
**Scale/Scope**: Mismo orden de magnitud que specs 004/005 (decenas a ~100
Organizations, según spec 005 SC-002)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Specification First**: PASS — spec.md aprobada precede a este plan.
- **II. Modular by Design**: PASS con una extensión documentada — `User` es una entidad
  compartida entre `identity` (autenticación) y `users` (perfil/ciclo de vida); ambos
  módulos operan sobre la misma tabla a través del `UserRepository` de `identity`
  (extendido, exportado), en vez de que `users` cree un segundo repositorio duplicado
  sobre la misma tabla. Ver research.md #1 para la justificación completa.
- **III. Business Domain First**: PASS — `UserStatus`, perfil y el invariante de
  administrador provienen directamente del lenguaje de spec.md, no de una decisión
  técnica.
- **IV. Multi-Tenant by Default**: PASS — el chequeo de `User.status` se suma al
  aislamiento ya existente de `TenantContextGuard` (spec 005): un User no-Active no
  accede a datos de ninguna Organization aunque tenga Membership activa.
- **V. Security by Default**: PASS — el historial de accesos es estrictamente
  autoreferencial (un User nunca ve los accesos de otro); toda transición de estado
  queda auditada.
- **VI. API First**: PASS — el frontend consume la misma API documentada en
  `contracts/users-api.md`.
- **VII. Quality Before Features**: PASS — tests de contrato/integración por historia,
  igual que specs 004/005.
- **VIII. Simplicity Wins**: PASS — "cambiar de Organization activa" (US2) no requiere
  estado nuevo en el servidor: spec 005 ya resolvió la resolución de tenant vía header
  `X-Organization-Id` por request (research.md #5 de spec 005); este módulo solo agrega
  el endpoint de listado y deja que el cliente cambie el header, sin inventar una sesión
  de "organización activa" del lado del servidor. Ver research.md #2.
- **IX. AI Assists — Never Governs**: N/A.
- **X. Observability by Design**: PASS — reutiliza el `AuditLogPublisher` de spec 005
  para perfil/estado (ver research.md #4 de spec 005: ese Audit Log ya es persistente y
  consultable, a diferencia del seam de `identity`).

Sin violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-users/
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
│   │   │   └── infrastructure/
│   │   │       ├── user.repository.ts    # EXTENDIDO: updateProfile/updatePreferences/updateStatus/findStatusById
│   │   │       └── session-history.repository.ts  # NUEVO: lectura de historial (research.md #3)
│   │   ├── organizations/                # spec 005 (ya implementado)
│   │   └── users/                        # esta feature
│   │       ├── domain/
│   │       │   └── errors.ts
│   │       ├── application/
│   │       │   ├── update-profile.use-case.ts
│   │       │   ├── update-preferences.use-case.ts
│   │       │   ├── list-my-organizations.use-case.ts
│   │       │   ├── deactivate-user.use-case.ts
│   │       │   ├── reactivate-user.use-case.ts
│   │       │   ├── delete-user.use-case.ts
│   │       │   └── list-access-history.use-case.ts
│   │       └── api/
│   │           ├── users.controller.ts
│   │           └── dto/
└── tests/
    ├── contract/
    ├── integration/
    └── e2e/

frontend/
└── src/
    ├── features/
    │   └── users/
    │       ├── Profile.tsx
    │       ├── Preferences.tsx
    │       ├── OrganizationSwitcher.tsx
    │       ├── AccessHistory.tsx
    │       └── ManageOrgUsers.tsx
    └── services/
        └── users-api.ts
```

**Structure Decision**: Nuevo módulo NestJS `users` en el monorepo existente, con la
misma Clean Architecture por capas usada en `identity`/`organizations`. No se crea una
tabla nueva para perfil/estado: se extiende el modelo `User` ya existente (propiedad de
`identity` a nivel de schema), y el `UserRepository` de `identity` se extiende con los
métodos de escritura que `users` necesita, exportado para que `users` los consuma — ver
research.md #1 para por qué no se creó un segundo repositorio sobre la misma tabla.
`UsersModule` importa `IdentityModule` (por `UserRepository`/`AuthGuard`) y
`OrganizationsModule` (por `MembershipRepository`/`TenantContextGuard`); ninguno de esos
dos módulos depende de `users`, evitando una dependencia circular.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

Ninguna violación registrada.
