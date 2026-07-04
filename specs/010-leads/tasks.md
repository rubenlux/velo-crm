---

description: "Task list for Gestión de Prospectos (Leads)"
---

# Tasks: Gestión de Prospectos (Leads)

**Input**: Design documents from `specs/010-leads/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/leads-api.md](contracts/leads-api.md),
[quickstart.md](quickstart.md). Depende de **spec 008 (Customers)** y **spec 009
(Contacts)** ya implementadas — la conversión (US3) crea un Customer y un Contact
reales vía sus repositorios exportados (research.md #1).

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

Web app (monorepo ya existente, compartido con specs 004-009): `backend/src/`,
`backend/tests/`, `frontend/src/`, `frontend/tests/` — ver [plan.md](plan.md) § Project
Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear las tablas nuevas (`Lead`, `LeadHistory`, `LeadNote`,
`LeadAttachment`, `Opportunity` mínima), sus enums, los valores nuevos de
`AuditLogAction`, los índices de búsqueda, y el esqueleto del módulo `leads`

- [x] T001 Agregar los modelos Prisma `Lead`, `LeadHistory`, `LeadNote`,
  `LeadAttachment` y `Opportunity` (mínima, research.md #10), enums `LeadStatus`,
  `LeadSource`, `OpportunityState`, `PipelineStage` (reutilizando `CustomerPriority` de
  spec 008 para `priority`), y los 7 valores nuevos de `AuditLogAction` en
  `backend/prisma/schema.prisma` (ver [data-model.md](data-model.md))
- [x] T002 Generar la migración de Prisma; agregar a mano en el `.sql` generado los
  índices GIN trigram sobre `name`/`company`/`email`/`city` y GIN sobre `tags`
  (research.md #15); aplicar contra `velo-test-db`
- [x] T003 [P] Crear el esqueleto del módulo NestJS `leads` (carpetas `domain/`,
  `infrastructure/`, `application/`, `api/`) en `backend/src/modules/leads/`
- [x] T004 [P] Registrar `LeadsModule` en `AppModule`, importando
  `IdentityModule`/`OrganizationsModule`/`RolesModule` y **`CustomersModule`** +
  **`ContactsModule`** (specs 008/009 — primer módulo de la Fase 2 con dos
  dependencias de Fase 2 simultáneas, ver plan.md § Structure Decision)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida por las 5 historias de esta spec

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [x] T005 [P] Crear `LeadRepository` (CRUD + `search`; todas las queries filtran por
  `organizationId`) en `backend/src/modules/leads/infrastructure/lead.repository.ts`
- [x] T006 [P] Crear `LeadHistoryRepository` (`append`, `findByLeadId`) en
  `backend/src/modules/leads/infrastructure/lead-history.repository.ts`
- [x] T007 [P] Crear `LeadNoteRepository` (`create`, `findByLeadId`) en
  `backend/src/modules/leads/infrastructure/lead-note.repository.ts`
- [x] T008 [P] Crear `LeadAttachmentRepository` (`create`, `findByLeadId`) en
  `backend/src/modules/leads/infrastructure/lead-attachment.repository.ts`
- [x] T009 [P] Crear `OpportunityStubRepository` (solo `create`; documentado como
  temporal hasta spec 011, research.md #10) en
  `backend/src/modules/leads/infrastructure/opportunity-stub.repository.ts`
- [x] T010 [P] Definir errores de dominio (`LeadNotFoundError`,
  `LeadAlreadyConvertedError`, `LeadNotConvertibleError`, `LeadDuplicateWarning`,
  `LeadStaleUpdateError`) en `backend/src/modules/leads/domain/errors.ts`
- [x] T011 Crear `LeadsExceptionsFilter` (mismo patrón que specs 004-009) en
  `backend/src/modules/leads/api/leads-exceptions.filter.ts`, registrarlo en `main.ts`
  y `backend/tests/test-app.ts`
- [x] T012 Confirmar que `CustomersModule` y `ContactsModule` exportan
  `CustomerRepository`/`ContactRepository` (specs 008/009) e inyectarlos en
  `LeadsModule` para la conversión (research.md #1, #11)

**Checkpoint**: Foundation lista — las historias de usuario pueden empezar

---

## Phase 3: User Story 1 - Registro y calificación de Prospectos (Priority: P1) 🎯 MVP

**Goal**: Un Vendedor o Gerente puede registrar un Prospecto, contactarlo, calificarlo
con un Score, y asignarle (o reasignarle) un responsable.

**Independent Test**: Ver [quickstart.md](quickstart.md) pasos 1-4 — crear un Lead,
avanzarlo de estado, calificarlo, asignarle responsable.

### Tests for User Story 1

- [x] T013 [P] [US1] Integration test: crear un Lead con nombre/empresa/contacto/origen
  lo deja en `status = Nuevo` con responsable asignado si se indicó
  (Acceptance Scenario 1) en `backend/tests/integration/leads-create.spec.ts`
- [x] T014 [P] [US1] Integration test: cambiar `status` a `Contactado` vía `PATCH`
  queda registrado (Acceptance Scenario 2) en
  `backend/tests/integration/leads-status-change.spec.ts`
- [x] T015 [P] [US1] Integration test: calificar un Lead (`status: Calificado`,
  `score`) actualiza ambos campos (Acceptance Scenario 3) en
  `backend/tests/integration/leads-qualify.spec.ts`
- [x] T016 [P] [US1] Integration test: asignar `ownerUserId` a un Lead sin responsable
  lo hace aparecer en `GET /leads?ownerUserId=...` de ese responsable
  (Acceptance Scenario 4) en `backend/tests/integration/leads-assign-owner.spec.ts`
- [x] T017 [P] [US1] Integration test: dos Organizations distintas no pueden ver ni
  modificar los Leads de la otra (FR-017) en
  `backend/tests/integration/leads-cross-org.spec.ts`
- [x] T018 [P] [US1] Integration test: editar con un `version` desactualizado se
  rechaza con 409 en `backend/tests/integration/leads-stale-update.spec.ts`

### Implementation for User Story 1

- [x] T019 [US1] Implementar `CreateLeadUseCase` (`status` inicial `Nuevo`, publica
  `LeadCreated`) en `backend/src/modules/leads/application/create-lead.use-case.ts`
  (depende de T005)
- [x] T020 [US1] Implementar `UpdateLeadUseCase` (chequeo de `version`; cambios de
  `status`/`ownerUserId` publican `LeadStatusChanged`/`LeadOwnerChanged` en vez del
  genérico `LeadUpdated`; escribe diff en `LeadHistory`) en
  `backend/src/modules/leads/application/update-lead.use-case.ts` (depende de T005, T006)
- [x] T021 [US1] Implementar `GetLeadUseCase` en
  `backend/src/modules/leads/application/get-lead.use-case.ts` (depende de T005)
- [x] T022 [US1] Crear `LeadsController` con `POST /organizations/:id/leads`,
  `GET/PATCH /organizations/:id/leads/:leadId`, `TenantContextGuard` a nivel de clase +
  `@RequirePermission('lead.*')` por método en
  `backend/src/modules/leads/api/leads.controller.ts` (depende de T019-T021)
- [x] T023 [P] [US1] Crear servicio de API del frontend en
  `frontend/src/services/leads-api.ts`
- [x] T024 [P] [US1] Construir `frontend/src/features/leads/LeadForm.tsx` y
  `LeadDetail.tsx` (alta, edición de estado/score/responsable)

**Checkpoint**: User Story 1 funciona de forma independiente — este es el MVP de esta
spec

---

## Phase 4: User Story 2 - Seguimiento comercial del Prospecto (Priority: P2)

**Goal**: Un Vendedor puede agregar notas ilimitadas, definir la próxima acción y
adjuntar documentos a un Prospecto.

**Independent Test**: Con un Lead ya creado, agregar una nota, definir una próxima
acción y adjuntar un documento; verificar que todo aparece en su ficha.

> **Alcance**: el Acceptance Scenario 1 de esta historia ("registrar una actividad —
> llamada, reunión, email") queda diferido a spec 012 (Activities), research.md #9 —
> no tiene tareas en esta fase. El resto de la historia (notas, próxima acción,
> adjuntos) se implementa completo.

### Tests for User Story 2

- [x] T025 [P] [US2] Integration test: agregar una nota la asocia al Lead sin límite de
  cantidad (Acceptance Scenario 2) en `backend/tests/integration/leads-notes.spec.ts`
- [x] T026 [P] [US2] Integration test: definir `nextActionAt`/`nextActionNote` los deja
  visibles al consultar el Lead (Acceptance Scenario 3) en
  `backend/tests/integration/leads-next-action.spec.ts`
- [x] T027 [P] [US2] Integration test: adjuntar un documento lo asocia y lo deja
  accesible desde la ficha del Lead (Acceptance Scenario 4) en
  `backend/tests/integration/leads-attachments.spec.ts`

### Implementation for User Story 2

- [x] T028 [US2] Implementar `AddLeadNoteUseCase` en
  `backend/src/modules/leads/application/add-lead-note.use-case.ts` (depende de T007)
- [x] T029 [US2] Implementar `AddLeadAttachmentUseCase` en
  `backend/src/modules/leads/application/add-lead-attachment.use-case.ts` (depende de
  T008)
- [x] T030 [US2] Extender `UpdateLeadUseCase` (T020) para aceptar `nextActionAt`/
  `nextActionNote` en `backend/src/modules/leads/application/update-lead.use-case.ts`
- [x] T031 [US2] Agregar `POST/GET /organizations/:id/leads/:leadId/notes` y
  `POST/GET /organizations/:id/leads/:leadId/attachments` a `LeadsController` (depende
  de T028, T029)
- [x] T032 [P] [US2] Agregar notas, próxima acción y adjuntos a
  `frontend/src/features/leads/LeadDetail.tsx`

**Checkpoint**: User Stories 1-2 funcionan de forma independiente (US2 en su alcance
acotado)

---

## Phase 5: User Story 3 - Conversión de Prospecto en Cliente, Contacto y Oportunidad (Priority: P3)

**Goal**: Un Vendedor puede convertir un Prospecto calificado en un Customer, un
Contact principal y una Opportunity en una única operación.

**Independent Test**: Ver [quickstart.md](quickstart.md) pasos 5-8 — convertir un Lead
calificado y verificar las tres entidades creadas; reintentar la conversión y la
detección de duplicados.

### Tests for User Story 3

- [x] T033 [P] [US3] Integration test: convertir un Lead calificado crea un Customer,
  un Contact principal y una Opportunity en una sola operación
  (Acceptance Scenario 1) en `backend/tests/integration/leads-convert.spec.ts`
- [x] T034 [P] [US3] Integration test: el Lead convertido queda en `status =
  Convertido` con los ids enlazados y su historial previo intacto
  (Acceptance Scenario 2) en `backend/tests/integration/leads-convert-preserves-history.spec.ts`
- [x] T035 [P] [US3] Integration test: reconvertir un Lead ya `Convertido` se rechaza
  con 409 `LeadAlreadyConvertedError` sin crear entidades duplicadas
  (Acceptance Scenario 3, FR-011) en `backend/tests/integration/leads-convert-twice.spec.ts`
- [x] T036 [P] [US3] Integration test: convertir un Lead con email/teléfono que ya
  corresponde a un Customer/Contact existente responde 409 `LeadDuplicateWarning` sin
  crear nada, y `linkToExistingCustomerId` vincula al existente en vez de duplicar
  (edge case) en `backend/tests/integration/leads-convert-duplicate.spec.ts`
- [x] T037 [P] [US3] Integration test: dos conversiones concurrentes del mismo Lead
  resultan en un solo Customer/Contact/Opportunity creados (edge case, research.md #11)
  en `backend/tests/integration/leads-convert-race.spec.ts`
- [x] T038 [P] [US3] Integration test: convertir un Lead `Perdido` o `Archivado` se
  rechaza con `LeadNotConvertibleError` (research.md #11) en
  `backend/tests/integration/leads-convert-not-convertible.spec.ts`

### Implementation for User Story 3

- [x] T039 [US3] Implementar `ConvertLeadUseCase` (transacción: `updateMany`
  condicional por estado, detección de duplicados vía `CustomerRepository`/
  `ContactRepository`, creación de Customer/Contact/Opportunity, seteo de
  `convertedCustomerId`/`convertedContactId`/`convertedOpportunityId`/`convertedAt`,
  publica `LeadConverted` — research.md #10, #11) en
  `backend/src/modules/leads/application/convert-lead.use-case.ts` (depende de T005,
  T009, T012)
- [x] T040 [US3] Agregar `POST /organizations/:id/leads/:leadId/convert` a
  `LeadsController` (depende de T039)
- [x] T041 [P] [US3] Construir `frontend/src/features/leads/ConvertLead.tsx`
  (confirmación de conversión, resolución de duplicados)

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

---

## Phase 6: User Story 4 - Marcar como perdido y reactivar Prospectos (Priority: P4)

**Goal**: Un Vendedor puede marcar un Prospecto como perdido y reactivarlo
posteriormente sin perder su historial.

**Independent Test**: Marcar un Lead calificado como perdido, verificar que desaparece
de los activos, y reactivarlo para confirmar que recupera su estado de trabajo previo.

### Tests for User Story 4

- [x] T042 [P] [US4] Integration test: marcar un Lead como `Perdido` lo excluye del
  listado de activos por defecto sin eliminarlo (Acceptance Scenario 1) en
  `backend/tests/integration/leads-lose.spec.ts`
- [x] T043 [P] [US4] Integration test: reactivar un Lead `Perdido` restaura
  exactamente el `status` previo a la pérdida (`statusBeforeLost`, research.md #12)
  (Acceptance Scenario 2) en `backend/tests/integration/leads-reactivate.spec.ts`
- [x] T044 [P] [US4] Integration test: no existe ninguna ruta que elimine un Lead
  físicamente en ningún estado (Acceptance Scenario 3, FR-014) en
  `backend/tests/integration/leads-no-hard-delete.spec.ts`
- [x] T045 [P] [US4] Integration test: reactivar un Lead que no está `Perdido` (por
  ejemplo, `Convertido`) se rechaza con 409 en
  `backend/tests/integration/leads-reactivate-invalid-state.spec.ts`

### Implementation for User Story 4

- [x] T046 [US4] Implementar `LoseLeadUseCase` (guarda `statusBeforeLost`, `status →
  Perdido`, publica `LeadLost`) en
  `backend/src/modules/leads/application/lose-lead.use-case.ts` (depende de T005)
- [x] T047 [US4] Implementar `ReactivateLeadUseCase` (restaura `status =
  statusBeforeLost`, limpia `statusBeforeLost`, publica `LeadReactivated`) en
  `backend/src/modules/leads/application/reactivate-lead.use-case.ts` (depende de T005)
- [x] T048 [US4] Agregar `POST /organizations/:id/leads/:leadId/lose` y
  `.../reactivate` a `LeadsController` (depende de T046, T047)
- [x] T049 [P] [US4] Agregar las acciones "marcar como perdido"/"reactivar" en
  `frontend/src/features/leads/LeadDetail.tsx`

**Checkpoint**: User Stories 1-4 funcionan de forma independiente

---

## Phase 7: User Story 5 - Búsqueda, filtros e importación de Prospectos (Priority: P5)

**Goal**: Un usuario comercial puede buscar Prospectos por distintos atributos, ver su
línea de tiempo completa, e importar Prospectos en lote.

**Independent Test**: Con varios Leads cargados, buscar y filtrar por distintos
atributos; importar un lote de Leads desde un archivo; consultar la línea de tiempo de
uno de ellos.

### Tests for User Story 5

- [x] T050 [P] [US5] Integration test: búsqueda por nombre/empresa/email/teléfono/
  responsable/estado/etiquetas/ciudad/origen devuelve coincidencias en <300ms
  (Acceptance Scenario 1, SC-002) en `backend/tests/integration/leads-search.spec.ts`
- [x] T051 [P] [US5] Integration test: importar un archivo válido crea Leads en
  `status = Nuevo` respetando las mismas validaciones que el alta manual
  (Acceptance Scenario 2, FR-002) en `backend/tests/integration/leads-import.spec.ts`
- [x] T052 [P] [US5] Integration test: la línea de tiempo combina `LeadHistory` +
  `AuditLog` + `LeadNote` en orden cronológico en
  `backend/tests/integration/leads-timeline.spec.ts`

### Implementation for User Story 5

- [x] T053 [US5] Implementar `SearchLeadsUseCase` (query params → `LeadRepository.search`,
  índices `pg_trgm`/GIN — research.md #15) en
  `backend/src/modules/leads/application/search-leads.use-case.ts` (depende de T005)
- [x] T054 [US5] Implementar `ImportLeadsUseCase` (CSV, reutiliza `CreateLeadUseCase`
  fila por fila — research.md #16) en
  `backend/src/modules/leads/application/import-leads.use-case.ts` (depende de T019)
- [x] T055 [US5] Implementar `GetLeadTimelineUseCase` (combina `LeadHistory` +
  `AuditLog` filtrado por `leadId` + `LeadNote` — research.md #14) en
  `backend/src/modules/leads/application/get-lead-timeline.use-case.ts` (depende de
  T005, T006, T007)
- [x] T056 [US5] Agregar `GET /organizations/:id/leads`,
  `POST /organizations/:id/leads/import` y
  `GET /organizations/:id/leads/:leadId/timeline` a `LeadsController` (depende de
  T053-T055)
- [x] T057 [P] [US5] Construir `frontend/src/features/leads/LeadsList.tsx` y
  `LeadTimeline.tsx`

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [x] T058 [P] E2E test del flujo completo de quickstart.md en
  `backend/tests/e2e/leads/quickstart.spec.ts`
- [x] T059 Revisión de hardening de seguridad: aislamiento por `organizationId` en
  `LeadRepository`/`OpportunityStubRepository`, ausencia de ruta de eliminación
  física, y que la transacción de `ConvertLeadUseCase` garantiza una sola conversión
  bajo solicitudes concurrentes (research.md #11)
- [x] T060 [P] Actualizar estado de la Fase 2 (módulo Leads) en
  `docs/implementation-plan.md`
- [x] T061 Ejecutar la validación manual de `quickstart.md` de punta a punta
- [x] T062 Confirmar que los tests de specs 004-009 siguen pasando sin modificaciones

> **Resultado T059 (revisión de seguridad)**: un hallazgo real, corregido antes de
> cerrar la spec. `ConvertLeadUseCase` resolvía `linkToExistingCustomerId`/
> `linkToExistingContactId` con `tx.customer.findUniqueOrThrow({ where: { id } })` /
> `tx.contact.findUniqueOrThrow({ where: { id } })` — sin filtrar por
> `organizationId`, permitiendo en teoría vincular la conversión de un Lead a un
> Customer/Contact de otra Organization. Corregido resolviendo y validando ambos ids
> con `CustomerRepository.findById`/`ContactRepository.findById` (ya scoped) antes de
> la transacción, rechazando con 400 (`LeadConversionLinkNotFoundError`) si no
> pertenecen a la Organization del Lead. Cubierto por
> `backend/tests/integration/leads-convert-link-cross-org.spec.ts` (nuevo, no listado
> en el plan de tareas original ya que el hallazgo surgió durante la propia revisión).
> Resto de la revisión sin hallazgos adicionales: aislamiento por `organizationId`
> verificado en `LeadRepository`/`CustomerRepository.findByEmailOrPhone`/
> `ContactRepository.findByEmailOrPhone`; sin ninguna ruta `DELETE` para `Lead`; la
> transacción de conversión garantiza una sola conversión bajo 5 solicitudes
> concurrentes (`leads-convert-race.spec.ts`); `ValidationPipe({ whitelist: true })`
> descarta cualquier intento de inyectar `organizationId`/`convertedCustomerId`/
> `convertedContactId`/`convertedOpportunityId`/`convertedAt`/`version` vía
> `CreateLeadDto`/`UpdateLeadDto` (no declarados en los DTOs).
>
> **Resultado T060**: `docs/implementation-plan.md` y `CLAUDE.md` actualizados con el
> estado de spec 010, incluida la nota de la excepción de `Opportunity` y el hallazgo
> de seguridad.
>
> **Resultado T061**: cubierto por el E2E de T058
> (`backend/tests/e2e/leads/quickstart.spec.ts`).
>
> **Resultado T062**: confirmado — 160 tests totales pasando (135 preexistentes de
> specs 004-009 + 25 nuevos de esta spec, incluido el test de seguridad de T059), sin
> ninguna modificación a los tests existentes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: depende de que **spec 008 (Customers)** y **spec 009
  (Contacts)** estén implementadas — `CustomerRepository`/`ContactRepository` deben
  existir y estar exportados (research.md #1)
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-7)**: todas dependen de Foundational
- **Polish (Phase 8)**: depende de las historias que se quieran completar

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias de esta spec (sí de specs 008/009
  completas) — es el MVP
- **US2 (P2)**: reutiliza `LeadRepository`/`UpdateLeadUseCase` de US1; independiente en
  su alcance acotado (sin registro de actividades, research.md #9)
- **US3 (P3)**: reutiliza `LeadRepository` de Foundational y `CustomerRepository`/
  `ContactRepository` (specs 008/009); es la historia de mayor valor de negocio
- **US4 (P4)**: reutiliza `LeadRepository`/`AuditLogPublisher` de Foundational
- **US5 (P5)**: reutiliza `LeadRepository`/índices de Foundational,
  `LeadHistoryRepository`/`LeadNoteRepository` para timeline

### Within Each User Story

- Tests antes que implementación
- Repositories antes que Use Cases
- Use Cases antes que Controller
- Backend antes que integración de frontend

### Parallel Opportunities

- Todas las tareas [P] de Setup y Foundational en paralelo entre sí
- Una vez completado Foundational, US1-US5 pueden trabajarse en paralelo por distintos
  desarrolladores (US2 y US3 ambas dependen solo de Foundational, no entre sí)
- Dentro de cada historia, los tests marcados [P] en paralelo entre sí

---

## Parallel Example: User Story 1

```bash
# Lanzar todos los tests de la User Story 1 juntos:
Task: "Integration test crear Lead en backend/tests/integration/leads-create.spec.ts"
Task: "Integration test cambio de estado en backend/tests/integration/leads-status-change.spec.ts"
Task: "Integration test calificar Lead en backend/tests/integration/leads-qualify.spec.ts"
Task: "Integration test asignar responsable en backend/tests/integration/leads-assign-owner.spec.ts"
Task: "Integration test aislamiento cross-org en backend/tests/integration/leads-cross-org.spec.ts"
Task: "Integration test stale update en backend/tests/integration/leads-stale-update.spec.ts"

