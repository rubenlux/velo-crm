---

description: "Task list for Gestión de Contactos (Contacts)"
---

# Tasks: Gestión de Contactos (Contacts)

**Input**: Design documents from `specs/009-contacts/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/contacts-api.md](contracts/contacts-api.md),
[quickstart.md](quickstart.md). Depende además de **spec 008 (Customers)** implementada
— `Contact.customerId` es una FK obligatoria (RN-001, research.md #1).

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

Web app (monorepo ya existente, compartido con specs 004-008): `backend/src/`,
`backend/tests/`, `frontend/src/`, `frontend/tests/` — ver [plan.md](plan.md) § Project
Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear las tablas nuevas (`Contact`, `ContactHistory`), su enum, los
valores nuevos de `AuditLogAction`, el índice único parcial de contacto principal, y el
esqueleto del módulo `contacts`

- [x] T001 Agregar los modelos Prisma `Contact` y `ContactHistory`, enum `ContactStatus` (reutilizando `CustomerPriority` de spec 008 para `priority`), y los 7 valores nuevos de `AuditLogAction` en `backend/prisma/schema.prisma` (ver [data-model.md](data-model.md))
- [x] T002 Generar la migración de Prisma; agregar a mano en el `.sql` generado: `CREATE UNIQUE INDEX contacts_customer_primary_unique ON contacts (customer_id) WHERE is_primary = true;` (research.md #4) + índices GIN trigram sobre `primary_email`/`first_name`/`last_name`/`company`, índices GIN sobre `secondary_emails`/`secondary_phones`/`tags` (research.md #8); aplicar contra `velo-test-db`
- [x] T003 [P] Crear el esqueleto del módulo NestJS `contacts` (carpetas `domain/`, `infrastructure/`, `application/`, `api/`) en `backend/src/modules/contacts/`
- [x] T004 [P] Registrar `ContactsModule` en `AppModule`, importando `IdentityModule`/`OrganizationsModule`/`RolesModule` y **`CustomersModule`** (spec 008, por `CustomerRepository` — primera dependencia dura entre dos módulos de la Fase 2, ver plan.md § Structure Decision)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida por las 5 historias de esta spec

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase

- [x] T005 [P] Crear `ContactRepository` (CRUD + `findByCustomerId`, `search`, `unsetPrimaryForCustomer`; todas las queries filtran por `organizationId`) en `backend/src/modules/contacts/infrastructure/contact.repository.ts`
- [x] T006 [P] Crear `ContactHistoryRepository` (`append`, `findByContactId`, `reparent`) en `backend/src/modules/contacts/infrastructure/contact-history.repository.ts`
- [x] T007 [P] Definir errores de dominio (`ContactNotFoundError`, `CustomerNotFoundForContactError`, `ContactMergedError`, `ContactStaleUpdateError`, `ContactCustomerMismatchError`) en `backend/src/modules/contacts/domain/errors.ts`
- [x] T008 Crear `ContactsExceptionsFilter` (mismo patrón que specs 004-008) en `backend/src/modules/contacts/api/contacts-exceptions.filter.ts`, registrarlo en `main.ts` y `backend/tests/test-app.ts`
- [x] T009 Confirmar que `CustomersModule` exporta `CustomerRepository` (spec 008 T009) e inyectarlo en `ContactsModule` para validar `customerId` al crear/transferir Contacts (research.md #1)

**Checkpoint**: Foundation lista — las historias de usuario pueden empezar

---

## Phase 3: User Story 1 - Alta y edición de Contacts (Priority: P1) 🎯 MVP

**Goal**: Un usuario comercial puede crear, editar y archivar Contacts asociados a un
Customer existente, sin excepción (RN-001).

**Independent Test**: Ver [quickstart.md](quickstart.md) — crear un Contact para un
Customer, editarlo, archivarlo.

### Tests for User Story 1

- [x] T010 [P] [US1] Integration test: crear un Contact vinculado a un Customer existente lo deja creado y asociado exclusivamente a ese Customer (Acceptance Scenario 1) en `backend/tests/integration/contacts-create.spec.ts`
- [x] T011 [P] [US1] Integration test: editar un Contact guarda los cambios y conserva el valor anterior en `ContactHistory` (Acceptance Scenario 2) en `backend/tests/integration/contacts-update.spec.ts`
- [x] T012 [P] [US1] Integration test: archivar un Contact lo pasa a `archived` sin eliminarlo físicamente ni perder su historial (Acceptance Scenario 3) en `backend/tests/integration/contacts-archive.spec.ts`
- [x] T013 [P] [US1] Integration test: dos Organizations distintas no pueden ver ni modificar los Contacts de la otra (Acceptance Scenario 4, FR-017) en `backend/tests/integration/contacts-cross-org.spec.ts`
- [x] T014 [P] [US1] Integration test: crear un Contact sin `customerId` se rechaza (RN-001, FR-002) en `backend/tests/integration/contacts-requires-customer.spec.ts`
- [x] T015 [P] [US1] Integration test: editar con un `version` desactualizado se rechaza con 409 (Edge Case, research.md #8) en `backend/tests/integration/contacts-stale-update.spec.ts`

### Implementation for User Story 1

- [x] T016 [US1] Implementar `CreateContactUseCase` (valida que `customerId` exista vía `CustomerRepository`, denormaliza `company` desde `Customer.name`, publica `ContactCreated`) en `backend/src/modules/contacts/application/create-contact.use-case.ts` (depende de T005, T009)
- [x] T017 [US1] Implementar `UpdateContactUseCase` (chequeo de `version`, escribe diff en `ContactHistory`, publica `ContactUpdated`) en `backend/src/modules/contacts/application/update-contact.use-case.ts` (depende de T005, T006)
- [x] T018 [US1] Implementar `GetContactUseCase` (lanza `ContactMergedError(survivorId)` si `mergedIntoContactId` no es null) en `backend/src/modules/contacts/application/get-contact.use-case.ts` (depende de T005)
- [x] T019 [US1] Implementar `ArchiveContactUseCase` y `RestoreContactUseCase` en `backend/src/modules/contacts/application/archive-contact.use-case.ts` y `restore-contact.use-case.ts` (depende de T005)
- [x] T020 [US1] Crear `ContactsController` con `POST /organizations/:id/customers/:customerId/contacts`, `GET/PATCH /organizations/:id/contacts/:contactId`, `POST .../archive|restore`, `TenantContextGuard` a nivel de clase + `@RequirePermission('contact.*')` por método en `backend/src/modules/contacts/api/contacts.controller.ts` (depende de T016-T019)
- [x] T021 [P] [US1] Crear servicio de API del frontend en `frontend/src/services/contacts-api.ts`
- [x] T022 [P] [US1] Construir `frontend/src/features/contacts/ContactForm.tsx` y `ContactDetail.tsx` (con acciones de archivar/restaurar)

**Checkpoint**: User Story 1 funciona de forma independiente — este es el MVP de esta
spec

---

## Phase 4: User Story 2 - Definir el contacto principal de un Customer (Priority: P2)

**Goal**: Un usuario comercial puede marcar un Contact como principal de su Customer,
garantizando que nunca haya dos a la vez.

**Independent Test**: Con dos Contacts del mismo Customer, marcar uno como principal y
verificar que el sistema impide tener dos a la vez.

### Tests for User Story 2

- [x] T023 [P] [US2] Integration test: marcar un Contact como principal lo identifica como tal en la ficha del Customer (Acceptance Scenario 1) en `backend/tests/integration/contacts-set-primary.spec.ts`
- [x] T024 [P] [US2] Integration test: marcar un segundo Contact como principal desmarca automáticamente al anterior en la misma transacción, nunca dos a la vez (Acceptance Scenario 2, SC-004) en `backend/tests/integration/contacts-primary-unique.spec.ts`
- [x] T025 [P] [US2] Integration test: un Customer sin ningún Contact marcado como principal lo indica explícitamente al consultarlo (Acceptance Scenario 3) en `backend/tests/integration/contacts-no-primary.spec.ts`

### Implementation for User Story 2

- [x] T026 [US2] Implementar `SetPrimaryContactUseCase` (transacción: `unsetPrimaryForCustomer` + `update` del objetivo, publica `ContactPrimaryChanged` — research.md #4) en `backend/src/modules/contacts/application/set-primary-contact.use-case.ts` (depende de T005)
- [x] T027 [US2] Agregar `POST /organizations/:id/contacts/:contactId/set-primary` a `ContactsController` (depende de T026)
- [x] T028 [P] [US2] Agregar la acción "marcar como principal" en `ContactDetail.tsx` y mostrar el indicador en la lista de Contacts de un Customer

**Checkpoint**: User Stories 1-2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Búsqueda y filtrado de Contacts (Priority: P3)

**Goal**: Un usuario comercial puede buscar Contacts por nombre, email, teléfono,
cargo, empresa, ciudad o etiquetas.

**Independent Test**: Con varios Contacts cargados en distintos Customers, buscar por
distintos atributos y verificar resultados correctos.

### Tests for User Story 3

- [x] T029 [P] [US3] Integration test: búsqueda por nombre/apellido/email/teléfono/whatsapp/cargo/empresa/ciudad/etiquetas devuelve coincidencias (Acceptance Scenario 1, SC-001) en `backend/tests/integration/contacts-search.spec.ts`
- [x] T030 [P] [US3] Integration test: un Contact con múltiples emails o teléfonos aparece al buscar por cualquiera de ellos (Acceptance Scenario 2) en `backend/tests/integration/contacts-search-multi-channel.spec.ts`

### Implementation for User Story 3

- [x] T031 [US3] Implementar `SearchContactsUseCase` (query params → `ContactRepository.search`, OR entre campo principal e índice GIN de secundarios — research.md #3, #8) en `backend/src/modules/contacts/application/search-contacts.use-case.ts` (depende de T005)
- [x] T032 [US3] Agregar `GET /organizations/:id/contacts` a `ContactsController` (depende de T031)
- [x] T033 [P] [US3] Construir `frontend/src/features/contacts/ContactsList.tsx`

**Checkpoint**: User Stories 1-3 funcionan de forma independiente

---

## Phase 6: User Story 4 - Línea de tiempo unificada de un Contact (Priority: P4)

**Goal**: Un usuario comercial puede ver el historial unificado de interacciones de un
Contact en orden cronológico.

**Independent Test**: Con un Contact con modificaciones, consultar su línea de tiempo.

### Tests for User Story 4

- [x] T034 [P] [US4] Integration test: la línea de tiempo muestra creación + ediciones + cambios de principal/Customer en orden cronológico (Acceptance Scenario 1) en `backend/tests/integration/contacts-timeline.spec.ts`
- [x] T035 [P] [US4] Integration test: un Contact sin eventos más allá de su creación muestra únicamente ese evento (Acceptance Scenario 2) en `backend/tests/integration/contacts-timeline-empty.spec.ts`

### Implementation for User Story 4

- [x] T036 [US4] Implementar `GetContactTimelineUseCase` (combina `ContactHistory` + `AuditLog` filtrado por `contactId` — research.md #7) en `backend/src/modules/contacts/application/get-contact-timeline.use-case.ts` (depende de T005, T006)
- [x] T037 [US4] Agregar `GET /organizations/:id/contacts/:contactId/timeline` a `ContactsController` (depende de T036)
- [x] T038 [P] [US4] Construir `frontend/src/features/contacts/ContactTimeline.tsx`

**Checkpoint**: User Stories 1-4 funcionan de forma independiente

---

## Phase 7: User Story 5 - Transferir contacto y fusionar duplicados (Priority: P5)

**Goal**: Un Administrador puede transferir un Contact a otro Customer y fusionar
Contacts duplicados del mismo Customer.

**Independent Test**: Transferir un Contact a otro Customer conservando su historial;
fusionar dos Contacts duplicados del mismo Customer.

### Tests for User Story 5

- [x] T039 [P] [US5] Integration test: transferir un Contact a otro Customer conserva su historial previo y fuerza `isPrimary = false` (Acceptance Scenario 1, research.md #5) en `backend/tests/integration/contacts-transfer.spec.ts`
- [x] T040 [P] [US5] Integration test: fusionar dos Contacts del mismo Customer conserva un único Contact con historial combinado (Acceptance Scenario 2) en `backend/tests/integration/contacts-merge.spec.ts`
- [x] T041 [P] [US5] Integration test: fusionar dos Contacts de Customers distintos se rechaza (Edge Case, research.md #6) en `backend/tests/integration/contacts-merge-different-customer.spec.ts`

### Implementation for User Story 5

- [x] T042 [US5] Implementar `TransferContactUseCase` (valida `toCustomerId` vía `CustomerRepository`, reasigna `customerId`, fuerza `isPrimary = false`, publica `ContactCustomerChanged`) en `backend/src/modules/contacts/application/transfer-contact.use-case.ts` (depende de T005, T009)
- [x] T043 [US5] Implementar `MergeContactsUseCase` (valida `a.customerId === b.customerId`, re-parenta `ContactHistory`, setea `mergedIntoContactId`, publica `ContactMerged`) en `backend/src/modules/contacts/application/merge-contacts.use-case.ts` (depende de T005, T006)
- [x] T044 [US5] Agregar `POST /organizations/:id/contacts/:contactId/transfer` y `POST /organizations/:id/contacts/merge` a `ContactsController` (depende de T042, T043)
- [x] T045 [P] [US5] Construir `frontend/src/features/contacts/TransferOrMergeContact.tsx`

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a todas las historias

- [x] T046 [P] E2E test del flujo completo de quickstart.md en `backend/tests/e2e/contacts/quickstart.spec.ts`
- [x] T047 Revisión de hardening de seguridad: aislamiento por `organizationId`, ausencia de ruta de eliminación física, y el índice único parcial de contacto principal (research.md #4) sostiene el invariante bajo `set-primary` concurrentes
- [x] T048 [P] Actualizar estado de la Fase 2 (módulo Contacts) en `docs/implementation-plan.md`
- [x] T049 Ejecutar la validación manual de `quickstart.md` de punta a punta
- [x] T050 Confirmar que los tests de specs 004-008 siguen pasando sin modificaciones

> **Resultado T047 (revisión de seguridad)**: sin hallazgos explotables. Verificado
> específicamente: (1) `ContactRepository.findById`/`update`/`updateWithVersionCheck`
> filtran por `organizationId` en la query misma, mismo patrón que
> `CustomerRepository` (spec 008); (2) los `findUniqueOrThrow`/`update` por id bare
> (dentro de `updateWithVersionCheck`, `update` y el segundo paso de la transacción de
> `setPrimary`) solo se alcanzan después de resolver el `contactId` vía `findById`
> scoped por `organizationId` en el use case llamante, o de un `updateMany` scoped
> previo — nunca un id sin validar; (3) no existe ninguna ruta `DELETE` para
> `Contact`; (4) `ValidationPipe({ whitelist: true })` descarta cualquier intento de
> inyectar `organizationId`/`mergedIntoContactId`/`version`/`status`/`isPrimary` vía
> `CreateContactDto` (no declarados en el DTO); (5) el invariante "a lo sumo un
> Contact principal por Customer" (SC-004) lo garantiza el índice único parcial de
> Postgres (`contacts_customer_primary_unique`), no solo la transacción de
> `setPrimary` — si dos requests concurrentes de `set-primary` sobre Contacts
> distintos del mismo Customer se ejecutaran a la vez, el segundo `UPDATE` que
> intente dejar `isPrimary = true` en una segunda fila mientras la primera transacción
> no cerró violaría el índice antes de poder commitear una segunda fila con
> `isPrimary = true` simultánea; (6) `CustomerNotFoundForContactError` impide crear o
> transferir un Contact hacia un `customerId` de otra Organization (validado vía
> `CustomerRepository.findById` scoped); (7) sin secretos ni credenciales nuevas.
>
> **Resultado T049**: cubierto por el E2E de T046
> (`backend/tests/e2e/contacts/quickstart.spec.ts`).
>
> **Resultado T050**: confirmado — 134 tests totales pasando (117 preexistentes de
> specs 004-008 + 17 nuevos de esta spec), sin ninguna modificación a los tests
> existentes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: depende de que **spec 008 (Customers) esté implementada** —
  `CustomerRepository` debe existir y estar exportado (research.md #1)
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-7)**: todas dependen de Foundational
- **Polish (Phase 8)**: depende de las historias que se quieran completar

### User Story Dependencies

- **US1 (P1)**: sin dependencias de otras historias de esta spec (sí de spec 008
  completa) — es el MVP
- **US2 (P2)**: reutiliza `ContactRepository` de Foundational; independiente
- **US3 (P3)**: reutiliza `ContactRepository`/índices de Foundational
- **US4 (P4)**: reutiliza `ContactHistoryRepository` + `AuditLogPublisher`
- **US5 (P5)**: reutiliza `CustomerRepository` (transferencia) y `ContactHistoryRepository`
  (fusión) de Foundational

### Within Each User Story

- Tests antes que implementación
- Repositories antes que Use Cases
- Use Cases antes que Controller
- Backend antes que integración de frontend

### Parallel Opportunities

- Todas las tareas [P] de Setup y Foundational en paralelo entre sí
- Una vez completado Foundational, US1-US5 pueden trabajarse en paralelo por distintos
  desarrolladores
- Dentro de cada historia, los tests marcados [P] en paralelo entre sí

---

## Parallel Example: User Story 1

```bash
# Lanzar todos los tests de la User Story 1 juntos:
Task: "Integration test crear Contact en backend/tests/integration/contacts-create.spec.ts"
Task: "Integration test editar Contact en backend/tests/integration/contacts-update.spec.ts"
Task: "Integration test archivar Contact en backend/tests/integration/contacts-archive.spec.ts"
Task: "Integration test aislamiento cross-org en backend/tests/integration/contacts-cross-org.spec.ts"
Task: "Integration test Contact requiere Customer en backend/tests/integration/contacts-requires-customer.spec.ts"
Task: "Integration test stale update en backend/tests/integration/contacts-stale-update.spec.ts"

# Lanzar los repositories de Foundational juntos:
Task: "ContactRepository en backend/src/modules/contacts/infrastructure/contact.repository.ts"
Task: "ContactHistoryRepository en backend/src/modules/contacts/infrastructure/contact-history.repository.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (requiere spec 008 ya implementada)
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1
4. **STOP y VALIDAR**: probar User Story 1 de forma independiente (quickstart.md),
   confirmar que los tests de specs 004-008 siguen pasando (T050)
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
- **Regla especial de esta spec**: a diferencia de specs 004-008 (que solo dependían del
  core de plataforma), esta spec no puede empezar su Fase 1 sin que **spec 008
  (Customers)** esté implementada y su `CustomerRepository` exportado — es una
  dependencia real de código, no solo de spec
