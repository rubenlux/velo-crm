# Quickstart: Gestión de Prospectos (Leads)

Guía manual para validar US1 (alta/calificación) y US3 (conversión) una vez implementado
el módulo `leads`, sin depender de seguimiento comercial completo, pérdida/reactivación
o búsqueda avanzada (US2, US4, US5).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible (`velo-test-db`),
  migraciones de Prisma aplicadas, incluida la tabla `Opportunity` mínima
  (research.md #10).
- Una Organization con Propietario y un User `Ventas` (tiene `lead.create`/
  `lead.read`/`lead.update` por defecto).

## Escenario: alta y calificación (US1)

1. Como `Ventas`, `POST /organizations/:id/leads` con `name`, `company`, `email`,
   `phone` y `source: "SitioWeb"`.
   - **Verificar**: 201, el Lead queda en `status = Nuevo` (Acceptance Scenario 1).
2. `PATCH /organizations/:id/leads/:leadId` con `status: "Contactado"`, con el
   `version` recibido.
   - **Verificar**: 200; el Audit Log registra `LeadStatusChanged`
     (Acceptance Scenario 2).
3. `PATCH /organizations/:id/leads/:leadId` con `status: "Calificado"` y `score: 75`.
   - **Verificar**: 200, `score` actualizado (Acceptance Scenario 3).
4. Crear un Lead sin `ownerUserId`; luego, como Administrador,
   `PATCH /organizations/:id/leads/:leadId` con `ownerUserId` del `Ventas`.
   - **Verificar**: el Lead aparece en `GET /organizations/:id/leads?ownerUserId=...`
     para ese responsable (Acceptance Scenario 4).

## Escenario: conversión (US3)

5. Con el Lead `Calificado` del paso 3,
   `POST /organizations/:id/leads/:leadId/convert`.
   - **Verificar**: 201; se crean un Customer, un Contact principal (vinculado a ese
     Customer) y una Opportunity (`state: Abierta`, `stage: Nueva`, `leadId` apuntando
     al Lead); el Lead pasa a `status = Convertido` con `convertedCustomerId`/
     `convertedContactId`/`convertedOpportunityId` poblados (Acceptance Scenario 1).
6. `GET /organizations/:id/leads/:leadId`.
   - **Verificar**: `status = Convertido`, la línea de tiempo conserva todo el
     historial previo (Acceptance Scenario 2).
7. Repetir `POST .../convert` sobre el mismo Lead.
   - **Verificar**: 409 `LeadAlreadyConvertedError`, sin crear un segundo Customer/
     Contact/Opportunity (Acceptance Scenario 3, FR-011).
8. Crear un segundo Lead con el mismo `email` que un Customer ya existente, calificarlo
   y convertirlo sin `linkToExistingCustomerId`.
   - **Verificar**: 409 `LeadDuplicateWarning` listando el Customer candidato, sin
     crear nada; reintentar con `linkToExistingCustomerId` vincula al existente en vez
     de duplicar (edge case de spec.md).

## Validación del Audit Log (FR-016, SC-005)

9. `GET /organizations/:id/audit-log` tras los pasos 1, 2, 3 y 5.
   - **Verificar**: aparecen `LeadCreated`, `LeadStatusChanged` (x2, pasos 2 y 3) y
     `LeadConverted` con actor y timestamp correctos.

Este flujo cubre US1 y US3 (P1, P3). US2 (notas/próxima acción/adjuntos, sin el
registro de actividades tipo llamada/reunión/email — diferido a spec 012,
research.md #9), US4 (marcar perdido y reactivar, incluida la restauración de
`statusBeforeLost` de research.md #12) y US5 (búsqueda <300ms, timeline completa e
importación por lote) se validan por separado siguiendo el mismo patrón, una vez esas
historias estén implementadas.