# Lanzar los repositories de Foundational juntos:
Task: "LeadRepository en backend/src/modules/leads/infrastructure/lead.repository.ts"
Task: "LeadHistoryRepository en backend/src/modules/leads/infrastructure/lead-history.repository.ts"
Task: "LeadNoteRepository en backend/src/modules/leads/infrastructure/lead-note.repository.ts"
Task: "LeadAttachmentRepository en backend/src/modules/leads/infrastructure/lead-attachment.repository.ts"
Task: "OpportunityStubRepository en backend/src/modules/leads/infrastructure/opportunity-stub.repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (requiere specs 008/009 ya implementadas)
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **STOP y VALIDAR**: probar User Story 1 de forma independiente (quickstart.md pasos
   1-4), confirmar que los tests de specs 004-009 siguen pasando (T062)
5. Deploy/demo si está listo

### Incremental Delivery

1. Completar Setup + Foundational → Fundación lista
2. Agregar User Story 1 → Probar independientemente → Deploy/Demo (MVP!)
3. Agregar User Story 2 (alcance acotado) → Probar independientemente → Deploy/Demo
4. Agregar User Story 3 (conversión — mayor valor de negocio) → Probar
   independientemente → Deploy/Demo
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
- **Regla especial de esta spec**: no puede empezar su Fase 1 sin que **spec 008
  (Customers)** y **spec 009 (Contacts)** estén implementadas y sus repositorios
  exportados — son dependencias reales de código, no solo de spec
- **Alcance acotado de esta spec** (ver research.md): la tabla `Opportunity` es mínima
  y de propiedad temporal hasta spec 011 (#10); "registrar actividades" (US2 AC1) queda
  diferido a spec 012 (#9); `Archivado` se alcanza vía el PATCH genérico, sin acción
  dedicada (#13)
