---

description: "Task list for Organizations (Multi-Tenant)"
---

# Tasks: Organizations (Multi-Tenant)

**Input**: Design documents from `specs/005-organizations-multi-tenant/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/organizations-api.md](contracts/organizations-api.md),
[quickstart.md](quickstart.md)

**Tests**: Incluidos en todas las historias. La Constitución del proyecto (Principio VII
"Quality Before Features" y Estándar de Ingeniería "Testing") exige Unit + Integration
(+ E2E cuando aplica) para toda feature de negocio; no son opcionales en este proyecto.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir
implementación y prueba independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US5)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Web app (monorepo ya existente, compartido con spec 004): `backend/src/`,
`backend/tests/`, `frontend/src/`, `frontend/tests/` — ver [plan.md](plan.md) § Project
Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extender el monorepo existente con el módulo `organizations` (no se
reinicializa nada de spec 004)

- [x] T001 Agregar modelos Prisma `Organization`, `Membership`, `OrganizationInvitation`, `AuditLog` en `backend/prisma/schema.prisma` (ver [data-model.md](data-model.md))
- [x] T002 Generar y aplicar la migración de Prisma para el módulo organizations
- [x] T003 [P] Crear el esqueleto del módulo NestJS `organizations` (carpetas `domain/`, `application/`, `infrastructure/`, `api/`) en `backend/src/modules/organizations/`
- [x] T004 [P] Definir catálogo estático de planes y límites en `backend/src/modules/organizations/infrastructure/plan-catalog.ts` (research.md #2)

> **Nota de alcance (T003)**: durante el Setup también se movió `PrismaService` de
> `identity/infrastructure/` a `backend/src/shared/prisma/prisma.service.ts` (exportado
> por `IdentityModule`), para que `organizations` no abra una segunda conexión/pool
> a la misma base — no estaba listado como tarea propia pero era necesario antes de
> poder crear cualquier repository de este módulo.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura del módulo `organizations` que todas las historias
necesitan

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [x] T005 [P] Definir errores de dominio (`OrganizationNotFoundError`, `MembershipNotFoundError`, `LastOwnerError`, `DuplicateDomainError`, `PlanLimitExceededError`) en `backend/src/modules/organizations/domain/errors.ts`
- [x] T006 [P] Crear `OrganizationRepository` (Prisma) en `backend/src/modules/organizations/infrastructure/organization.repository.ts`
- [x] T007 [P] Crear `MembershipRepository` (Prisma) en `backend/src/modules/organizations/infrastructure/membership.repository.ts`, incluyendo el conteo de Propietarios para el invariante FR-012
- [x] T008 [P] Crear `AuditLogRepository` + `AuditLogPublisher` (persistente, no solo logger) en `backend/src/modules/organizations/infrastructure/audit-log.repository.ts` y `backend/src/shared/audit/audit-log.publisher.ts` (research.md #4, FR-013)
- [x] T009 Implementar `TenantContextGuard` (resuelve `X-Organization-Id`, valida Membership activa, rechaza si la Organization está `suspended`) en `backend/src/modules/organizations/api/tenant-context.guard.ts` (research.md #1, #5, depende de T006, T007), compuesto después de `AuthGuard` de `identity` (spec 004)

> **Nota de alcance (T005)**: se agregaron también `OrganizationSuspendedError`,
> `InvalidOrExpiredInvitationError` y `ForbiddenRoleActionError` (no listados en la
> tarea original) porque las historias US3/US5 los necesitaban para traducir errores de
> dominio a HTTP vía `OrganizationsExceptionsFilter` (mismo patrón que
> `IdentityExceptionsFilter` en spec 004, tampoco listado explícitamente pero necesario).
>
> **Nota de seguridad (T009)**: además de lo descrito, el guard rechaza con
> `organization_id_mismatch` si el `:id` de la URL no coincide con el
> `X-Organization-Id` validado — sin este chequeo, un header válido para la Organization
> propia combinado con un `:id` de otra Organization en la URL habría eludido el
> aislamiento (confused deputy). Cubierto por test en
> `organizations-isolation.spec.ts`.

**Checkpoint**: Foundation lista — las historias de usuario pueden empezar

> **Nota de alcance (T009)**: `TenantContextGuard` reutiliza `AuthGuard` de `identity`
> (spec 004) para obtener el User autenticado; no reimplementa verificación de JWT. Esto
> cierra la nota de alcance dejada en `specs/004-authentication-identity/tasks.md` (T014)
> sobre que la verificación de Membership/Organization quedaba pendiente de este módulo.

---

## Phase 3: User Story 1 - Crear y configurar una organización (Priority: P1) 🎯 MVP

**Goal**: Un User autenticado puede crear una Organization, quedar como Propietario, y
ver/editar su configuración básica sin poder acceder a datos de otra Organization.

**Independent Test**: Ver [quickstart.md](quickstart.md) — crear, consultar, editar y
verificar aislamiento entre dos Organizations.

### Tests for User Story 1

- [x] T010 [P] [US1] Contract test `POST /organizations` en `backend/tests/contract/organizations-create.spec.ts`
- [x] T011 [P] [US1] Contract test `GET /organizations/:id` y `PATCH /organizations/:id` en `backend/tests/contract/organizations-get-update.spec.ts`
- [x] T012 [P] [US1] Integration test: aislamiento — un User sin Membership en una Organization no puede leerla ni modificarla (FR-011) en `backend/tests/integration/organizations-isolation.spec.ts`
- [x] T013 [P] [US1] Integration test: crear y actualizar una Organization genera entradas en el Audit Log (SC-004) en `backend/tests/integration/organizations-audit-log.spec.ts`

### Implementation for User Story 1

- [x] T014 [US1] Implementar `CreateOrganizationUseCase` (crea Organization + Membership Propietario en una transacción) en `backend/src/modules/organizations/application/create-organization.use-case.ts` (depende de T006, T007, T008)
- [x] T015 [US1] Implementar `UpdateOrganizationUseCase` (nombre/timezone/moneda/idioma, solo Propietario) en `backend/src/modules/organizations/application/update-organization.use-case.ts` (depende de T006, T008)
- [x] T016 [US1] Implementar `GetOrganizationUseCase` en `backend/src/modules/organizations/application/get-organization.use-case.ts`
- [x] T017 [US1] Implementar `ListAuditLogUseCase` (filtrable por rango de fechas y acción) en `backend/src/modules/organizations/application/list-audit-log.use-case.ts` (depende de T008)
- [x] T018 [US1] Crear `OrganizationsController` (`POST /organizations`, `GET /organizations/:id`, `PATCH /organizations/:id`, `GET /organizations/:id/audit-log`) en `backend/src/modules/organizations/api/organizations.controller.ts`, con `AuthGuard` + `TenantContextGuard` (depende de T009, T014-T017)
- [x] T019 [P] [US1] Crear servicio de API del frontend en `frontend/src/services/organizations-api.ts`
- [x] T020 [P] [US1] Construir página "Crear organización" en `frontend/src/features/organizations/CreateOrganization.tsx`
- [x] T021 [P] [US1] Construir página "Configuración de la organización" (ver/editar + Audit Log) en `frontend/src/features/organizations/OrganizationSettings.tsx`

**Checkpoint**: User Story 1 funciona de forma independiente — este es el MVP de esta
spec

---

## Phase 4: User Story 2 - Configurar branding, moneda, impuestos y módulos (Priority: P2)

**Goal**: Un Propietario puede personalizar branding, impuestos y módulos habilitados de
su Organization.

**Independent Test**: Sobre una Organization ya creada, actualizar logo/dominio,
impuestos y módulos habilitados, y verificar que solo afecta a esa Organization.

### Tests for User Story 2

- [x] T022 [P] [US2] Integration test: actualizar branding y rechazo de dominio duplicado entre Organizations (FR-014) en `backend/tests/integration/organizations-branding.spec.ts`
- [x] T023 [P] [US2] Integration test: configurar impuestos y habilitar/deshabilitar módulos según el plan vigente (FR-006, FR-007) en `backend/tests/integration/organizations-modules.spec.ts`

### Implementation for User Story 2

- [x] T024 [US2] Implementar `UpdateBrandingUseCase` (valida unicidad de `customDomain`) en `backend/src/modules/organizations/application/update-branding.use-case.ts` (depende de T006, T008)
- [x] T025 [US2] Implementar `UpdateTaxSettingsUseCase` en `backend/src/modules/organizations/application/update-tax-settings.use-case.ts`
- [x] T026 [US2] Implementar `UpdateModulesUseCase` (valida contra `plan-catalog.ts`) en `backend/src/modules/organizations/application/update-modules.use-case.ts` (depende de T004)
- [x] T027 [US2] Agregar endpoints `PATCH /organizations/:id/branding`, `/tax-settings`, `/modules` a `OrganizationsController` (depende de T024-T026)
- [x] T028 [P] [US2] Extender `OrganizationSettings.tsx` con secciones de branding, impuestos y módulos habilitados

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Invitar usuarios a la organización (Priority: P3)

**Goal**: Un Propietario puede invitar emails con un rol; al aceptar, se crea la
Membership correspondiente.

**Independent Test**: Invitar un email a una Organization, aceptar la invitación
(reutilizando el endpoint reservado en spec 004) y verificar que la Membership se crea
solo en esa Organization.

### Tests for User Story 3

- [x] T029 [P] [US3] Integration test: invitar respeta el límite de usuarios del plan y rechaza al excederlo (SC-006) en `backend/tests/integration/organizations-invite.spec.ts`
- [x] T030 [P] [US3] Integration test: aceptar una invitación crea la Membership con el rol asignado en `backend/tests/integration/organizations-invite-accept.spec.ts`
- [x] T031 [P] [US3] Integration test: cancelar una invitación invalida el token de inmediato en `backend/tests/integration/organizations-invite-cancel.spec.ts`

### Implementation for User Story 3

- [x] T032 [P] [US3] Crear `OrganizationInvitationRepository` en `backend/src/modules/organizations/infrastructure/organization-invitation.repository.ts`
- [x] T033 [US3] Implementar `InviteMemberUseCase` (reutiliza invitación `pending` existente para el mismo email, valida límite de plan) en `backend/src/modules/organizations/application/invite-member.use-case.ts` (depende de T032, T004)
- [x] T034 [US3] Implementar `CancelInvitationUseCase` en `backend/src/modules/organizations/application/cancel-invitation.use-case.ts`
- [x] T035 [US3] Implementar `AcceptInvitationUseCase` (crea Membership en una transacción) en `backend/src/modules/organizations/application/accept-invitation.use-case.ts` (research.md #3, depende de T007, T032)
- [x] T036 [US3] Agregar endpoints `POST/GET /organizations/:id/invitations`, `DELETE /organizations/:id/invitations/:invitationId` a `OrganizationsController` (depende de T033, T034)
- [x] T037 [US3] Implementar `POST /auth/invitations/:token/accept`, invocando `AcceptInvitationUseCase` (depende de T035) — **cierra T064, diferida en `specs/004-authentication-identity/tasks.md`**
- [x] T038 [P] [US3] Construir página "Miembros" (listar Memberships + invitaciones pendientes + formulario de invitación) en `frontend/src/features/organizations/Members.tsx`

> **Nota de alcance (T037)**: implementado en
> `backend/src/modules/organizations/api/invitation-accept.controller.ts`
> (`InvitationAcceptController`, `@Controller('auth/invitations')`) en vez de en
> `identity/api/auth.controller.ts` como decía la tarea original. Ponerlo en
> `identity` habría requerido que `IdentityModule` importe `OrganizationsModule`
> mientras `OrganizationsModule` ya importa `IdentityModule` (por `AuthGuard`),
> generando una dependencia circular entre módulos — evitable manteniendo el
> controlador en `organizations` pero expuesto exactamente en la ruta que spec 004
> reservó (`POST /auth/invitations/:token/accept`).
>
> **Nota de alcance (T038)**: la página "Miembros" necesitaba listar Memberships, pero
> ningún endpoint lo exponía todavía (ni en `contracts/organizations-api.md` ni en las
> tareas T029-T037). Se agregó `MembershipRepository.listActive()`,
> `ListMembersUseCase` y `GET /organizations/:id/members` para poder cumplir T038 tal
> como está redactada. `Membership` no tiene relación a `User` (decisión de
> data-model.md para no acoplar los módulos), así que la lista muestra `userId` crudo,
> no el email — resolverlo requeriría que `organizations` consulte `identity` para
> resolver emails, fuera de alcance de esta pasada.
>
> **Nota de seguridad (T035)**: se encontró durante la implementación que
> `AcceptInvitationUseCase` no verificaba que el email del User autenticado coincidiera
> con el email invitado — cualquiera que obtuviera el token (filtrado, reenviado,
> historial del navegador) podía aceptarlo con su propia cuenta y obtener el rol
> invitado en una Organization ajena. Se corrigió validando `invitation.email` contra
> el email del User autenticado dentro de la misma transacción (si no coincide, se
> revierte el `consume()` y la invitación sigue válida para su destinatario real).
> Cubierto por test en `organizations-invite-accept.spec.ts`.

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

---

## Phase 6: User Story 4 - Cambiar de plan (Priority: P4)

**Goal**: Un Propietario puede cambiar el plan de su Organization, con validación de
límites vigentes.

**Independent Test**: Cambiar el plan de una Organization existente y verificar que sus
límites (usuarios, módulos) se actualizan; bajar de plan excediendo límites debe
rechazarse.

### Tests for User Story 4

- [x] T039 [P] [US4] Integration test: subir de plan habilita de inmediato nuevos límites/módulos en `backend/tests/integration/organizations-plan-upgrade.spec.ts`
- [x] T040 [P] [US4] Integration test: bajar de plan se rechaza si excede los límites del plan destino (usuarios o módulos) en `backend/tests/integration/organizations-plan-downgrade.spec.ts`

### Implementation for User Story 4

- [x] T041 [US4] Implementar `ChangePlanUseCase` (valida límites contra `plan-catalog.ts` antes de aplicar) en `backend/src/modules/organizations/application/change-plan.use-case.ts` (depende de T004, T006, T007, T008)
- [x] T042 [US4] Agregar endpoint `PATCH /organizations/:id/plan` a `OrganizationsController` (depende de T041)
- [x] T043 [P] [US4] Construir página "Plan y facturación" en `frontend/src/features/organizations/PlanBilling.tsx`

**Checkpoint**: User Stories 1-4 funcionan de forma independiente

---

## Phase 7: User Story 5 - Suspender y reactivar una organización (Priority: P5)

**Goal**: Un administrador de la plataforma puede suspender y reactivar una
Organization sin perder sus datos.

**Independent Test**: Suspender una Organization existente, verificar que sus Users no
pueden operar en ella, y reactivarla para confirmar que recupera el acceso.

### Tests for User Story 5

- [x] T044 [P] [US5] Integration test: una Organization suspendida bloquea `TenantContextGuard` para todos sus Users (SC-005) en `backend/tests/integration/organizations-suspend.spec.ts`
- [x] T045 [P] [US5] Integration test: reactivar restaura el acceso normal con los datos intactos en `backend/tests/integration/organizations-reactivate.spec.ts`

### Implementation for User Story 5

- [x] T046 [P] [US5] Implementar `PlatformAdminGuard` (allowlist de emails desde `PLATFORM_ADMIN_EMAILS`, ver nota de alcance) en `backend/src/modules/organizations/api/platform-admin.guard.ts`
- [x] T047 [US5] Implementar `SuspendOrganizationUseCase` y `ReactivateOrganizationUseCase` en `backend/src/modules/organizations/application/suspend-organization.use-case.ts` y `reactivate-organization.use-case.ts` (depende de T006, T008)
- [x] T048 [US5] Agregar endpoints `POST /organizations/:id/suspend` y `/reactivate` a `OrganizationsController`, protegidos por `PlatformAdminGuard` en vez de `TenantContextGuard` (depende de T046, T047)

> **Nota de alcance (T046)**: la spec.md asume que la suspensión es "una acción
> administrativa de la plataforma" pero no existe todavía un concepto de administrador
> de plataforma (es distinto de Propietario/Administrador de una Organization). Para no
> bloquear esta historia ni inventar un sistema de roles de plataforma completo (fuera de
> alcance, Principio VIII Simplicity Wins), se resuelve con un allowlist de emails vía
> variable de entorno `PLATFORM_ADMIN_EMAILS`. Si en el futuro se requiere un sistema más
> rico (múltiples niveles de soporte, auditoría propia de acciones de plataforma), debe
> definirse en una spec dedicada.

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [x] T049 [P] E2E test del flujo completo de quickstart.md en `backend/tests/e2e/organizations/quickstart.spec.ts`
- [x] T050 Revisión de hardening de seguridad: aislamiento cross-tenant exhaustivo (todas las rutas de `OrganizationsController` rechazan sin Membership válida) y auditoría de secretos/env
- [x] T051 [P] Actualizar estado de la Fase 1 (módulo Organizations) en `docs/implementation-plan.md`
- [x] T052 Ejecutar la validación manual de `quickstart.md` de punta a punta

> **T050**: se corrió `grep` sobre `backend/src/modules/organizations` buscando
> `console.log`, `TODO`, `FIXME`, claves privadas y variantes de `SECRET` — sin
> resultados. Se verificó que ningún archivo `.env` real quedó staged en git (solo
> `.env.example`, con placeholders). Durante esta revisión se encontró y corrigió el
> problema de `AcceptInvitationUseCase` documentado en la nota de T035, y se confirmó
> el chequeo anti-confused-deputy de `TenantContextGuard` (nota de T009).
>
> **T052**: cubierto por el E2E `quickstart.spec.ts` (T049), que ejecuta la secuencia
> completa de `quickstart.md` (crear → configurar → aislar → branding/módulos →
> invitar → aceptar → cambiar plan → suspender → reactivar → Audit Log) de punta a
> punta contra la base de datos real de test.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-7)**: todas dependen de Foundational
  - Pueden avanzar en paralelo (si hay capacidad) o en orden de prioridad P1→P5
- **Polish (Phase 8)**: depende de las historias que se quieran completar

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias — es el MVP de esta spec
- **US2 (P2)**: reutiliza `OrganizationRepository` de US1 pero es independientemente testeable
- **US3 (P3)**: reutiliza `MembershipRepository` de Foundational; su único acoplamiento
  externo real es el endpoint de `identity` (T037), que ya estaba reservado desde spec 004
- **US4 (P4)**: reutiliza `plan-catalog.ts` de Setup y `OrganizationRepository` de US1
- **US5 (P5)**: reutiliza `TenantContextGuard` de Foundational (para que la suspensión
  surta efecto de inmediato en el resto de las historias)

### Within Each User Story

- Tests antes que implementación
- Repositories antes que Use Cases
- Use Cases antes que Controller
- Backend antes que integración de frontend

### Parallel Opportunities

- Todas las tareas [P] de Setup y Foundational en paralelo entre sí
- Una vez completado Foundational, US1-US5 pueden trabajarse en paralelo por distintos desarrolladores
- Dentro de cada historia, los tests marcados [P] en paralelo entre sí, y los repositories marcados [P] en paralelo entre sí

---

## Parallel Example: User Story 1

```bash
# Lanzar todos los tests de la User Story 1 juntos:
Task: "Contract test POST /organizations en backend/tests/contract/organizations-create.spec.ts"
Task: "Contract test GET/PATCH /organizations/:id en backend/tests/contract/organizations-get-update.spec.ts"
Task: "Integration test aislamiento cross-tenant en backend/tests/integration/organizations-isolation.spec.ts"
Task: "Integration test Audit Log en backend/tests/integration/organizations-audit-log.spec.ts"

