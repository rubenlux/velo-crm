# Quickstart: Gestión de Customers (Clientes)

Guía manual para validar la User Story 1 (alta/edición con prevención de duplicados)
una vez implementado el módulo `customers`, sin depender de búsqueda avanzada, archivado
o fusión (US2-US5).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible (`velo-test-db`) y
  migraciones de Prisma aplicadas (mismo entorno que specs 004-007), incluida la
  extensión `pg_trgm` (research.md #9).
- Una Organization ya creada (spec 005) con su Propietario, y un segundo User con
  Membership en ella con rol base `Ventas` (incluye `customer.create`/`customer.read`/
  `customer.update` por defecto, ver research.md #2).

## Escenario: alta, edición y prevención de duplicados (US1)

1. Como `Ventas`, `POST /organizations/:id/customers` con nombre, razón social y
   `taxId`.
   - **Verificar**: 201, el Customer aparece en `GET /organizations/:id/customers`
     (Acceptance Scenario 1).
2. `PATCH /organizations/:id/customers/:customerId` cambiando `phone`, enviando el
   `version` recibido en el paso 1.
   - **Verificar**: 200, `GET /organizations/:id/customers/:customerId/timeline`
     muestra una entrada de edición con el valor anterior del teléfono (Acceptance
     Scenario 2, FR-004/FR-005).
3. `POST /organizations/:id/customers` de nuevo con el **mismo** `taxId` en la misma
   Organization.
   - **Verificar**: rechazado (409/422), RN-003 (Acceptance Scenario 3).
4. Repetir el paso 3 pero en una **segunda** Organization distinta.
   - **Verificar**: aceptado (201) — la unicidad es por Organization, no global
     (Acceptance Scenario 4, RN-002).
5. `POST /organizations/:id/customers` sin `name` (campo obligatorio).
   - **Verificar**: rechazado (400) indicando el campo faltante (Acceptance Scenario 5).

## Validación de concurrencia optimista (Edge Case, research.md #8)

6. Cargar el mismo Customer en dos "sesiones" (dos `GET` obteniendo el mismo `version`).
   `PATCH` con la primera sesión (éxito, `version` incrementa). `PATCH` con la segunda
   sesión enviando el `version` viejo.
   - **Verificar**: la segunda edición es rechazada con 409
     `CustomerStaleUpdateError`, sin corromper el registro.

## Validación del Audit Log (FR-015, SC-003)

7. `GET /organizations/:id/audit-log` tras los pasos 1 y 2.
   - **Verificar**: aparecen `CustomerCreated` y `CustomerUpdated` con el actor y
     timestamp correctos.

Este flujo cubre US1 completa (P1) y sirve de base para los tests de integración/E2E
que se detallarán en `tasks.md` (`/speckit-tasks`). Los escenarios de US2 (búsqueda
<300ms), US3 (archivado/restauración), US4 (timeline con eventos de otros módulos) y
US5 (fusión/export/import) se validan por separado una vez esas historias estén
implementadas, siguiendo el mismo patrón.
