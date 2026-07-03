---

description: "Task list for Roles & Permissions (RBAC)"
---

# Tasks: Roles & Permissions (RBAC)

**Input**: Design documents from `specs/007-roles-permissions/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/roles-api.md](contracts/roles-api.md),
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

Web app (monorepo ya existente, compartido con specs 004-006): `backend/src/`,
`backend/tests/`, `frontend/src/`, `frontend/tests/` — ver [plan.md](plan.md) § Project
Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear las tablas nuevas (`Role`, `RoleAssignment`, `MembershipPermission`)
y el esqueleto del módulo `roles`, sin modificar ninguna tabla existente
(research.md #1)

- [x] T001 Agregar los modelos Prisma `Role`, `RoleAssignment` y `MembershipPermission` en `backend/prisma/schema.prisma` (ver [data-model.md](data-model.md))
- [x] T002 Generar y aplicar la migración de Prisma para el módulo roles
- [x] T003 [P] Crear el esqueleto del módulo NestJS `roles` (carpetas `domain/`, `infrastructure/`, `application/`, `api/`) en `backend/src/modules/roles/`
- [x] T004 [P] Definir el catálogo estático de Permissions (`recurso.acción` + módulo) en `backend/src/modules/roles/infrastructure/permission-catalog.ts` (research.md #5)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida por todas las historias de esta spec

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [x] T005 [P] Crear `RoleRepository` (CRUD sobre `Role`, incluye `findDefaults()`, `findByOrganization(organizationId)`) en `backend/src/modules/roles/infrastructure/role.repository.ts`
- [x] T006 [P] Crear `RoleAssignmentRepository` en `backend/src/modules/roles/infrastructure/role-assignment.repository.ts`
- [x] T007 [P] Crear `MembershipPermissionRepository` en `backend/src/modules/roles/infrastructure/membership-permission.repository.ts` (research.md #6)
- [x] T008 Implementar `DefaultRolesSeeder` (siembra idempotente de los 8 roles por defecto no-Propietario vía `upsert` por nombre, ejecutado en el arranque del módulo) en `backend/src/modules/roles/infrastructure/default-roles.seeder.ts` (research.md #2)
- [x] T009 Actualizar `backend/tests/test-app.ts`: `resetDatabase()` solo borra roles personalizados (`organizationId` no nulo), preservando los roles por defecto; invocar `DefaultRolesSeeder` una vez en `createTestApp()`
- [x] T010 [P] Definir errores de dominio (`RoleNotFoundError`, `DefaultRoleImmutableError`, `RoleInUseError`, `PrivilegeEscalationError`) en `backend/src/modules/roles/domain/errors.ts`
- [x] T011 Crear `RolesExceptionsFilter` (mismo patrón que los filtros de specs 004-006) en `backend/src/modules/roles/api/roles-exceptions.filter.ts`, registrarlo en `main.ts` y `tests/test-app.ts`
- [x] T012 Implementar `EffectivePermissionsService` (rol base `Membership.role` ∪ `RoleAssignment` ∪ `MembershipPermission`, con bypass total si el rol base es Propietario — research.md #1, #3) en `backend/src/modules/roles/application/effective-permissions.service.ts`
- [x] T013 Implementar `PermissionsGuard` + decorator `@RequirePermission('recurso.acción')` (usa `EffectivePermissionsService`; publica `PermissionDenied` en el Audit Log al rechazar) en `backend/src/modules/roles/api/permissions.guard.ts` (depende de T012)

**Checkpoint**: Foundation lista — las historias de usuario pueden empezar

> **Nota de alcance (T008-T009)**: los roles por defecto son filas compartidas
> (`organizationId = null`), no una copia por Organization — ver research.md #2. Esto
> significa que `resetDatabase()` (usado entre cada test) no puede simplemente borrar
> toda la tabla `Role` como hace con el resto de las tablas, o cada test tendría que
> re-sembrar los 8 roles por defecto manualmente.

> **Nota de implementación (T008-T010)**: `DefaultRolesSeeder` implementa
> `OnModuleInit` (se ejecuta automáticamente en `app.init()`); `createTestApp()`
> además invoca `seed()` explícitamente una vez más como refuerzo, sin efecto
> adicional por ser idempotente. `domain/errors.ts` (T010) terminó con 3 errores más
> de los 4 nombrados originalmente en esta tarea (`UnknownPermissionError`,
> `DuplicateRoleNameError`, `InvalidRoleInheritanceError`), necesarios para las
> validaciones de US3 (catálogo, nombre duplicado, herencia inválida) descubiertas al
> implementar `CreateCustomRoleUseCase`/`UpdateCustomRoleUseCase`.

---

## Phase 3: User Story 1 - Asignar roles y ver el efecto inmediato en los permisos (Priority: P1) 🎯 MVP

**Goal**: Un Administrador puede asignar/revocar Roles adicionales y Permissions
directos a un User dentro de su Organization, con efecto inmediato y auditado; toda
acción sin autorización se deniega y se registra.

**Independent Test**: Ver [quickstart.md](quickstart.md) — asignar un segundo rol,
revocarlo, e intentar una acción protegida sin el permiso requerido.

### Tests for User Story 1

- [x] T014 [P] [US1] Integration test: asignar un segundo Role otorga la unión de permisos de inmediato (Acceptance Scenario 1-2, SC-001) en `backend/tests/integration/roles-assign.spec.ts`
- [x] T015 [P] [US1] Integration test: revocar un Role adicional quita sus permisos de inmediato (Acceptance Scenario 3) en `backend/tests/integration/roles-revoke.spec.ts`
- [x] T016 [P] [US1] Integration test: otorgar/revocar un Permission directo (sin Role intermedio) se refleja en los permisos efectivos (research.md #6) en `backend/tests/integration/roles-direct-permissions.spec.ts`
- [x] T017 [P] [US1] Integration test: una acción protegida sin el Permission requerido se deniega y queda en el Audit Log como `PermissionDenied` (Acceptance Scenario 4, SC-002) en `backend/tests/integration/roles-permission-denied.spec.ts`
- [x] T018 [P] [US1] Integration test: rechaza escalamiento de privilegios al asignar un Role o Permission que el actor no posee (FR-013, SC-003) en `backend/tests/integration/roles-privilege-escalation.spec.ts`

### Implementation for User Story 1

- [x] T019 [US1] Implementar `AssignRoleUseCase` (valida anti-escalamiento vía `EffectivePermissionsService`, research.md #4; publica auditoría) en `backend/src/modules/roles/application/assign-role.use-case.ts` (depende de T006, T012)
- [x] T020 [US1] Implementar `RevokeRoleUseCase` en `backend/src/modules/roles/application/revoke-role.use-case.ts`
- [x] T021 [US1] Implementar `GrantDirectPermissionUseCase` y `RevokeDirectPermissionUseCase` (mismo chequeo anti-escalamiento) en `backend/src/modules/roles/application/grant-direct-permission.use-case.ts` y `revoke-direct-permission.use-case.ts` (depende de T007, T012)
- [x] T022 [US1] Crear `RolesController` con `POST/DELETE /organizations/:id/members/:userId/roles[/:roleId]` y `POST/DELETE /organizations/:id/members/:userId/permissions[/:permission]` en `backend/src/modules/roles/api/roles.controller.ts`, protegido por `TenantContextGuard` (spec 005) (depende de T019-T021)
- [x] T023 [US1] Migrar `OrganizationMembersController` (spec 006: deactivate/reactivate/delete) de su chequeo hardcodeado de rol a `@RequirePermission('user.manage')`, sin modificar los tests existentes de spec 006 (research.md #6) — depende de T013
- [x] T024 [P] [US1] Crear servicio de API del frontend en `frontend/src/services/roles-api.ts`
- [x] T025 [P] [US1] Construir página "Asignar roles y permisos" en `frontend/src/features/roles/AssignRoles.tsx`

**Checkpoint**: User Story 1 funciona de forma independiente — este es el MVP de esta
spec, y deja `PermissionsGuard` probado de punta a punta contra un endpoint real de
spec 006

> **Nota de implementación (T022, adelanta T029)**: `RolesController` aplica
> `TenantContextGuard` a nivel de clase (todo método queda tenant-scoped por
> defecto, siguiendo el patrón de `OrganizationsController`), pero
> `@UseGuards(PermissionsGuard)` + `@RequirePermission('role.manage')` se aplican
> **por método**, no a nivel de clase como se hizo en T023 para
> `OrganizationMembersController`. Motivo: el endpoint de permisos efectivos (US2,
> T029) tiene una regla condicional — un User siempre puede consultar los suyos
> propios sin requerir `role.manage`, pero consultar los de otro sí lo requiere — que
> un gate uniforme a nivel de clase no puede expresar. Se descubrió al planificar T029
> y se aplicó retroactivamente a T022 para mantener un único controller.
>
> **Confirmación (T023)**: los 82 tests preexistentes de specs 004-006 pasan sin
> ninguna modificación tras la retro-adopción (ver T050).

## Phase 4: User Story 2 - Ver mis permisos efectivos (Priority: P2)

**Goal**: Un User puede consultar sus propios permisos efectivos (o, si es
Administrador, los de otro User de su Organization).

**Independent Test**: Con un User con un Role conocido, consultar sus permisos
efectivos y verificar que coinciden exactamente con los de ese Role.

### Tests for User Story 2

- [x] T026 [P] [US2] Integration test: los permisos efectivos coinciden exactamente con los del Role asignado (Acceptance Scenario 1) en `backend/tests/integration/roles-effective-permissions.spec.ts`
- [x] T027 [P] [US2] Integration test: un Administrador puede consultar los permisos efectivos de otro User de su Organization; un User sin `role.manage` no puede consultar los de otro (Acceptance Scenario 3) en `backend/tests/integration/roles-effective-permissions-access.spec.ts`

### Implementation for User Story 2

- [x] T028 [US2] Implementar `GetEffectivePermissionsUseCase` (propio sin restricción; ajeno requiere `role.manage`) en `backend/src/modules/roles/application/get-effective-permissions.use-case.ts` (depende de T012)
- [x] T029 [US2] Agregar endpoint `GET /organizations/:id/members/:userId/effective-permissions` a `RolesController` (depende de T028)
- [x] T030 [P] [US2] Construir página "Mis permisos" / "Permisos de un miembro" en `frontend/src/features/roles/EffectivePermissions.tsx`

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Crear y editar roles personalizados (Priority: P3)

**Goal**: Un Administrador puede crear, editar y eliminar roles personalizados de su
Organization, opcionalmente heredando de un rol por defecto.

**Independent Test**: Crear un rol personalizado con un subconjunto de permisos,
asignarlo a un User, y verificar que solo puede ejecutar exactamente esas acciones.

### Tests for User Story 3

- [x] T031 [P] [US3] Integration test: crear un rol personalizado y asignarlo limita al User exactamente a esos permisos (Acceptance Scenario 1) en `backend/tests/integration/roles-custom-create.spec.ts`
- [x] T032 [P] [US3] Integration test: editar los permisos de un rol personalizado se refleja de inmediato en todos los Users que lo tienen (Acceptance Scenario 2) en `backend/tests/integration/roles-custom-edit.spec.ts`
- [x] T033 [P] [US3] Integration test: eliminar un rol personalizado sin Users asignados funciona; con Users asignados se rechaza (Acceptance Scenario 3-4, FR-008) en `backend/tests/integration/roles-custom-delete.spec.ts`
- [x] T034 [P] [US3] Integration test: un rol por defecto no puede editarse ni eliminarse (Acceptance Scenario 5, FR-007) en `backend/tests/integration/roles-default-immutable.spec.ts`
- [x] T035 [P] [US3] Integration test: un rol personalizado que hereda de uno por defecto acumula los permisos heredados más los propios (FR-009) en `backend/tests/integration/roles-inheritance.spec.ts`

### Implementation for User Story 3

- [x] T036 [US3] Implementar `CreateCustomRoleUseCase` (valida `inheritsFromRoleId` apunta a un rol por defecto) en `backend/src/modules/roles/application/create-custom-role.use-case.ts` (depende de T005)
- [x] T037 [US3] Implementar `UpdateCustomRoleUseCase` (rechaza si `isDefault`) en `backend/src/modules/roles/application/update-custom-role.use-case.ts`
- [x] T038 [US3] Implementar `DeleteCustomRoleUseCase` (rechaza si `isDefault` o si tiene `RoleAssignment` activos) en `backend/src/modules/roles/application/delete-custom-role.use-case.ts` (depende de T006)
- [x] T039 [US3] Implementar `ListRolesUseCase` (por defecto + personalizados de la Organization) en `backend/src/modules/roles/application/list-roles.use-case.ts`
- [x] T040 [US3] Agregar endpoints `GET/POST /organizations/:id/roles`, `PATCH/DELETE /organizations/:id/roles/:roleId` a `RolesController` (depende de T036-T039)
- [x] T041 [P] [US3] Construir páginas "Roles" (listar) y "Editor de rol" (crear/editar personalizado) en `frontend/src/features/roles/RolesList.tsx` y `RoleEditor.tsx`

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

> **Bug encontrado y corregido (T037-T038)**: la primera versión de
> `UpdateCustomRoleUseCase`/`DeleteCustomRoleUseCase` rechazaba con 404
> (`RoleNotFoundError`) cualquier intento de editar/eliminar un rol **por defecto**,
> en vez de 403 (`DefaultRoleImmutableError`) — el chequeo de pertenencia a la
> Organization (`role.organizationId !== input.organizationId`) no contemplaba que un
> rol por defecto tiene `organizationId = null`, y por lo tanto nunca es literalmente
> igual al `organizationId` de la request. Detectado por T034
> (`roles-default-immutable.spec.ts`, esperaba 403 y recibía 404) y corregido a
> `role.organizationId !== null && role.organizationId !== input.organizationId`,
> el mismo patrón ya usado en `AssignRoleUseCase`.

---

## Phase 6: User Story 4 - Configurar permisos habilitados por Organization (Priority: P4)

**Goal**: Los Permissions disponibles para asignar en roles reflejan los módulos
habilitados en el plan de la Organization.

**Independent Test**: Deshabilitar un módulo y verificar que sus Permissions dejan de
ofrecerse como opción disponible; habilitarlo los vuelve a ofrecer.

### Tests for User Story 4

- [x] T042 [P] [US4] Integration test: el catálogo disponible excluye los Permissions de un módulo deshabilitado y los vuelve a incluir al habilitarlo (Acceptance Scenario 1-2) en `backend/tests/integration/roles-available-permissions.spec.ts`

### Implementation for User Story 4

- [x] T043 [US4] Implementar `ListAvailablePermissionsUseCase` (filtra `permission-catalog.ts` por `Organization.enabledModules`, spec 005) en `backend/src/modules/roles/application/list-available-permissions.use-case.ts` (depende de T004)
- [x] T044 [US4] Agregar endpoint `GET /organizations/:id/permissions/catalog` a `RolesController` (depende de T043)
- [x] T045 [P] [US4] Integrar el catálogo disponible en `RoleEditor.tsx` (solo ofrecer permisos de módulos habilitados al crear/editar un rol personalizado)

**Checkpoint**: Las 4 historias de usuario funcionan de forma independiente

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [x] T046 [P] E2E test del flujo completo de quickstart.md en `backend/tests/e2e/roles/quickstart.spec.ts`
- [x] T047 Revisión de hardening de seguridad: confirmar que `PermissionsGuard` no puede eludirse (falta de header, rol inexistente, Organization suspendida) y auditoría de secretos/env
- [x] T048 [P] Actualizar estado de la Fase 1 (módulo Roles) en `docs/implementation-plan.md`
- [x] T049 Ejecutar la validación manual de `quickstart.md` de punta a punta
- [x] T050 Confirmar que los 82 tests de specs 004-006 siguen pasando sin modificaciones tras la retro-adopción de T023 (research.md #6)

> **Resultado T047 (revisión de seguridad)**: sin hallazgos explotables. Verificado
> específicamente: (1) sin header `X-Organization-Id` o con Organization suspendida,
> `TenantContextGuard` rechaza antes de que `PermissionsGuard` se ejecute; (2) un
> `roleId`/`permission` inexistente o de otra Organization es rechazado por cada
> use case (`RoleNotFoundError`, filtrado por `organizationId` en el repositorio, no
> solo en el use case, siguiendo el patrón de hardening de spec 005); (3) ningún
> endpoint de creación permite inyectar `isDefault`/`organizationId` vía el DTO
> (`ValidationPipe({ whitelist: true })` los descarta); (4) la herencia de Roles solo
> puede apuntar de personalizado → por defecto (nunca al revés ni entre
> personalizados), por lo que un ciclo de herencia es imposible por construcción, no
> solo por convención; (5) sin secretos ni credenciales nuevas introducidas por esta
> spec. `PermissionsGuard` permite la request si `@RequirePermission` no está
> presente (`if (!required) return true`) — intencional, ya que es un gate opt-in que
> se agrega sobre `TenantContextGuard` (deny-by-default real), igual que
> `@SkipTenantContext()`/`@Public()` en specs 004-005; no es una regresión de la
> postura deny-by-default de la plataforma.
>
> **Resultado T049**: cubierto por el E2E de T046
> (`backend/tests/e2e/roles/quickstart.spec.ts`), que ejecuta mecánicamente los 6
> pasos de `quickstart.md` contra la aplicación real (misma convención que specs
> 005-006).
>
> **Resultado T050**: confirmado — ver nota de T023 arriba y la suite completa
> (99 tests, especificado también en `docs/implementation-plan.md`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede arrancar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-6)**: todas dependen de Foundational
  - Pueden avanzar en paralelo (si hay capacidad) o en orden de prioridad P1→P4
- **Polish (Phase 7)**: depende de las historias que se quieran completar

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias — es el MVP de esta spec; incluye
  la retro-adopción de `PermissionsGuard` sobre spec 006 (T023)
- **US2 (P2)**: reutiliza `EffectivePermissionsService` de Foundational;
  independientemente testeable
- **US3 (P3)**: reutiliza `RoleRepository`/`RoleAssignmentRepository` de Foundational
- **US4 (P4)**: reutiliza `permission-catalog.ts` (Setup) y `OrganizationRepository`
  (spec 005) para leer `enabledModules`

### Within Each User Story

- Tests antes que implementación
- Repositories antes que Use Cases
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
Task: "Integration test asignar segundo rol en backend/tests/integration/roles-assign.spec.ts"
Task: "Integration test revocar rol en backend/tests/integration/roles-revoke.spec.ts"
Task: "Integration test permisos directos en backend/tests/integration/roles-direct-permissions.spec.ts"
Task: "Integration test PermissionDenied auditado en backend/tests/integration/roles-permission-denied.spec.ts"
Task: "Integration test anti-escalamiento en backend/tests/integration/roles-privilege-escalation.spec.ts"

# Lanzar los repositories de Foundational juntos:
Task: "RoleRepository en backend/src/modules/roles/infrastructure/role.repository.ts"
Task: "RoleAssignmentRepository en backend/src/modules/roles/infrastructure/role-assignment.repository.ts"
Task: "MembershipPermissionRepository en backend/src/modules/roles/infrastructure/membership-permission.repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **STOP y VALIDAR**: probar User Story 1 de forma independiente (quickstart.md),
   confirmar que los 82 tests de specs 004-006 siguen pasando (T050)
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
- **Regla especial de esta spec**: ningún cambio de esta feature debe requerir
  modificar los tests ya existentes de specs 004-006 (salvo T023, que reemplaza un
  chequeo interno sin cambiar el comportamiento observable — ver research.md #6)