# Lanzar los repositories de Foundational juntos:
Task: "OrganizationRepository en backend/src/modules/organizations/infrastructure/organization.repository.ts"
Task: "MembershipRepository en backend/src/modules/organizations/infrastructure/membership.repository.ts"
Task: "AuditLogRepository + AuditLogPublisher en backend/src/modules/organizations/infrastructure/audit-log.repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **STOP y VALIDAR**: probar User Story 1 de forma independiente (quickstart.md)
5. Deploy/demo si está listo

### Incremental Delivery

1. Completar Setup + Foundational → Fundación lista
2. Agregar User Story 1 → Probar independientemente → Deploy/Demo (MVP!)
3. Agregar User Story 2 → Probar independientemente → Deploy/Demo
4. Agregar User Story 3 → Probar independientemente → Deploy/Demo (cierra T064 de spec 004)
5. Agregar User Story 4 → Probar independientemente → Deploy/Demo
6. Agregar User Story 5 → Probar independientemente → Deploy/Demo
7. Cada historia agrega valor sin romper las anteriores

---

## Notes

- [P] tareas = archivos distintos, sin dependencias
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Cada historia de usuario debe ser completable y testeable de forma independiente
- Verificar que los tests fallan antes de implementar
- Commitear después de cada tarea o grupo lógico
- Detenerse en cada checkpoint para validar la historia de forma independiente
- Evitar: tareas vagas, conflictos de archivo compartido, dependencias entre historias que rompan su independencia
