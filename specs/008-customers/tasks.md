---

description: "Task list for Gestión de Customers (Clientes)"
---

# Tasks: Gestión de Customers (Clientes)

**Input**: Design documents from `specs/008-customers/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/customers-api.md](contracts/customers-api.md),
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

Web app (monorepo ya existente, compartido con specs 004-007): `backend/src/`,
`backend/tests/`, `frontend/src/`, `frontend/tests/` — ver [plan.md](plan.md) § Project
Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear las tablas nuevas (`Customer`, `CustomerHistory`), sus enums, los
valores nuevos de `AuditLogAction`, y el esqueleto del módulo `customers`, sin
modificar ninguna tabla existente (research.md #1)

- [x] T001 Agregar los modelos Prisma `Customer` y `CustomerHistory`, enums `CustomerType`/`CustomerStatus`/`CustomerPriority`, y los 7 valores nuevos de `AuditLogAction` en `backend/prisma/schema.prisma` (ver [data-model.md](data-model.md))
- [x] T002 Generar la migración de Prisma; agregar a mano en el `.sql` generado: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` + índices GIN trigram sobre `name`/`legal_name`/`email`, índice GIN sobre `tags`, índice btree `(organization_id, status)` (research.md #9); aplicar contra `velo-test-db`
- [x] T003 [P] Crear el esqueleto del módulo NestJS `customers` (carpetas `domain/`, `infrastructure/`, `application/`, `api/`) en `backend/src/modules/customers/`
- [x] T004 [P] Registrar `CustomersModule` en `AppModule`, importando `IdentityModule`/`OrganizationsModule`/`RolesModule` según se necesiten (`AuthGuard`, `TenantContextGuard`, `MembershipRepository`, `AuditLogPublisher`, `PermissionsGuard`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida por las 5 historias de esta spec

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [x] T005 [P] Crear `CustomerRepository` (CRUD + `findByTaxId`, `search`, todas las queries filtran por `organizationId` en la query misma — patrón de `OrganizationInvitationRepository`) en `backend/src/modules/customers/infrastructure/customer.repository.ts`
- [x] T006 [P] Crear `CustomerHistoryRepository` (`append`, `findByCustomerId`, `reparent(fromCustomerId, toCustomerId)` para fusiones) en `backend/src/modules/customers/infrastructure/customer-history.repository.ts`
- [x] T007 [P] Definir errores de dominio (`CustomerNotFoundError`, `CustomerDuplicateTaxIdError`, `CustomerMergedError`, `CustomerStaleUpdateError`, `CustomerArchivedError`) en `backend/src/modules/customers/domain/errors.ts`
- [x] T008 Crear `CustomersExceptionsFilter` (mismo patrón que specs 004-007) en `backend/src/modules/customers/api/customers-exceptions.filter.ts`, registrarlo en `main.ts` y `backend/tests/test-app.ts`
- [x] T009 Exportar `CustomerRepository` desde `CustomersModule` (consumido por spec 009-contacts vía FK obligatoria — ver `specs/009-contacts/research.md` #1)

**Checkpoint**: Foundation lista — las historias de usuario pueden empezar

---

## Phase 3: User Story 1 - Alta y edición de Customers (Priority: P1) 🎯 MVP

**Goal**: Un Vendedor o Gerente puede crear y editar Customers con sus datos de
identificación/fiscales/contacto/ubicación, con prevención de duplicados por CUIT/NIF
dentro de la misma Organization.

**Independent Test**: Ver [quickstart.md](quickstart.md) — crear un Customer, editarlo,
intentar duplicar su CUIT en la misma Organization (rechazado) y en otra distinta
(aceptado).

### Tests for User Story 1

- [x] T010 [P] [US1] Integration test: crear un Customer con datos principales lo deja visible en el listado de su Organization (Acceptance Scenario 1) en `backend/tests/integration/customers-create.spec.ts`
- [x] T011 [P] [US1] Integration test: editar un Customer guarda los cambios y conserva el valor anterior en `CustomerHistory` (Acceptance Scenario 2, FR-004/FR-005) en `backend/tests/integration/customers-update.spec.ts`
- [x] T012 [P] [US1] Integration test: crear un Customer con un `taxId` ya registrado en la misma Organization se rechaza (Acceptance Scenario 3, RN-003) en `backend/tests/integration/customers-duplicate-taxid.spec.ts`
- [x] T013 [P] [US1] Integration test: el mismo `taxId` en dos Organizations distintas se permite (Acceptance Scenario 4, RN-002) en `backend/tests/integration/customers-taxid-cross-org.spec.ts`
- [x] T014 [P] [US1] Integration test: crear un Customer sin `name` se rechaza indicando el campo faltante (Acceptance Scenario 5, FR-002) en `backend/tests/integration/customers-validation.spec.ts`
- [x] T015 [P] [US1] Integration test: editar con un `version` desactualizado se rechaza con 409 sin corromper el registro (Edge Case, research.md #8) en `backend/tests/integration/customers-stale-update.spec.ts`

### Implementation for User Story 1

- [x] T016 [US1] Implementar `CreateCustomerUseCase` (valida campos obligatorios, unicidad de `taxId` vía `findByTaxId`, publica `CustomerCreated`) en `backend/src/modules/customers/application/create-customer.use-case.ts` (depende de T005)
- [x] T017 [US1] Implementar `UpdateCustomerUseCase` (chequeo de `version`, escribe diff en `CustomerHistory`, publica `CustomerUpdated`) en `backend/src/modules/customers/application/update-customer.use-case.ts` (depende de T005, T006)
- [x] T018 [US1] Implementar `GetCustomerUseCase` (lanza `CustomerMergedError(survivorId)` si `mergedIntoCustomerId` no es null) en `backend/src/modules/customers/application/get-customer.use-case.ts` (depende de T005)
- [x] T019 [US1] Crear `CustomersController` con `POST/GET/PATCH /organizations/:id/customers[/:customerId]`, `TenantContextGuard` a nivel de clase + `@RequirePermission('customer.create'|'customer.read'|'customer.update')` por método en `backend/src/modules/customers/api/customers.controller.ts` (depende de T016-T018)
- [x] T020 [P] [US1] Crear servicio de API del frontend en `frontend/src/services/customers-api.ts`
- [x] T021 [P] [US1] Construir formulario de alta/edición en `frontend/src/features/customers/CustomerForm.tsx`

**Checkpoint**: User Story 1 funciona de forma independiente — este es el MVP de esta
spec

---

## Phase 4: User Story 2 - Búsqueda y filtros de Customers (Priority: P2)

**Goal**: Un usuario comercial puede buscar y filtrar Customers por nombre, CUIT,
email, teléfono, ciudad, etiqueta o responsable, en menos de 300ms.

**Independent Test**: Con varios Customers cargados, buscar por distintos atributos y
verificar resultados correctos y rápidos.

### Tests for User Story 2

- [x] T022 [P] [US2] Integration test: búsqueda por nombre/razón social/CUIT/email/teléfono/etiqueta devuelve coincidencias en <300ms (Acceptance Scenario 1, SC-001) en `backend/tests/integration/customers-search.spec.ts`
- [x] T023 [P] [US2] Integration test: filtrar por estado/responsable/ciudad/provincia/país/fecha/categoría reduce el listado correctamente (Acceptance Scenario 2) en `backend/tests/integration/customers-filter.spec.ts`
- [x] T024 [P] [US2] Integration test: filtrar por una etiqueta de un Customer con múltiples etiquetas lo incluye en resultados (Acceptance Scenario 3) en `backend/tests/integration/customers-filter-tags.spec.ts`

### Implementation for User Story 2

- [x] T025 [US2] Implementar `SearchCustomersUseCase` (query params → `CustomerRepository.search`, usa índices `pg_trgm`/GIN de T002) en `backend/src/modules/customers/application/search-customers.use-case.ts` (depende de T005)
- [x] T026 [US2] Agregar `GET /organizations/:id/customers` a `CustomersController` (depende de T025)
- [x] T027 [P] [US2] Construir listado con búsqueda/filtros en `frontend/src/features/customers/CustomersList.tsx`

**Checkpoint**: User Stories 1-2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Baja lógica, archivado y restauración (Priority: P3)

**Goal**: Un Administrador puede archivar y restaurar Customers sin perder historial
ni datos; un Customer archivado bloquea nuevas Opportunities salvo autorización
explícita.

**Independent Test**: Archivar un Customer, verificar que el bloqueo de nuevas
Opportunities está disponible como guard reutilizable, y restaurarlo.

### Tests for User Story 3

- [x] T028 [P] [US3] Integration test: archivar un Customer lo pasa a `archived` sin perder ningún dato ni historial (Acceptance Scenario 1, RN-004/FR-011) en `backend/tests/integration/customers-archive.spec.ts`
- [x] T029 [P] [US3] Integration test: `CustomerArchivedGuardService.assertActive(customerId)` lanza `CustomerArchivedError` para un Customer archivado y no hace nada para uno activo — forward declaration de FR-011 para que spec 011 (Opportunities) lo consuma, ver data-model.md (Acceptance Scenario 2) en `backend/tests/integration/customers-archived-guard.spec.ts`
- [x] T030 [P] [US3] Integration test: restaurar un Customer archivado lo vuelve a `active` con todos sus datos intactos (Acceptance Scenario 3) en `backend/tests/integration/customers-restore.spec.ts`
- [x] T031 [P] [US3] Integration test: no existe ninguna ruta de eliminación física de un Customer (`DELETE /organizations/:id/customers/:customerId` responde 404) (Acceptance Scenario 4, RN-004) en `backend/tests/integration/customers-no-hard-delete.spec.ts`

### Implementation for User Story 3

- [x] T032 [US3] Implementar `ArchiveCustomerUseCase` (`status → archived`, publica `CustomerArchived`) en `backend/src/modules/customers/application/archive-customer.use-case.ts` (depende de T005)
- [x] T033 [US3] Implementar `RestoreCustomerUseCase` (`status → active`, publica `CustomerRestored`) en `backend/src/modules/customers/application/restore-customer.use-case.ts` (depende de T005)
- [x] T034 [US3] Implementar `CustomerArchivedGuardService` (`assertActive(customerId)`, exportado desde `CustomersModule` para consumo futuro de spec 011) en `backend/src/modules/customers/application/customer-archived-guard.service.ts` (depende de T005, T007)
- [x] T035 [US3] Agregar `POST /organizations/:id/customers/:customerId/archive` y `/restore` a `CustomersController` (depende de T032, T033)
- [x] T036 [P] [US3] Agregar acciones de archivar/restaurar en `frontend/src/features/customers/CustomerDetail.tsx`

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

---

## Phase 6: User Story 4 - Línea de tiempo unificada de un Customer (Priority: P4)

**Goal**: Un usuario comercial puede ver todos los eventos de un Customer en orden
cronológico.

**Independent Test**: Con un Customer con modificaciones y sin eventos de otros
módulos (todavía no implementados), consultar su línea de tiempo.

### Tests for User Story 4

- [x] T037 [P] [US4] Integration test: la línea de tiempo muestra creación + ediciones + archivado/restauración en orden cronológico (Acceptance Scenario 1) en `backend/tests/integration/customers-timeline.spec.ts`
- [x] T038 [P] [US4] Integration test: un Customer sin eventos más allá de su creación muestra únicamente ese evento, sin errores (Acceptance Scenario 2) en `backend/tests/integration/customers-timeline-empty.spec.ts`

### Implementation for User Story 4

- [x] T039 [US4] Implementar `GetCustomerTimelineUseCase` (combina `CustomerHistory` + `AuditLog` filtrado por `customerId`, ordenado por fecha — research.md #5) en `backend/src/modules/customers/application/get-customer-timeline.use-case.ts` (depende de T005, T006)
- [x] T040 [US4] Agregar `GET /organizations/:id/customers/:customerId/timeline` a `CustomersController` (depende de T039)
- [x] T041 [P] [US4] Construir `frontend/src/features/customers/CustomerTimeline.tsx`

**Checkpoint**: User Stories 1-4 funcionan de forma independiente

---

## Phase 7: User Story 5 - Fusionar duplicados, exportar e importar (Priority: P5)

**Goal**: Un Administrador puede fusionar Customers duplicados y exportar/importar
Customers en lote.

**Independent Test**: Crear dos Customers duplicados, fusionarlos, verificar historial
combinado; exportar un lote e importarlo en otra Organization de prueba.

### Tests for User Story 5

- [x] T042 [P] [US5] Integration test: fusionar dos Customers conserva un único Customer con historial combinado; el descartado responde 409 `CustomerMergedError` (Acceptance Scenario 1, research.md #6) en `backend/tests/integration/customers-merge.spec.ts`
- [x] T043 [P] [US5] Integration test: exportar devuelve un CSV con los Customers de la Organization (Acceptance Scenario 2) en `backend/tests/integration/customers-export.spec.ts`
- [x] T044 [P] [US5] Integration test: importar un CSV crea Customers respetando validación/unicidad de la creación manual; una fila con `taxId` duplicado se rechaza sin interrumpir el resto del batch (Acceptance Scenario 3, Edge Case, FR-014) en `backend/tests/integration/customers-import.spec.ts`

### Implementation for User Story 5

- [x] T045 [US5] Implementar `MergeCustomersUseCase` (re-parenta `CustomerHistory` del descartado, setea `mergedIntoCustomerId`, agrega entrada sintética, publica `CustomerMerged`) en `backend/src/modules/customers/application/merge-customers.use-case.ts` (depende de T005, T006)
- [x] T046 [US5] Implementar `ExportCustomersUseCase` (CSV, filtros de US2 aplicables) en `backend/src/modules/customers/application/export-customers.use-case.ts` (depende de T005)
- [x] T047 [US5] Implementar `ImportCustomersUseCase` (procesa CSV fila por fila reutilizando `CreateCustomerUseCase`, acumula `{ created, rejected: [{ row, reason }] }` sin abortar el batch) en `backend/src/modules/customers/application/import-customers.use-case.ts` (depende de T016)
- [x] T048 [US5] Agregar `POST /organizations/:id/customers/merge`, `GET /organizations/:id/customers/export`, `POST /organizations/:id/customers/import` a `CustomersController` (depende de T045-T047)
- [x] T049 [P] [US5] Construir `frontend/src/features/customers/MergeCustomers.tsx` + acciones de exportar/importar en `CustomersList.tsx`

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [x] T050 [P] E2E test del flujo completo de quickstart.md en `backend/tests/e2e/customers/quickstart.spec.ts`
- [x] T051 Revisión de hardening de seguridad: confirmar aislamiento por `organizationId` en cada query del repositorio, ausencia de ruta de eliminación física, y comportamiento correcto de `taxId` único bajo creaciones concurrentes
- [x] T052 [P] Actualizar estado de la Fase 2 (módulo Customers) en `docs/implementation-plan.md`
- [x] T053 Ejecutar la validación manual de `quickstart.md` de punta a punta
- [x] T054 Confirmar que los 98 tests de specs 004-007 siguen pasando sin modificaciones

> **Resultado T051 (revisión de seguridad)**: sin hallazgos explotables. Verificado
> específicamente: (1) `CustomerRepository.findById`/`findByTaxId`/`update` filtran por
> `organizationId` en la query misma (`findFirst`/`updateMany`), no solo en el use
> case — un `customerId` de otra Organization siempre resuelve a "not found"; (2) los
> dos únicos `findUniqueOrThrow` por id bare (`updateWithVersionCheck`, `update`) solo
> se alcanzan **después** de un `updateMany` scoped por `organizationId` con `count >
> 0`, mismo patrón que `OrganizationInvitationRepository.reissue` (spec 005); (3)
> `CustomerHistoryRepository.findByCustomerId` no filtra por `organizationId` pero solo
> se invoca con un `customerId` ya validado contra la Organization por el caller
> (`GetCustomerTimelineUseCase`), igual que `RoleAssignmentRepository`; (4) no existe
> ninguna ruta `DELETE` para `Customer` — verificado por test
> (`customers-no-hard-delete.spec.ts`); (5) `ValidationPipe({ whitelist: true })`
> descarta cualquier intento de inyectar `organizationId`/`mergedIntoCustomerId`/
> `version`/`status` vía `CreateCustomerDto` (esos campos no están declarados en el
> DTO); (6) unicidad de `taxId` bajo concurrencia la garantiza el índice único
> `@@unique([organizationId, taxId])` de Postgres, no solo el chequeo
> `findByTaxId`-antes-de-crear en `CreateCustomerUseCase` (si dos requests concurrentes
> pasan el chequeo a la vez, el segundo `INSERT` falla en la base); (7) sin secretos ni
> credenciales nuevas introducidas por esta spec.
>
> **Resultado T053**: cubierto por el E2E de T050
> (`backend/tests/e2e/customers/quickstart.spec.ts`), que ejecuta mecánicamente los 7
> pasos de `quickstart.md` contra la aplicación real (misma convención que specs
> 005-007).
>
> **Resultado T054**: confirmado — 117 tests totales pasando (98 preexistentes de
> specs 004-007 + 19 nuevos de esta spec), sin ninguna modificación a los tests
> existentes.

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
- **US2 (P2)**: reutiliza `CustomerRepository`/índices de Foundational; independiente
- **US3 (P3)**: reutiliza `CustomerRepository`; `CustomerArchivedGuardService` es
  forward declaration para spec 011, sin consumidor real todavía
- **US4 (P4)**: reutiliza `CustomerHistoryRepository` + `AuditLogPublisher`
- **US5 (P5)**: reutiliza `CreateCustomerUseCase` (US1) para importación —
  única dependencia cruzada entre historias de esta spec, documentada en research.md #7

### Within Each User Story

- Tests antes que implementación
- Repositories antes que Use Cases
- Use Cases antes que Controller
- Backend antes que integración de frontend

### Parallel Opportunities

- Todas las tareas [P] de Setup y Foundational en paralelo entre sí
- Una vez completado Foundational, US1-US5 pueden trabajarse en paralelo por distintos
  desarrolladores (salvo que US5 espere a `CreateCustomerUseCase` de US1)
- Dentro de cada historia, los tests marcados [P] en paralelo entre sí

---

## Parallel Example: User Story 1

```bash
# Lanzar todos los tests de la User Story 1 juntos:
Task: "Integration test crear Customer en backend/tests/integration/customers-create.spec.ts"
Task: "Integration test editar Customer en backend/tests/integration/customers-update.spec.ts"
Task: "Integration test CUIT duplicado en backend/tests/integration/customers-duplicate-taxid.spec.ts"
Task: "Integration test CUIT cross-org en backend/tests/integration/customers-taxid-cross-org.spec.ts"
Task: "Integration test validación de campos en backend/tests/integration/customers-validation.spec.ts"
Task: "Integration test stale update en backend/tests/integration/customers-stale-update.spec.ts"

# Lanzar los repositories de Foundational juntos:
Task: "CustomerRepository en backend/src/modules/customers/infrastructure/customer.repository.ts"
Task: "CustomerHistoryRepository en backend/src/modules/customers/infrastructure/customer-history.repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **STOP y VALIDAR**: probar User Story 1 de forma independiente (quickstart.md),
   confirmar que los 98 tests de specs 004-007 siguen pasando (T054)
5. Deploy/demo si está listo

### Incremental Delivery

1. Completar Setup + Foundational → Fundación lista
2. Agregar User Story 1 → Probar independientemente → Deploy/Demo (MVP!)
3. Agregar User Story 2 → Probar independientemente → Deploy/Demo
4. Agregar User Story 3 → Probar independientemente → Deploy/Demo
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
- Evitar: tareas vagas, conflictos de archivo compartido, dependencias entre historias
  que rompan su independencia
- **Regla especial de esta spec**: `CustomerArchivedGuardService` (T034) no tiene
  consumidor real todavía — spec 011 (Opportunities) lo consumirá al implementarse; no
  bloquear esta spec esperando esa integración (mismo patrón que spec 007 declaró
  permisos de CRM por adelantado)
