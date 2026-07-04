# Quickstart: Gestión de Contactos (Contacts)

Guía manual para validar US1 (alta/edición/archivado) y US2 (contacto principal) una
vez implementado el módulo `contacts`, sin depender de búsqueda avanzada, timeline,
transferencia o fusión (US3-US5).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible (`velo-test-db`),
  migraciones de Prisma aplicadas, incluido el índice único parcial de contacto
  principal (research.md #4).
- Una Organization con Propietario, un User `Ventas` (tiene `contact.create`/
  `contact.read`/`contact.update` por defecto), y al menos un Customer ya creado
  (spec 008).

## Escenario: alta, edición y baja lógica (US1)

1. Como `Ventas`, `POST /organizations/:id/customers/:customerId/contacts` con
   `firstName`, `lastName`, `jobTitle` y `primaryEmail`.
   - **Verificar**: 201, el Contact queda vinculado exclusivamente a ese `customerId`
     (Acceptance Scenario 1).
2. `PATCH /organizations/:id/contacts/:contactId` cambiando `jobTitle`, con el
   `version` recibido.
   - **Verificar**: 200; `GET .../timeline` muestra el valor anterior del cargo
     (Acceptance Scenario 2).
3. `POST /organizations/:id/contacts/:contactId/archive`.
   - **Verificar**: `status = archived`, el Contact sigue accesible por `GET`
     (Acceptance Scenario 3, sin eliminación física).
4. Repetir el alta en una segunda Organization con un Customer propio.
   - **Verificar**: ninguna Organization ve los Contacts de la otra
     (Acceptance Scenario 4, FR-017).

## Escenario: contacto principal único (US2)

5. Crear un segundo Contact para el mismo Customer del paso 1.
   `POST /organizations/:id/contacts/:contactIdA/set-primary`.
   - **Verificar**: `contactIdA.isPrimary = true` (Acceptance Scenario 1).
6. `POST /organizations/:id/contacts/:contactIdB/set-primary` (el segundo Contact).
   - **Verificar**: `contactIdB.isPrimary = true` y `contactIdA.isPrimary` pasó a
     `false` automáticamente (Acceptance Scenario 2, SC-004: nunca dos principales a
     la vez).
7. `GET` del Customer sin ningún Contact marcado como principal (Customer distinto,
   recién creado con Contacts nuevos).
   - **Verificar**: la ficha indica explícitamente "sin contacto principal", no asume
     uno por defecto (Acceptance Scenario 3).

## Validación del Audit Log (FR-016, SC-003)

8. `GET /organizations/:id/audit-log` tras los pasos 1, 2, 3, 5 y 6.
   - **Verificar**: aparecen `ContactCreated`, `ContactUpdated`, `ContactArchived` y
     dos `ContactPrimaryChanged` con actor y timestamp correctos.

Este flujo cubre US1 y US2 completas (P1-P2). US3 (búsqueda <300ms), US4 (timeline con
eventos de otros módulos) y US5 (transferencia/fusión, incluida la validación de
"mismo Customer" de research.md #6) se validan por separado siguiendo el mismo patrón,
una vez esas historias estén implementadas.
