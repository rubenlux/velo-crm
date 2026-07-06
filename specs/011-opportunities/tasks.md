---

description: "Task list for Gestión de Oportunidades de Venta (Pipeline Comercial)"
---

# Tasks: Gestión de Oportunidades de Venta (Pipeline Comercial)

**Input**: Design documents from `specs/011-opportunities/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md),
[contracts/opportunities-api.md](contracts/opportunities-api.md),
[quickstart.md](quickstart.md). Depende de **spec 008 (Customers)**, **spec 009
(Contacts)** y **spec 010 (Leads)** ya implementadas — esta spec además **reforma**
la tabla `Opportunity` que spec 010 creó mínima (research.md #1, #4) y migra
`LeadsModule` para que deje de usar su `OpportunityStubRepository` temporal.

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

Web app (monorepo ya existente, compartido con specs 004-010): `backend/src/`,
`backend/tests/`, `frontend/src/`, `frontend/tests/` — ver [plan.md](plan.md) § Project
Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Reformar `Opportunity` (spec 010) y crear `Pipeline`/`PipelineStage`/
`OpportunityHistory`, sus enums/relaciones, los valores nuevos de `AuditLogAction`, las
2 permission keys nuevas, y el esqueleto del módulo `opportunities`

- [X] T001 Agregar los modelos Prisma `Pipeline` y `PipelineStage`; reformar
  `Opportunity` (spec 010): eliminar la columna `stage` (enum) y el enum
  `PipelineStage` de spec 010, agregar `pipelineId`/`stageId` (FK),
  `probability`/`estimatedCloseDate`/`priority`/`competitor`/`notes`/`tags`/
  `stageBeforeLost`/`stateBeforeArchive`/`version`; agregar el modelo
  `OpportunityHistory`; agregar los 10 valores nuevos de `AuditLogAction` en
  `backend/prisma/schema.prisma` (ver [data-model.md](data-model.md))
- [X] T002 Generar la migración de Prisma; agregar a mano en el `.sql` generado el
  índice GIN trigram sobre `Opportunity.name` (research.md #14); revisar que no
  proponga `DROP INDEX` sobre índices de specs 008-010 (mismo gotcha ya conocido,
  CLAUDE.md); aplicar contra `velo-test-db` con `prisma migrate deploy`
- [X] T003 [P] Crear el esqueleto del módulo NestJS `opportunities` (carpetas
  `domain/`, `infrastructure/`, `application/`, `api/`) en
  `backend/src/modules/opportunities/`
- [X] T004 [P] Registrar `OpportunitiesModule` en `AppModule`, importando
  `IdentityModule`/`OrganizationsModule`/`RolesModule`/`CustomersModule`/
  `ContactsModule`
- [X] T005 [P] Agregar las permission keys `opportunity.edit_won` y
  `opportunity.manage_pipeline` al catálogo estático
  (`backend/src/modules/roles/infrastructure/permission-catalog.ts`) y actualizar
  `DEFAULT_ROLE_PERMISSIONS`: `Administrador` recibe ambas (ya recibe todo el
  catálogo salvo `organization.manage`), `Gerente` recibe solo `opportunity.edit_won`
  (research.md #6)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida por las 5 historias de esta spec, y la
migración de `LeadsModule` que depende de que este módulo ya exista

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [X] T006 [P] Crear `PipelineRepository` (`create`, `findById`,
  `findByOrganizationId`, y `findOrCreateDefault` — crea el Pipeline "Por defecto" +
  sus 8 `PipelineStage` seed de forma idempotente, research.md #3) en
  `backend/src/modules/opportunities/infrastructure/pipeline.repository.ts`
- [X] T007 [P] Crear `PipelineStageRepository` (`create`, `findById`, `update`,
  `findByPipelineId`, `delete` — rechaza si hay Oportunidades `Abierta` asignadas,
  research.md #11) en
  `backend/src/modules/opportunities/infrastructure/pipeline-stage.repository.ts`
- [X] T008 [P] Crear `OpportunityRepository` (`create`, `findById`,
  `updateWithVersionCheck`, `update`, `search`, `moveStage` — actualiza `stageId` y
  sincroniza `state` si la etapa destino tiene `isWonStage`/`isLostStage`,
  research.md #2; todas las queries filtran por `organizationId`) en
  `backend/src/modules/opportunities/infrastructure/opportunity.repository.ts`
- [X] T009 [P] Crear `OpportunityHistoryRepository` (`append`, `findByOpportunityId`)
  en
  `backend/src/modules/opportunities/infrastructure/opportunity-history.repository.ts`
- [X] T010 [P] Definir errores de dominio (`OpportunityNotFoundError`,
  `OpportunityStaleUpdateError`, `OpportunityNotWonError` — reabrir algo que no está
  Perdido, `OpportunityNotLostError`, `OpportunityNotArchivedError`,
  `OpportunityArchivedError` — mover de etapa sin restaurar antes,
  `RequiresEditWonPermissionError`, `StageNotFoundError`,
  `StageHasOpenOpportunitiesError`) en
  `backend/src/modules/opportunities/domain/errors.ts`
- [X] T011 Crear `OpportunitiesExceptionsFilter` (mismo patrón que specs 004-010) en
  `backend/src/modules/opportunities/api/opportunities-exceptions.filter.ts`,
  registrarlo en `main.ts` y `backend/tests/test-app.ts`
- [X] T012 Actualizar `resetDatabase()` en `backend/tests/test-app.ts`: agregar
  `opportunityHistory.deleteMany()` antes de `opportunity.deleteMany()` (ya existente
  desde spec 010), y `pipelineStage.deleteMany()` + `pipeline.deleteMany()` después de
  `opportunity.deleteMany()` (Opportunity referencia Pipeline/PipelineStage)
- [X] T013 **Migrar `LeadsModule`** (cumple `specs/010-leads/research.md` #10):
  eliminar `backend/src/modules/leads/infrastructure/opportunity-stub.repository.ts`;
  `LeadsModule` importa `OpportunitiesModule`; `ConvertLeadUseCase` reemplaza la
  creación directa por `PipelineRepository.findOrCreateDefault` + resolver la etapa
  "Nueva" + `OpportunityRepository.create` real; la respuesta de conversión incluye
  `stage`/`pipeline` expandidos (research.md #5)
- [X] T014 Actualizar las 2 aserciones de spec 010 afectadas por el cambio de `stage`
  (string) a `stageId` (UUID): `backend/tests/integration/leads-convert.spec.ts` y
  `backend/tests/e2e/leads/quickstart.spec.ts` — verificar `opportunity.stage.name`
  contra la relación expandida en vez del string literal `'Nueva'`
- [X] T015 Correr la suite completa de specs 004-010 y confirmar que sigue pasando
  (solo con los cambios de T013/T014 — ningún otro test debería requerir ajustes)

**Checkpoint**: Foundation lista, migración de spec 010 completa — las historias de
usuario pueden empezar

---

## Phase 3: User Story 1 - Creación y gestión del pipeline (Priority: P1) 🎯 MVP

**Goal**: Un Vendedor o Gerente puede crear Oportunidades asociadas a un Customer y
moverlas entre las etapas de su pipeline; un Administrador puede configurar sus
propias etapas.

**Independent Test**: Ver [quickstart.md](quickstart.md) pasos 1-4 — pipeline por
defecto perezoso, alta de Oportunidad, mover de etapa, reconfigurar etapas.

### Tests for User Story 1

- [X] T016 [P] [US1] Integration test: el primer `GET /pipelines` de una Organization
  crea perezosamente el Pipeline "Por defecto" con sus 8 etapas
  (Acceptance Scenario 4 implícito, research.md #3) en
  `backend/tests/integration/opportunities-default-pipeline.spec.ts`
- [X] T017 [P] [US1] Integration test: crear una Oportunidad manual la deja en la
  etapa "Nueva" del Pipeline por defecto, `state = Abierta`
  (Acceptance Scenario 1) en `backend/tests/integration/opportunities-create.spec.ts`
- [X] T018 [P] [US1] Integration test: mover una Oportunidad a otra etapa registra
  quién y cuándo (Acceptance Scenario 3) en
  `backend/tests/integration/opportunities-move-stage.spec.ts`
- [X] T019 [P] [US1] Integration test: un Administrador configura sus propias etapas
  y las Oportunidades nuevas las usan; un `Ventas` sin `opportunity.manage_pipeline`
  recibe 403 (Acceptance Scenario 4) en
  `backend/tests/integration/opportunities-pipeline-config.spec.ts`
- [X] T020 [P] [US1] Integration test: reasignar el responsable de una Oportunidad
  queda registrado (Acceptance Scenario 5) en
  `backend/tests/integration/opportunities-reassign-owner.spec.ts`
- [X] T021 [P] [US1] Integration test: eliminar una `PipelineStage` con Oportunidades
  `Abierta` asignadas se rechaza (edge case, research.md #11) en
  `backend/tests/integration/opportunities-delete-stage-in-use.spec.ts`

### Implementation for User Story 1

- [X] T022 [US1] Implementar `ListPipelinesUseCase` (llama a
  `findOrCreateDefault` antes de listar) en
  `backend/src/modules/opportunities/application/list-pipelines.use-case.ts`
  (depende de T006)
- [X] T023 [US1] Implementar `CreatePipelineUseCase`, `CreatePipelineStageUseCase`,
  `UpdatePipelineStageUseCase`, `DeletePipelineStageUseCase` en
  `backend/src/modules/opportunities/application/create-pipeline.use-case.ts`,
  `create-pipeline-stage.use-case.ts`, `update-pipeline-stage.use-case.ts`,
  `delete-pipeline-stage.use-case.ts` (depende de T006, T007)
- [X] T024 [US1] Implementar `CreateOpportunityUseCase` (resuelve Pipeline/etapa por
  defecto si no se indican, publica `OpportunityCreated`) en
  `backend/src/modules/opportunities/application/create-opportunity.use-case.ts`
  (depende de T006, T008)
- [X] T025 [US1] Implementar `UpdateOpportunityUseCase` (nombre, responsable —
  publica `OpportunityOwnerChanged` si cambia `ownerUserId`, `OpportunityUpdated`
  para el resto; exige `opportunity.edit_won` en vez de `opportunity.update` si
  `state = Ganada`) en
  `backend/src/modules/opportunities/application/update-opportunity.use-case.ts`
  (depende de T008, T009)
- [X] T026 [US1] Implementar `GetOpportunityUseCase` (incluye `stage`/`pipeline`
  expandidos) en
  `backend/src/modules/opportunities/application/get-opportunity.use-case.ts`
  (depende de T008)
- [X] T027 [US1] Implementar `MoveOpportunityStageUseCase` (valida que la etapa
  destino pertenezca al mismo Pipeline, rechaza si la Oportunidad está `Archivada`
  sin restaurar antes, publica `OpportunityStageChanged`) en
  `backend/src/modules/opportunities/application/move-opportunity-stage.use-case.ts`
  (depende de T006, T007, T008)
- [X] T028 [US1] Crear `PipelinesController` (`GET/POST /organizations/:id/pipelines`,
  `POST/PATCH/DELETE .../pipelines/:pipelineId/stages/:stageId`,
  `@RequirePermission('opportunity.manage_pipeline')` en las de escritura) en
  `backend/src/modules/opportunities/api/pipelines.controller.ts` (depende de
  T022-T023)
- [X] T029 [US1] Crear `OpportunitiesController` con
  `POST /organizations/:id/opportunities`,
  `GET/PATCH /organizations/:id/opportunities/:opportunityId`,
  `POST .../move-stage`, `TenantContextGuard` a nivel de clase +
  `@RequirePermission('opportunity.*')` por método en
  `backend/src/modules/opportunities/api/opportunities.controller.ts` (depende de
  T024-T027)
- [X] T030 [P] [US1] Crear servicio de API del frontend en
  `frontend/src/services/opportunities-api.ts`
- [X] T031 [P] [US1] Construir `frontend/src/features/opportunities/PipelineBoard.tsx`,
  `OpportunityForm.tsx` y `PipelineSettings.tsx`; actualizar `nav-config.ts` para que
  `crm`/`oportunidades` apunten aquí en vez del mock `Pipeline.tsx`. El mock
  (`frontend/src/features/pipeline/`) se eliminó; las rutas reales viven bajo
  `/organizations/:id/pipeline` en `main.tsx`.

**Checkpoint**: User Story 1 funciona de forma independiente — este es el MVP de esta
spec

---

## Phase 4: User Story 2 - Valor estimado, probabilidad y valor ponderado (Priority: P2)

**Goal**: Un Gerente Comercial puede ver el valor estimado, la probabilidad de cierre
y el valor ponderado de cada Oportunidad.

**Independent Test**: Ver [quickstart.md](quickstart.md) paso 5 — definir valor y
probabilidad, verificar el valor ponderado calculado.

### Tests for User Story 2

- [X] T032 [P] [US2] Integration test: definir `estimatedValue`/`probability`
  calcula `weightedValue` automáticamente (Acceptance Scenario 1) en
  `backend/tests/integration/opportunities-weighted-value.spec.ts`
- [X] T033 [P] [US2] Integration test: actualizar `estimatedValue`/`probability`
  recalcula `weightedValue` y publica `OpportunityValueChanged`
  (Acceptance Scenario 2) en
  `backend/tests/integration/opportunities-value-change.spec.ts`
- [X] T034 [P] [US2] Integration test: la búsqueda devuelve la suma de valor total y
  valor ponderado de varias Oportunidades abiertas (Acceptance Scenario 3) en
  `backend/tests/integration/opportunities-pipeline-totals.spec.ts`

### Implementation for User Story 2

- [X] T035 [US2] Extender `UpdateOpportunityUseCase` (T025) para aceptar
  `estimatedValue`/`probability`/`estimatedCloseDate`/`priority`/`competitor`/
  `notes`/`tags`, publicando `OpportunityValueChanged` cuando cambian valor o
  probabilidad, en
  `backend/src/modules/opportunities/application/update-opportunity.use-case.ts`
- [X] T036 [US2] Extender `GetOpportunityUseCase` (T026) y `SearchOpportunitiesUseCase`
  (T056, US5) para incluir `weightedValue` calculado y, en la búsqueda, los totales
  del conjunto (research.md #7) en
  `backend/src/modules/opportunities/application/get-opportunity.use-case.ts`
- [X] T037 [P] [US2] Mostrar valor estimado, probabilidad y valor ponderado en
  `frontend/src/features/opportunities/OpportunityForm.tsx` y `PipelineBoard.tsx`

**Checkpoint**: User Stories 1-2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Cierre, reapertura y archivado de Oportunidades (Priority: P3)

**Goal**: Un Vendedor puede marcar una Oportunidad como ganada o perdida, reabrirla si
corresponde, y archivarla/restaurarla.

**Independent Test**: Ver [quickstart.md](quickstart.md) pasos 6-9 — perder, reabrir,
ganar, archivar/restaurar.

### Tests for User Story 3

- [X] T038 [P] [US3] Integration test: marcar `Ganada` mueve a la etapa `isWonStage`
  del Pipeline y bloquea ediciones posteriores sin `opportunity.edit_won`
  (Acceptance Scenario 1, RN-005) en
  `backend/tests/integration/opportunities-win.spec.ts`
- [X] T039 [P] [US3] Integration test: marcar `Perdida` conserva todo el historial
  (Acceptance Scenario 2) en `backend/tests/integration/opportunities-lose.spec.ts`
- [X] T040 [P] [US3] Integration test: reabrir una `Perdida` restaura exactamente la
  etapa previa a la pérdida (`stageBeforeLost`, research.md #15)
  (Acceptance Scenario 3) en
  `backend/tests/integration/opportunities-reopen.spec.ts`
- [X] T041 [P] [US3] Integration test: una Oportunidad `Archivada` rechaza
  `move-stage` hasta que se restaura explícitamente (Acceptance Scenario 4, RN-008)
  en `backend/tests/integration/opportunities-archive-restore.spec.ts`

### Implementation for User Story 3

- [X] T042 [US3] Implementar `WinOpportunityUseCase` (mueve a la etapa `isWonStage`
  del Pipeline propio, `state → Ganada`, publica `OpportunityWon`) en
  `backend/src/modules/opportunities/application/win-opportunity.use-case.ts`
  (depende de T006, T007, T008)
- [X] T043 [US3] Implementar `LoseOpportunityUseCase` (guarda `stageBeforeLost`,
  mueve a la etapa `isLostStage`, `state → Perdida`, publica `OpportunityLost`) en
  `backend/src/modules/opportunities/application/lose-opportunity.use-case.ts`
  (depende de T006, T007, T008)
- [X] T044 [US3] Implementar `ReopenOpportunityUseCase` (solo si `state = Perdida`;
  restaura `stageId = stageBeforeLost`, `state → Abierta`, publica
  `OpportunityReopened`) en
  `backend/src/modules/opportunities/application/reopen-opportunity.use-case.ts`
  (depende de T008)
- [X] T045 [US3] Implementar `ArchiveOpportunityUseCase` (guarda
  `stateBeforeArchive`, `state → Archivada`, no toca `stageId`) y
  `RestoreOpportunityUseCase` (restaura `state`, limpia el campo) en
  `backend/src/modules/opportunities/application/archive-opportunity.use-case.ts` y
  `restore-opportunity.use-case.ts` (depende de T008)
- [X] T046 [US3] Agregar
  `POST /organizations/:id/opportunities/:opportunityId/win|lose|reopen|archive|restore`
  a `OpportunitiesController` (depende de T042-T045)
- [X] T047 [P] [US3] Agregar las acciones ganar/perder/reabrir/archivar/restaurar en
  `frontend/src/features/opportunities/OpportunityDetail.tsx`

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

---

## Phase 6: User Story 4 - KPIs comerciales y Forecast (Priority: P4)

**Goal**: Un Gerente Comercial o Administrador puede ver indicadores del pipeline y
una proyección de ventas.

**Independent Test**: Con varias Oportunidades en distintos estados y etapas,
consultar KPIs y forecast y verificar que los números coinciden con los datos reales.

### Tests for User Story 4

- [X] T048 [P] [US4] Integration test: los KPIs muestran valor total, valor
  ponderado, abiertas/ganadas/perdidas, tasa de conversión, ticket promedio, tiempo
  promedio de cierre y rendimiento por vendedor/etapa (Acceptance Scenario 1) en
  `backend/tests/integration/opportunities-kpis.spec.ts`
- [X] T049 [P] [US4] Integration test: el forecast muestra ventas estimadas por
  mes/trimestre/año y proyección por vendedor, excluyendo Oportunidades sin
  `estimatedCloseDate` (Acceptance Scenario 2, edge case) en
  `backend/tests/integration/opportunities-forecast.spec.ts`
- [X] T050 [P] [US4] Integration test: un cambio reciente en el pipeline se refleja
  en la siguiente consulta de KPIs/forecast (Acceptance Scenario 3, SC-005) en
  `backend/tests/integration/opportunities-kpis-live.spec.ts`

### Implementation for User Story 4

- [X] T051 [US4] Implementar `GetOpportunityKpisUseCase` (agregación Prisma en vivo,
  research.md #13) en
  `backend/src/modules/opportunities/application/get-opportunity-kpis.use-case.ts`
  (depende de T008)
- [X] T052 [US4] Implementar `GetOpportunityForecastUseCase` en
  `backend/src/modules/opportunities/application/get-opportunity-forecast.use-case.ts`
  (depende de T008)
- [X] T053 [US4] Agregar `GET /organizations/:id/opportunities/kpis` y
  `.../opportunities/forecast` a `OpportunitiesController`, **registradas antes** de
  la ruta dinámica `:opportunityId` (nota de implementación en
  contracts/opportunities-api.md) (depende de T051, T052)
- [X] T054 [P] [US4] Construir `frontend/src/features/opportunities/OpportunityKpis.tsx`

**Checkpoint**: User Stories 1-4 funcionan de forma independiente

---

## Phase 7: User Story 5 - Búsqueda global y línea de tiempo (Priority: P5)

**Goal**: Un usuario comercial puede buscar Oportunidades por distintos atributos y
ver su línea de tiempo completa.

**Independent Test**: Con varias Oportunidades cargadas, buscar por distintos
atributos y consultar la línea de tiempo de una de ellas.

### Tests for User Story 5

- [X] T055 [P] [US5] Integration test: búsqueda por nombre/Customer/Contact/
  responsable/etapa/estado/valor/prioridad/fecha estimada/etiquetas devuelve
  coincidencias en <300ms (Acceptance Scenario 1, SC-002) en
  `backend/tests/integration/opportunities-search.spec.ts`
- [X] T056 [P] [US5] Integration test: la línea de tiempo combina
  `OpportunityHistory` + `AuditLog` en orden cronológico
  (Acceptance Scenario 2) en
  `backend/tests/integration/opportunities-timeline.spec.ts`

### Implementation for User Story 5

- [X] T057 [US5] Implementar `SearchOpportunitiesUseCase` (query params →
  `OpportunityRepository.search`, índice `pg_trgm` sobre `name` — research.md #14)
  en
  `backend/src/modules/opportunities/application/search-opportunities.use-case.ts`
  (depende de T008)
- [X] T058 [US5] Implementar `GetOpportunityTimelineUseCase` (combina
  `OpportunityHistory` + `AuditLog` filtrado por `opportunityId` — research.md #10)
  en
  `backend/src/modules/opportunities/application/get-opportunity-timeline.use-case.ts`
  (depende de T008, T009)
- [X] T059 [US5] Agregar `GET /organizations/:id/opportunities` y
  `GET .../opportunities/:opportunityId/timeline` a `OpportunitiesController`
  (depende de T057, T058)
- [X] T060 [P] [US5] Construir `frontend/src/features/opportunities/OpportunityTimeline.tsx`

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [X] T061 [P] E2E test del flujo completo de quickstart.md en
  `backend/tests/e2e/opportunities/quickstart.spec.ts`
- [X] T062 Revisión de hardening de seguridad: aislamiento por `organizationId` en
  todos los repositorios nuevos, `opportunity.edit_won`/`opportunity.manage_pipeline`
  aplicados correctamente (no solo `opportunity.update`), sin ninguna ruta `DELETE`
  física sobre `Opportunity`, y que `moveStage`/`win`/`lose` validen que la etapa
  destino pertenece al mismo `pipelineId` de la Oportunidad (no a un Pipeline de otra
  Organization o de otro Pipeline de la misma Organization). **Encontrado y
  corregido**: `win`/`lose` no rechazaban una Oportunidad `Archivada` (paridad con
  `move-stage`), y `archive → update → restore` evadía `opportunity.edit_won`
  porque `update-opportunity.use-case.ts` solo miraba `state === 'Ganada'` literal;
  `lose` tampoco exigía `edit_won` al mover una `Ganada` directo a `Perdida`. Los
  tres casos de uso (`win-opportunity`, `lose-opportunity`, `update-opportunity`)
  se corrigieron y se agregó `backend/tests/integration/opportunities-won-bypass-guard.spec.ts`
  (3/3 tests) para fijar la regresión — ver research.md #6 actualizado.
- [X] T063 [P] Actualizar estado de la Fase 2 (módulo Opportunities) en
  `docs/implementation-plan.md` y `CLAUDE.md`
- [X] T064 Ejecutar la validación manual de `quickstart.md` de punta a punta
  (cubierta por el E2E de T061, que sigue el mismo guion paso a paso)
- [X] T065 Confirmar que los tests de specs 004-010 siguen pasando (más allá de los
  2 ajustes ya documentados en T014) sin ninguna otra modificación

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: depende de que **specs 008/009/010** estén implementadas
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias;
  incluye la migración de `LeadsModule` (T013-T015), que debe completarse antes de
  tocar cualquier historia de esta spec para no dejar spec 010 en un estado roto a
  mitad de camino
- **User Stories (Phase 3-7)**: todas dependen de Foundational
- **Polish (Phase 8)**: depende de las historias que se quieran completar

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias de esta spec — es el MVP
- **US2 (P2)**: extiende `UpdateOpportunityUseCase`/`GetOpportunityUseCase` de US1;
  independiente
- **US3 (P3)**: reutiliza `OpportunityRepository`/`PipelineStageRepository` de
  Foundational; independiente de US1/US2 salvo por usar la misma Oportunidad de
  prueba
- **US4 (P4)**: reutiliza `OpportunityRepository` de Foundational; solo necesita
  datos ya cargados por US1-US3 para tener algo que agregar
- **US5 (P5)**: reutiliza `OpportunityRepository`/`OpportunityHistoryRepository` de
  Foundational

### Within Each User Story

- Tests antes que implementación
- Repositories antes que Use Cases
- Use Cases antes que Controller
- Backend antes que integración de frontend

### Parallel Opportunities

- Todas las tareas [P] de Setup y Foundational en paralelo entre sí
- Una vez completado Foundational, US1-US5 pueden trabajarse en paralelo por
  distintos desarrolladores (todas dependen solo de Foundational, no entre sí)
- Dentro de cada historia, los tests marcados [P] en paralelo entre sí

---

## Parallel Example: User Story 1

```bash
# Lanzar todos los tests de la User Story 1 juntos:
Task: "Integration test pipeline por defecto en backend/tests/integration/opportunities-default-pipeline.spec.ts"
Task: "Integration test crear Oportunidad en backend/tests/integration/opportunities-create.spec.ts"
Task: "Integration test mover de etapa en backend/tests/integration/opportunities-move-stage.spec.ts"
Task: "Integration test configurar pipeline en backend/tests/integration/opportunities-pipeline-config.spec.ts"
Task: "Integration test reasignar responsable en backend/tests/integration/opportunities-reassign-owner.spec.ts"
Task: "Integration test eliminar etapa en uso en backend/tests/integration/opportunities-delete-stage-in-use.spec.ts"

