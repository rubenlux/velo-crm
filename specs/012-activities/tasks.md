---

description: "Task list for Gestión de Actividades"
---

# Tasks: Gestión de Actividades

**Input**: Design documents from `specs/012-activities/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/activities-api.md, quickstart.md

**Tests**: incluidos (mismo criterio que specs 008-011: cada Acceptance Scenario y
edge case relevante tiene su test de integración).

**Organization**: Tasks agrupadas por historia de usuario (US1-US5), en orden de
prioridad (P1-P5), mismo formato que `specs/011-opportunities/tasks.md`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Esquema de base de datos y catálogo de permisos

- [X] T001 Agregar los modelos Prisma `ActivityType`, `Activity`, `ActivityHistory`,
  `ActivityComment`, `ActivityAttachment`; agregar 12 valores nuevos a
  `AuditLogAction`; agregar `activities Activity[]`/`activityTypes ActivityType[]`
  a `Organization` (data-model.md) en `backend/prisma/schema.prisma`
- [X] T002 Generar la migración con `prisma migrate dev --create-only`; a mano en
  el `.sql` generado: (a) agregar el CHECK `activities_at_least_one_relation`
  (research.md #1), (b) agregar el índice GIN `activities_title_trgm_idx`
  (research.md #15), (c) revisar y eliminar cualquier `DROP INDEX` erróneo que
  Prisma proponga sobre los índices `pg_trgm` de specs 008-011 (gotcha recurrente,
  4ª vez — 17 statements eliminados, verificados intactos post-aplicación).
  Aplicada con `npx prisma migrate deploy` a `velo_test` y `velo_dev` (ambas bases
  del split documentado en CLAUDE.md)
- [X] T003 [P] Crear el esqueleto del módulo NestJS `activities` (carpetas
  `domain/application/infrastructure/api`) en `backend/src/modules/activities/`
- [X] T004 [P] Registrar `ActivitiesModule` en `AppModule`, importando
  `IdentityModule`, `OrganizationsModule`, `RolesModule`, `CustomersModule`,
  `ContactsModule`, `LeadsModule` y `OpportunitiesModule` (research.md #13 — ningún
  módulo de esos importa `ActivitiesModule` de vuelta) en
  `backend/src/app.module.ts`
- [X] T005 [P] Agregar la permission key `activity.manage_types` al catálogo
  (research.md #4) en `backend/src/modules/roles/infrastructure/permission-catalog.ts`;
  actualizar `DEFAULT_ROLE_PERMISSIONS`: agregar `.filter((key) => key !==
  'activity.manage_types')` a los `byResource([...])` de `Gerente`, `Ventas` y
  `Soporte` (`byResource` la incluiría automáticamente si no se excluye a mano,
  mismo gotcha de spec 011 research.md #6)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repositorios, seeder de tipos por defecto, manejo de errores — bloquea
todas las historias

**⚠️ CRITICAL**: ninguna historia puede empezar hasta que esta fase esté completa

- [X] T006 [P] Crear `ActivityTypeRepository` (`create`, `findById`,
  `findByOrganizationId` — combina defaults `organizationId = null` + custom de la
  Organization) en
  `backend/src/modules/activities/infrastructure/activity-type.repository.ts`
- [X] T007 [P] Crear `DefaultActivityTypesSeeder` (12 tipos de FR-010, idempotente,
  mismo patrón que `DefaultRolesSeeder` de spec 007 — research.md #3) en
  `backend/src/modules/activities/infrastructure/default-activity-types.seeder.ts`;
  invocarlo en el bootstrap de la aplicación (`backend/src/main.ts`, junto al
  seeder de Roles)
- [X] T008 [P] Crear `ActivityRepository` (`create`, `findById` org-scoped,
  `updateWithVersionCheck`, `update`, `search`) en
  `backend/src/modules/activities/infrastructure/activity.repository.ts`
- [X] T009 [P] Crear `ActivityHistoryRepository` (`append`, `findByActivityId`) en
  `backend/src/modules/activities/infrastructure/activity-history.repository.ts`
- [X] T010 [P] Crear `ActivityCommentRepository` (`create`, `findById`,
  `findByActivityId`, `update`, `delete`) en
  `backend/src/modules/activities/infrastructure/activity-comment.repository.ts`
- [X] T011 [P] Crear `ActivityAttachmentRepository` (`create`, `findByActivityId`)
  en `backend/src/modules/activities/infrastructure/activity-attachment.repository.ts`
- [X] T012 [P] Definir errores de dominio (`ActivityNotFoundError`,
  `ActivityStaleUpdateError`, `ActivityNotCancelledError`,
  `ActivityNotFinishedError`, `ActivityRelatedEntitiesMismatchError`,
  `ActivityNoRelationError`, `CommentNotOwnedError`, `CommentNotFoundError`,
  `AttachmentNotFoundError`) en `backend/src/modules/activities/domain/errors.ts`
- [X] T013 Crear `ActivitiesExceptionsFilter` (mismo patrón que specs 004-011) en
  `backend/src/modules/activities/api/activities-exceptions.filter.ts`; registrarlo
  en `backend/src/main.ts` y en `backend/tests/test-app.ts`
- [X] T014 Actualizar `resetDatabase()` en `backend/tests/test-app.ts`: agregar
  `activityComment.deleteMany()`, `activityAttachment.deleteMany()`,
  `activityHistory.deleteMany()`, `activity.deleteMany()` y
  `activityType.deleteMany({ where: { organizationId: { not: null } } })` (nunca
  borrar los 12 tipos por defecto, mismo criterio que `resetDatabase()` con los
  Roles por defecto de spec 007) en el orden correcto para no violar FKs

**Checkpoint**: Foundation lista — las historias de usuario pueden empezar

---

## Phase 3: User Story 1 - Registrar y gestionar Activities (Priority: P1) 🎯 MVP

**Goal**: Un Vendedor puede registrar, editar, cancelar y reactivar Activities
asociadas a un Customer, Contact, Lead u Opportunity; un Administrador puede
configurar tipos custom.

**Independent Test**: Crear una Activity de un tipo dado asociada a un Customer
existente, editarla y cambiar su estado, sin depender de adjuntos, comentarios ni
búsqueda.

### Tests for User Story 1

- [X] T015 [P] [US1] Integration test: registrar una Activity con tipo, título,
  fecha/hora y duración la deja en estado `Pendiente` (Acceptance Scenario 1) en
  `backend/tests/integration/activities-create.spec.ts`
- [X] T016 [P] [US1] Integration test: un Administrador configura un tipo custom
  disponible para nuevas Activities de su Organization (Acceptance Scenario 2);
  repetir sin `activity.manage_types` da 403 en
  `backend/tests/integration/activities-custom-type.spec.ts`
- [X] T017 [P] [US1] Integration test: transición Pendiente→EnProceso→Finalizada
  puebla `finishedAt` al llegar a Finalizada (Acceptance Scenario 3) en
  `backend/tests/integration/activities-status-change.spec.ts`
- [X] T018 [P] [US1] Integration test: cancelar una Activity la deja en
  `Cancelada` sin eliminarla físicamente (Acceptance Scenario 4, RN-005) en
  `backend/tests/integration/activities-cancel.spec.ts`
- [X] T019 [P] [US1] Integration test: reactivar una Activity `Cancelada` la
  vuelve a `Pendiente` (Clarifications) en
  `backend/tests/integration/activities-reactivate.spec.ts`
- [X] T020 [P] [US1] Integration test: registrar una Activity con más de un
  participante conserva la lista completa (Acceptance Scenario 5) en
  `backend/tests/integration/activities-participants.spec.ts`
- [X] T021 [P] [US1] Integration test: rechaza con 400 una Activity sin ninguna
  entidad relacionada asociada (edge case, RN-004) en
  `backend/tests/integration/activities-no-relation.spec.ts`
- [X] T022 [P] [US1] Integration test: rechaza con 400 una Activity cuyas
  entidades relacionadas simultáneas no remiten al mismo Customer (edge case,
  FR-002a, research.md #2) en
  `backend/tests/integration/activities-relations-mismatch.spec.ts`
- [X] T023 [P] [US1] Integration test: editar una Activity con `version`
  desactualizado da 409 (edge case, concurrencia) en
  `backend/tests/integration/activities-stale-update.spec.ts`

### Implementation for User Story 1

- [X] T024 [US1] Implementar `ListActivityTypesUseCase` en
  `backend/src/modules/activities/application/list-activity-types.use-case.ts`
  (depende de T006, T007)
- [X] T025 [US1] Implementar `CreateActivityTypeUseCase` en
  `backend/src/modules/activities/application/create-activity-type.use-case.ts`
  (depende de T006)
- [X] T026 [US1] Implementar `CreateActivityUseCase` (valida al menos una entidad
  relacionada — RN-004 — y coherencia de Customer entre las provistas —
  research.md #1, #2 — resolviendo `CustomerRepository`/`ContactRepository`/
  `LeadRepository`/`OpportunityRepository`) en
  `backend/src/modules/activities/application/create-activity.use-case.ts`
  (depende de T008, T012)
- [X] T027 [US1] Implementar `UpdateActivityUseCase` (título, descripción,
  `scheduledAt`, duración, prioridad, `ownerUserId`, participantes, tags,
  `status` con `finishedAt` automático — research.md #7) en
  `backend/src/modules/activities/application/update-activity.use-case.ts`
  (depende de T008, T009)
- [X] T028 [US1] Implementar `GetActivityUseCase` en
  `backend/src/modules/activities/application/get-activity.use-case.ts` (depende
  de T008)
- [X] T029 [US1] Implementar `CancelActivityUseCase` (guarda
  `statusBeforeCancel`) en
  `backend/src/modules/activities/application/cancel-activity.use-case.ts`
  (depende de T008)
- [X] T030 [US1] Implementar `ReactivateActivityUseCase` (restaura
  `statusBeforeCancel` o `Pendiente`, limpia el campo) en
  `backend/src/modules/activities/application/reactivate-activity.use-case.ts`
  (depende de T008)
- [X] T031 [US1] Crear `ActivityTypesController`
  (`GET/POST /organizations/:id/activity-types`, `activity.read`/
  `activity.manage_types`) en
  `backend/src/modules/activities/api/activity-types.controller.ts` (depende de
  T024, T025)
- [X] T032 [US1] Crear `ActivitiesController` con
  `POST/GET/PATCH /organizations/:id/activities[/:activityId]` y
  `POST .../cancel`, `POST .../reactivate`, `TenantContextGuard` a nivel de clase
  + `@RequirePermission('activity.*')` por método en
  `backend/src/modules/activities/api/activities.controller.ts` (depende de
  T026-T030)
- [X] T033 [P] [US1] Crear servicio de API del frontend en
  `frontend/src/services/activities-api.ts`
- [X] T034 [P] [US1] Construir `frontend/src/features/activities/ActivityForm.tsx`
  (elige tipo + Customer/Contact/Lead/Opportunity) y
  `ActivityDetail.tsx` (estado, cancelar/reactivar)

**Checkpoint**: User Story 1 funciona de forma independiente — este es el MVP de
esta spec

---

## Phase 4: User Story 2 - Resultado y próxima actividad programada (Priority: P2)

**Goal**: Un Vendedor puede registrar el resultado de una Activity finalizada y
programar la siguiente acción sin perder contexto.

**Independent Test**: Con una Activity finalizada, registrar su resultado y
programar una nueva Activity relacionada como próxima acción.

### Tests for User Story 2

- [X] T035 [P] [US2] Integration test: registrar el resultado de una Activity
  `Finalizada` lo deja visible (Acceptance Scenario 1); intentarlo sobre una no
  finalizada da 409 (research.md #12) en
  `backend/tests/integration/activities-result.spec.ts`
- [X] T036 [P] [US2] Integration test: programar una próxima Activity crea una
  nueva `Pendiente` vinculada a la misma entidad relacionada y a la Activity que
  la originó (Acceptance Scenario 2, research.md #11) en
  `backend/tests/integration/activities-schedule-follow-up.spec.ts`

### Implementation for User Story 2

- [X] T037 [US2] Extender `UpdateActivityUseCase` (T027) para aceptar `result`
  con guarda de estado (`ActivityNotFinishedError` si `status !== 'Finalizada'` —
  research.md #12) en
  `backend/src/modules/activities/application/update-activity.use-case.ts`
  (depende de T027)
- [X] T038 [US2] Implementar `ScheduleFollowUpActivityUseCase` (hereda
  `customerId`/`contactId`/`leadId`/`opportunityId` de la Activity origen,
  `originActivityId` — research.md #11) en
  `backend/src/modules/activities/application/schedule-follow-up-activity.use-case.ts`
  (depende de T008, T026)
- [X] T039 [US2] Agregar `POST /organizations/:id/activities/:activityId/schedule-follow-up`
  a `ActivitiesController` (depende de T038)
- [X] T040 [P] [US2] Mostrar/editar resultado y agregar el botón "Programar
  próxima actividad" en `frontend/src/features/activities/ActivityDetail.tsx`

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Adjuntos y comentarios internos (Priority: P3)

**Goal**: Un usuario comercial puede adjuntar documentos y agregar comentarios
internos a una Activity.

**Independent Test**: Con una Activity ya creada, adjuntar un archivo y agregar un
comentario, verificando que ambos quedan asociados y visibles.

### Tests for User Story 3

- [X] T041 [P] [US3] Integration test: adjuntar un archivo lo deja disponible
  mientras exista la Activity, y sobrevive a su cancelación (Acceptance Scenario
  1, edge case RN-007) en
  `backend/tests/integration/activities-attachments.spec.ts`
- [X] T042 [P] [US3] Integration test: agregar un comentario interno lo deja
  visible para el resto del equipo de la Organization (Acceptance Scenario 2) en
  `backend/tests/integration/activities-comments.spec.ts`
- [X] T043 [P] [US3] Integration test: editar/eliminar un comentario propio da
  200; hacerlo sobre un comentario ajeno da 403, sin excepción para Propietario
  (Clarifications, research.md #9) en
  `backend/tests/integration/activities-comments-ownership.spec.ts`

### Implementation for User Story 3

- [X] T044 [US3] Implementar `AddActivityAttachmentUseCase` en
  `backend/src/modules/activities/application/add-activity-attachment.use-case.ts`
  (depende de T011)
- [X] T045 [US3] Implementar `AddActivityCommentUseCase`,
  `UpdateActivityCommentUseCase` (verifica `authorUserId`, research.md #9) y
  `DeleteActivityCommentUseCase` (misma verificación) en
  `backend/src/modules/activities/application/{add,update,delete}-activity-comment.use-case.ts`
  (depende de T010)
- [X] T046 [US3] Agregar `GET/POST .../activities/:activityId/attachments` y
  `GET/POST/PATCH/DELETE .../activities/:activityId/comments[/:commentId]` a
  `ActivitiesController` (depende de T044, T045)
- [X] T047 [P] [US3] Agregar la sección de adjuntos y comentarios (con
  edición/borrado solo si `authorUserId === session.user.id`) en
  `frontend/src/features/activities/ActivityDetail.tsx`

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

---

## Phase 6: User Story 4 - Línea de tiempo automática por entidad relacionada (Priority: P4)

**Goal**: Las Activities de un Customer, Contact, Lead u Opportunity aparecen
automáticamente en su línea de tiempo, sin pasos manuales.

**Independent Test**: Con varias Activities registradas para un mismo Customer,
consultar su línea de tiempo (spec 008) y verificar que todas aparecen ordenadas
cronológicamente.

### Tests for User Story 4

- [X] T048 [P] [US4] Integration test: `GET /organizations/:id/activities?customerId=X`
  devuelve automáticamente todas las Activities de ese Customer, ordenadas
  cronológicamente (Acceptance Scenario 1) en
  `backend/tests/integration/activities-search-by-relation.spec.ts`
- [X] T049 [P] [US4] Integration test: una Activity asociada simultáneamente a un
  Contact y a la Opportunity de su Customer aparece al buscar por cualquiera de
  los dos ids (Acceptance Scenario 2) en
  `backend/tests/integration/activities-multi-relation-search.spec.ts`

### Implementation for User Story 4

- [X] T050 [US4] Implementar `SearchActivitiesUseCase` con los filtros base
  (`customerId`, `contactId`, `leadId`, `opportunityId`, orden cronológico —
  research.md #13, reutilizado por el frontend de las otras 4 entidades) en
  `backend/src/modules/activities/application/search-activities.use-case.ts`
  (depende de T008)
- [X] T051 [US4] Agregar `GET /organizations/:id/activities` a
  `ActivitiesController` (depende de T050)
- [X] T052 [US4] Extender `frontend/src/features/customers/CustomerTimeline.tsx`,
  `frontend/src/features/contacts/ContactTimeline.tsx`,
  `frontend/src/features/leads/LeadTimeline.tsx` y
  `frontend/src/features/opportunities/OpportunityTimeline.tsx` (ya existentes,
  sin cambios de backend) para llamar también a `searchActivities({customerId/
  contactId/leadId/opportunityId})` y mergear+ordenar cronológicamente el
  resultado junto a su propia timeline (research.md #13 — el cambio de frontend
  más importante de esta spec)
- [X] T053 [P] [US4] Agregar `searchActivities()` a
  `frontend/src/services/activities-api.ts` (depende de T033)

**Checkpoint**: User Stories 1-4 funcionan de forma independiente

---

## Phase 7: User Story 5 - Búsqueda y filtrado de Activities (Priority: P5)

**Goal**: Un Gerente Comercial puede buscar y filtrar Activities por tipo, entidad
relacionada, usuario, estado, prioridad, fecha o etiquetas.

**Independent Test**: Con varias Activities registradas por distintos usuarios,
buscar y filtrar por distintos atributos.

### Tests for User Story 5

- [X] T054 [P] [US5] Integration test: búsqueda por tipo/Customer/Contact/Lead/
  Opportunity/usuario/estado/prioridad/fecha/etiquetas devuelve coincidencias en
  <300ms (Acceptance Scenario 1, SC-002) en
  `backend/tests/integration/activities-search.spec.ts`
- [X] T055 [P] [US5] Integration test: la línea de tiempo propia de una Activity
  combina `ActivityHistory` + `AuditLog` en orden cronológico (research.md #14)
  en `backend/tests/integration/activities-timeline.spec.ts`

### Implementation for User Story 5

- [X] T056 [US5] Extender `SearchActivitiesUseCase` (T050) con los filtros
  restantes (`q`, `activityTypeId`, `ownerUserId`, `status`, `priority`, `tag`) en
  `backend/src/modules/activities/application/search-activities.use-case.ts`
  (depende de T050; índice `pg_trgm` sobre `title` ya agregado en T002)
- [X] T057 [US5] Implementar `GetActivityTimelineUseCase` (combina
  `ActivityHistory` + `AuditLog` filtrado por `activityId` — research.md #14) en
  `backend/src/modules/activities/application/get-activity-timeline.use-case.ts`
  (depende de T009)
- [X] T058 [US5] Agregar `GET .../activities/:activityId/timeline` a
  `ActivitiesController` (depende de T057)
- [X] T059 [P] [US5] Construir `frontend/src/features/activities/ActivitiesList.tsx`
  (búsqueda global) y `ActivityTimeline.tsx` (timeline propia de la Activity)

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [X] T060 [P] E2E test del flujo completo de quickstart.md en
  `backend/tests/e2e/activities/quickstart.spec.ts`
- [X] T061 Revisión de hardening de seguridad: aislamiento por `organizationId` en
  todos los repositorios nuevos; `activity.manage_types` aplicado correctamente
  (no solo `activity.create`); comentarios editables/eliminables únicamente por
  su autor, sin ningún bypass (ni siquiera Propietario, research.md #9); el CHECK
  `activities_at_least_one_relation` y la validación de coherencia de Customer
  (FR-002a) realmente rechazan las combinaciones inválidas; sin ninguna ruta
  `DELETE` física sobre `Activity`. **Resultado: los 5 puntos pasaron sin
  encontrar ningún bug** (a diferencia de spec 011, cuya revisión encontró y
  corrigió dos bugs reales) — `ActivityCommentRepository` no filtra por
  `organizationId` directamente en la query, pero cada call site re-valida vía el
  lookup ya org-scoped de la Activity antes de tocar el comentario (mismo perfil
  de riesgo aceptado que `PipelineStageRepository` en la revisión de spec 011).
- [X] T062 [P] Actualizar estado de la Fase 2 (módulo Activities) en
  `docs/implementation-plan.md` y `CLAUDE.md`
- [X] T063 Ejecutar la validación manual de `quickstart.md` de punta a punta
  (cubierta por el E2E de T060, que sigue el mismo guion paso a paso)
- [X] T064 Confirmar que los tests de specs 004-011 siguen pasando sin ninguna
  modificación (a diferencia de spec 011, esta spec no reforma ninguna tabla
  existente) — confirmado en las 6 corridas completas de regresión hechas a lo
  largo de esta implementación (una por checkpoint de historia de usuario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-7)**: todas dependen de Foundational
- **Polish (Phase 8)**: depende de las historias que se quieran completar

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias de esta spec — es el MVP
- **US2 (P2)**: extiende `UpdateActivityUseCase`/reutiliza `CreateActivityUseCase`
  de US1; independiente
- **US3 (P3)**: reutiliza `ActivityRepository` de Foundational; independiente de
  US1/US2 salvo por usar la misma Activity de prueba
- **US4 (P4)**: introduce `SearchActivitiesUseCase` (versión base); necesita
  datos ya cargados por US1 para tener algo que mostrar en una timeline
- **US5 (P5)**: **extiende** el mismo `SearchActivitiesUseCase` que introdujo US4
  (no lo duplica) con los filtros y el índice de rendimiento restantes — a
  diferencia de spec 011 (donde US4 y US5 eran independientes entre sí), acá hay
  una dependencia real US4 → US5 porque research.md #13 decidió que ambas
  historias comparten el mismo endpoint de búsqueda

### Parallel Opportunities

- Todos los tests marcados [P] dentro de una historia pueden correr en paralelo
- Los repositorios de Foundational (T006-T011) son paralelizables entre sí
- US1, US2 y US3 pueden trabajarse en paralelo una vez completado Foundational,
  salvo por la dependencia real US4 → US5 señalada arriba

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (bloquea todas las historias)
3. Completar Fase 3: User Story 1
4. **Parar y validar**: probar User Story 1 de forma independiente

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 → probar independientemente → MVP
3. US2 → probar independientemente
4. US3 → probar independientemente
5. US4 (introduce el endpoint de búsqueda base) → probar independientemente
6. US5 (extiende ese mismo endpoint) → probar independientemente
7. Polish: E2E, seguridad, documentación, validación manual completa
