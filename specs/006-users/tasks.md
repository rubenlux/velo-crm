---

description: "Task list for Users"
---

# Tasks: Users

**Input**: Design documents from `specs/006-users/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/users-api.md](contracts/users-api.md),
[quickstart.md](quickstart.md)

**Tests**: Incluidos en todas las historias. La Constitución del proyecto (Principio VII
"Quality Before Features" y Estándar de Ingeniería "Testing") exige Unit + Integration
(+ E2E cuando aplica) para toda feature de negocio; no son opcionales en este proyecto.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir
implementación y prueba independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US4)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Web app (monorepo ya existente, compartido con specs 004/005): `backend/src/`,
`backend/tests/`, `frontend/src/`, `frontend/tests/` — ver [plan.md](plan.md) § Project
Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extender el modelo `User` existente y crear el esqueleto del módulo
`users` (no se reinicializa nada de specs 004/005)

- [x] T001 Agregar columnas de perfil/estado (`firstName`, `lastName`, `avatarUrl`, `language`, `timezone`, `preferences`, `status` enum `UserStatus`, `deletedAt`) al modelo `User` en `backend/prisma/schema.prisma` (ver [data-model.md](data-model.md))
- [x] T002 Generar y aplicar la migración de Prisma para las columnas nuevas
- [x] T003 [P] Crear el esqueleto del módulo NestJS `users` (carpetas `domain/`, `application/`, `api/`) en `backend/src/modules/users/`

> **Nota de alcance (T001)**: al mapear la Acceptance Scenario 4 de US1 (un cambio de
> perfil "queda registrado en el Audit Log") se encontró que `AuditLog.organizationId`
> (spec 005) era obligatorio, pero editar el perfil propio no está atado a ninguna
> Organization. Se hizo `organizationId` nullable (columna + `@relation` opcional) para
> representar eventos de cuenta — ver research.md #7 (agregado durante la
> implementación, no estaba anticipado en el research original).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida entre `identity`, `organizations` y `users` que
todas las historias necesitan

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [x] T004 [P] Extender `UserRepository` de `identity` con `updateProfile`, `updatePreferences`, `updateStatus` y `findStatusById` en `backend/src/modules/identity/infrastructure/user.repository.ts`; exportarlo desde `IdentityModule` (research.md #1)
- [x] T005 [P] Crear `SessionHistoryRepository` (solo lectura, incluye sesiones revocadas/expiradas) en `backend/src/modules/identity/infrastructure/session-history.repository.ts`; exportarlo desde `IdentityModule` (research.md #3)
- [x] T006 [P] Agregar a `MembershipRepository` lo necesario para el invariante de administrador en `backend/src/modules/organizations/infrastructure/membership.repository.ts` (research.md #4)
- [x] T007 Exportar `TenantContextGuard` desde `OrganizationsModule` para que `users` lo reutilice en los endpoints de administración de ciclo de vida (research.md #5)
- [x] T008 Extender `TenantContextGuard` para rechazar si `User.status` (vía `UserRepository.findStatusById`, T004) no es `Active`, además de la Membership activa (research.md #5, FR-012) — depende de T004, T007
- [x] T009 [P] Definir errores de dominio (`LastAdminError`, `UserNotFoundError`, `InvalidStatusTransitionError`, `ForbiddenRoleActionError`) en `backend/src/modules/users/domain/errors.ts`
- [x] T010 Crear `UsersExceptionsFilter` (mismo patrón que `IdentityExceptionsFilter`/`OrganizationsExceptionsFilter`) en `backend/src/modules/users/api/users-exceptions.filter.ts`, registrarlo junto a los demás en `main.ts` y `tests/test-app.ts`

> **Nota de alcance (T006)**: en vez de un único `countActiveAdmins(organizationId,
> excludingUserId?)`, se implementó `MembershipRepository.listAdminMemberships(organizationId)`
> (devuelve las Memberships con rol Propietario/Administrador) y `listByUserId(userId)`
> (usado también por US2). El cruce con `User.status` para saber cuántos quedarían
> `Active` se resuelve en un nuevo `LastAdminGuard`
> (`backend/src/modules/users/application/last-admin.guard.ts`, no listado
> originalmente) que compone `MembershipRepository` + `UserRepository` — exactamente el
> patrón que describía research.md #4, solo que como una clase dedicada en vez de un
> único método de repositorio con la lógica de conteo adentro.

**Checkpoint**: Foundation lista — las historias de usuario pueden empezar

> **Nota de alcance (T008)**: este es el único punto donde `organizations` pasa a
> depender de un método de `identity` que no existía antes (`findStatusById`). No se
> introduce dependencia circular: `identity` sigue sin conocer `organizations` ni
> `users`.

---

## Phase 3: User Story 1 - Editar mi perfil y preferencias (Priority: P1) 🎯 MVP

**Goal**: Un User autenticado puede ver y editar su perfil (nombre, apellido, avatar,
idioma, zona horaria) y sus preferencias.

**Independent Test**: Ver [quickstart.md](quickstart.md) — editar perfil, editar
preferencias, verificar reflejo inmediato y entrada en el Audit Log.

### Tests for User Story 1

- [x] T011 [P] [US1] Contract test `GET /users/me` en `backend/tests/contract/users-me.spec.ts`
- [x] T012 [P] [US1] Contract test `PATCH /users/me/profile` en `backend/tests/contract/users-update-profile.spec.ts`
- [x] T013 [P] [US1] Integration test: `PATCH /users/me/preferences` persiste y genera entrada en Audit Log (Acceptance Scenario 4, SC-003) en `backend/tests/integration/users-preferences.spec.ts`

### Implementation for User Story 1

- [x] T014 [US1] Implementar `GetMyProfileUseCase` en `backend/src/modules/users/application/get-my-profile.use-case.ts` (depende de T004)
- [x] T015 [US1] Implementar `UpdateProfileUseCase` (publica `UserProfileUpdated` en Audit Log) en `backend/src/modules/users/application/update-profile.use-case.ts` (depende de T004)
- [x] T016 [US1] Implementar `UpdatePreferencesUseCase` en `backend/src/modules/users/application/update-preferences.use-case.ts` (depende de T004)
- [x] T017 [US1] Crear `UsersController` (`GET /users/me`, `PATCH /users/me/profile`, `PATCH /users/me/preferences`) en `backend/src/modules/users/api/users.controller.ts` (depende de T014-T016; `AuthGuard` es global, no requiere decorador)
- [x] T018 [P] [US1] Crear servicio de API del frontend en `frontend/src/services/users-api.ts`
- [x] T019 [P] [US1] Construir página "Mi perfil" en `frontend/src/features/users/Profile.tsx`
- [x] T020 [P] [US1] Construir página "Preferencias" en `frontend/src/features/users/Preferences.tsx`

> **Nota de alcance (T017)**: se agregó también `GET /users/me/audit-log`
> (`ListMyAuditLogUseCase`, no listado originalmente) para poder verificar de forma
> real la Acceptance Scenario 4 ("queda registrado... verificable") — ver research.md
> #7.

**Checkpoint**: User Story 1 funciona de forma independiente — este es el MVP de esta
spec

---

## Phase 4: User Story 2 - Cambiar entre mis organizaciones (Priority: P2)

**Goal**: Un User puede ver todas sus Organizations (con su Role en cada una) y cambiar
de contexto activo.

**Independent Test**: Con un User con Membership en dos Organizations, listar ambas y
verificar que el Role mostrado corresponde a cada una; cambiar el header
`X-Organization-Id` y confirmar que los permisos cambian de acuerdo (ya reforzado por
`TenantContextGuard`, spec 005).

### Tests for User Story 2

- [x] T021 [P] [US2] Integration test: `GET /users/me/organizations` lista únicamente las Organizations con Membership activa y su Role correcto en cada una (Acceptance Scenario 1) en `backend/tests/integration/users-organizations.spec.ts`
- [x] T022 [P] [US2] Integration test: acceder con un `X-Organization-Id` sin Membership es denegado (Acceptance Scenario 3, ya cubierto por `TenantContextGuard` — este test lo verifica desde la perspectiva de esta historia) en `backend/tests/integration/users-organizations-switch.spec.ts`

### Implementation for User Story 2

- [x] T023 [US2] Implementar `ListMyOrganizationsUseCase` en `backend/src/modules/users/application/list-my-organizations.use-case.ts` (depende de `MembershipRepository`, `OrganizationRepository`)
- [x] T024 [US2] Agregar endpoint `GET /users/me/organizations` a `UsersController` (depende de T023)
- [x] T025 [P] [US2] Construir selector de organización en `frontend/src/features/users/OrganizationSwitcher.tsx` (actualiza `X-Organization-Id` guardado en `session.ts`, sin round-trip al servidor — research.md #2)

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Administrar el ciclo de vida de Users de mi Organization (Priority: P3)

**Goal**: Un Administrador puede desactivar, reactivar y eliminar (soft delete) Users de
su Organization, respetando el invariante de "nunca sin administrador".

**Independent Test**: Ver [quickstart.md](quickstart.md) — desactivar, reactivar,
eliminar, y verificar el invariante de administrador y el bloqueo de acceso por estado.

### Tests for User Story 3

- [x] T026 [P] [US3] Integration test: ciclo `Active → Inactive → Active` conserva Role y datos (Acceptance Scenario 1-2) en `backend/tests/integration/users-deactivate-reactivate.spec.ts`
- [x] T027 [P] [US3] Integration test: soft delete (`→ Deleted`) impide reactivación posterior (FR-007, Acceptance Scenario 3) en `backend/tests/integration/users-delete.spec.ts`
- [x] T028 [P] [US3] Integration test: rechaza desactivar/eliminar al único administrador activo (FR-008, SC-004) en `backend/tests/integration/users-last-admin.spec.ts`
- [x] T029 [P] [US3] Integration test: un User `Inactive`/`Suspended`/`Deleted` no accede a datos de la Organization aunque su login siga siendo válido (FR-012, SC-005) en `backend/tests/integration/users-status-blocks-access.spec.ts`

### Implementation for User Story 3

- [x] T030 [US3] Implementar `DeactivateUserUseCase` (verifica rol del actor, invariante de administrador vía `LastAdminGuard`, publica `UserStatusChanged`) en `backend/src/modules/users/application/deactivate-user.use-case.ts`
- [x] T031 [US3] Implementar `ReactivateUserUseCase` (rechaza si el target está `Deleted`) en `backend/src/modules/users/application/reactivate-user.use-case.ts`
- [x] T032 [US3] Implementar `DeleteUserUseCase` (soft delete, mismo invariante de administrador) en `backend/src/modules/users/application/delete-user.use-case.ts`
- [x] T033 [US3] Agregar endpoints `POST /organizations/:id/members/:userId/deactivate`, `/reactivate` y `DELETE /organizations/:id/members/:userId`, protegidos por `TenantContextGuard` (T007) (depende de T030-T032)
- [x] T034 [P] [US3] Construir página "Administrar usuarios" (listar, desactivar, reactivar, eliminar) en `frontend/src/features/users/ManageOrgUsers.tsx`

> **Nota de alcance (T033)**: los endpoints se implementaron en un controller nuevo,
> `backend/src/modules/users/api/organization-members.controller.ts`
> (`OrganizationMembersController`, `@Controller('organizations')`), no en
> `UsersController` (que vive bajo el prefijo `/users`). Además, el parámetro de ruta se
> nombró `:id` (no `:organizationId` como decía la tarea original) para que coincida
> con el que ya espera el chequeo anti-confused-deputy de `TenantContextGuard`
> (`request.params?.id`, spec 005) — de haber usado otro nombre, ese chequeo específico
> quedaba deshabilitado en silencio para estas rutas.

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

---

## Phase 6: User Story 4 - Ver mi historial de accesos (Priority: P4)

**Goal**: Un User puede consultar sus accesos recientes.

**Independent Test**: Iniciar sesión un par de veces y verificar que el historial
refleja esos eventos con fecha, sin exponer accesos de otros Users.

### Tests for User Story 4

- [x] T035 [P] [US4] Integration test: el historial de accesos refleja logins recientes y nunca expone accesos de otro User (Acceptance Scenario 1-2) en `backend/tests/integration/users-access-history.spec.ts`

### Implementation for User Story 4

- [x] T036 [US4] Implementar `ListAccessHistoryUseCase` en `backend/src/modules/users/application/list-access-history.use-case.ts` (depende de T005)
- [x] T037 [US4] Agregar endpoint `GET /users/me/access-history` a `UsersController` (depende de T036)
- [x] T038 [P] [US4] Construir página "Historial de accesos" en `frontend/src/features/users/AccessHistory.tsx`

**Checkpoint**: Las 4 historias de usuario funcionan de forma independiente

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [x] T039 [P] E2E test del flujo completo de quickstart.md en `backend/tests/e2e/users/quickstart.spec.ts`
- [x] T040 Revisión de hardening de seguridad: confirmar que ningún endpoint bajo `/organizations/:id/members/...` quede sin `TenantContextGuard`, y auditoría de secretos/env
- [x] T041 [P] Actualizar estado de la Fase 1 (módulo Users) en `docs/implementation-plan.md`
- [x] T042 Ejecutar la validación manual de `quickstart.md` de punta a punta

> **T040**: se corrió `grep` sobre `backend/src/modules/users` buscando `console.log`,
> `TODO`, `FIXME` y claves privadas — sin resultados. Se confirmó que las 3 rutas de
> `OrganizationMembersController` tienen `@UseGuards(TenantContextGuard)` explícito
> (no son parte del guard de clase de `OrganizationsController`, que vive en otro
> controller). Se verificó que ningún archivo `.env` real quedó staged en git.
>
> **T042**: cubierto por el E2E `quickstart.spec.ts` (T039), que ejecuta la secuencia
> completa de `quickstart.md` (perfil → preferencias → Audit Log → listar/cambiar
> Organizations → invariante de administrador → bloqueo por estado → reactivación →
> historial de accesos) de punta a punta contra la base de datos real de test.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-6)**: todas dependen de Foundational
  - Pueden avanzar en paralelo (si hay capacidad) o en orden de prioridad P1→P4
- **Polish (Phase 7)**: depende de las historias que se quieran completar

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias — es el MVP de esta spec
- **US2 (P2)**: reutiliza `MembershipRepository`/`OrganizationRepository` de spec 005;
  independientemente testeable
- **US3 (P3)**: reutiliza `TenantContextGuard` (T007/T008) y `MembershipRepository.countActiveAdmins` (T006) de Foundational
- **US4 (P4)**: reutiliza `SessionHistoryRepository` (T005) de Foundational

### Within Each User Story

- Tests antes que implementación
- Repositories/extensiones antes que Use Cases
- Use Cases antes que Controller
- Backend antes que integración de frontend

### Parallel Opportunities

- Todas las tareas [P] de Setup y Foundational en paralelo entre sí
- Una vez completado Foundational, US1-US4 pueden trabajarse en paralelo por distintos desarrolladores
- Dentro de cada historia, los tests marcados [P] en paralelo entre sí

---

## Parallel Example: User Story 1

```bash
# Lanzar todos los tests de la User Story 1 juntos:
Task: "Contract test GET /users/me en backend/tests/contract/users-me.spec.ts"
Task: "Contract test PATCH /users/me/profile en backend/tests/contract/users-update-profile.spec.ts"
Task: "Integration test preferencias + Audit Log en backend/tests/integration/users-preferences.spec.ts"

# Lanzar las extensiones de Foundational juntas:
Task: "Extender UserRepository en backend/src/modules/identity/infrastructure/user.repository.ts"
Task: "Crear SessionHistoryRepository en backend/src/modules/identity/infrastructure/session-history.repository.ts"
Task: "Agregar MembershipRepository.countActiveAdmins en backend/src/modules/organizations/infrastructure/membership.repository.ts"
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
4. Agregar User Story 3 → Probar independientemente → Deploy/Demo
5. Agregar User Story 4 → Probar independientemente → Deploy/Demo
6. Cada historia agrega valor sin romper las anteriores

---

## Notes

- [P] tareas = archivos distintos, sin dependencias
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Cada historia de usuario debe ser completable y testeable de forma independiente
- Verificar que los tests fallan antes de implementar
- Commitear después de cada tarea o grupo lógico
- Detenerse en cada checkpoint para validar la historia de forma independiente
- Evitar: tareas vagas, conflictos de archivo compartido, dependencias entre historias que rompan su independencia