# Lanzar los repositories de Foundational juntos:
Task: "PipelineRepository en backend/src/modules/opportunities/infrastructure/pipeline.repository.ts"
Task: "PipelineStageRepository en backend/src/modules/opportunities/infrastructure/pipeline-stage.repository.ts"
Task: "OpportunityRepository en backend/src/modules/opportunities/infrastructure/opportunity.repository.ts"
Task: "OpportunityHistoryRepository en backend/src/modules/opportunities/infrastructure/opportunity-history.repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (requiere specs 008/009/010 ya implementadas)
2. Completar Phase 2: Foundational — **incluye migrar `LeadsModule`** (T013-T015),
   crítico antes de seguir
3. Completar Phase 3: User Story 1
4. **STOP y VALIDAR**: probar User Story 1 de forma independiente (quickstart.md
   pasos 1-4), confirmar que los tests de specs 004-010 siguen pasando (T015/T065)
5. Deploy/demo si está listo

### Incremental Delivery

1. Completar Setup + Foundational (incluida la migración de Leads) → Fundación lista
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
- **Regla especial de esta spec**: la Fase Foundational no solo prepara esta spec —
  **migra spec 010** (elimina su repositorio temporal, actualiza su caso de uso de
  conversión y 2 de sus tests). Esto debe completarse y verificarse (T015) antes de
  tocar cualquier historia de usuario propia de esta spec, para no mezclar una
  migración cross-spec con desarrollo de features nuevas a mitad de camino.
- **Sin violaciones de Constitución pendientes**: a diferencia de spec 010, esta spec
  no dejará una excepción nueva abierta para una spec futura — resuelve la única que
  había.
