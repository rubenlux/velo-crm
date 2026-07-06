# Quickstart: Gestión de Oportunidades de Venta (Pipeline Comercial)

Guía manual para validar US1 (creación/movimiento en el pipeline) y US3 (cierre/
reapertura) una vez implementado el módulo `opportunities`, sin depender de
KPIs/forecast (US4) o búsqueda avanzada (US5).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible (`velo-test-db`),
  migraciones de Prisma aplicadas, incluidas las tablas `Pipeline`/`PipelineStage` y la
  reforma de `Opportunity` (research.md #1, #4).
- Una Organization con Propietario y un User `Ventas` (tiene `opportunity.create`/
  `opportunity.read`/`opportunity.update` por defecto, no `opportunity.manage_pipeline`
  ni `opportunity.edit_won`), y al menos un Customer ya creado (spec 008).

## Escenario: pipeline por defecto y alta de Oportunidad (US1)

1. Como `Ventas`, `GET /organizations/:id/pipelines` sin haber creado ninguno antes.
   - **Verificar**: 200, se creó perezosamente un Pipeline "Por defecto" con 8 etapas
     (Nueva, Calificada, Descubrimiento, Propuesta, Negociación, Cierre, Ganada,
     Perdida) — research.md #3.
2. `POST /organizations/:id/opportunities` con `customerId`, `name` y
   `ownerUserId`.
   - **Verificar**: 201, la Oportunidad queda en la etapa "Nueva" del Pipeline por
     defecto, `state = Abierta` (Acceptance Scenario 1).
3. `POST /organizations/:id/opportunities/:opportunityId/move-stage` con
   `{ stageId: <id de "Calificada"> }`.
   - **Verificar**: 200; `GET .../timeline` muestra el cambio de etapa con fecha y
     usuario (Acceptance Scenario 3).
4. Como Administrador, `PATCH /organizations/:id/pipelines/:pipelineId/stages/:stageId`
   renombrando "Descubrimiento" a "Diagnóstico".
   - **Verificar**: 200 (requiere `opportunity.manage_pipeline`, que `Ventas` no
     tiene — repetir el mismo request como `Ventas` debe dar 403); las Oportunidades
     nuevas creadas después usan el pipeline con el nombre actualizado
     (Acceptance Scenario 4).

## Escenario: valor, probabilidad y valor ponderado (US2)

5. `PATCH /organizations/:id/opportunities/:opportunityId` con `{ version,
   estimatedValue: 100000, probability: 40 }`.
   - **Verificar**: 200; `GET` de la misma Oportunidad devuelve `weightedValue: 40000`
     calculado (Acceptance Scenario 1, research.md #7).

## Escenario: cierre y reapertura (US3)

6. `POST /organizations/:id/opportunities/:opportunityId/lose`.
   - **Verificar**: 200, `state = Perdida`, se movió a la etapa "Perdida" del Pipeline,
     `stageBeforeLost` quedó guardado internamente (Acceptance Scenario 2).
7. `POST /organizations/:id/opportunities/:opportunityId/reopen`.
   - **Verificar**: 200, `state = Abierta`, volvió exactamente a la etapa en la que
     estaba antes de perderla (research.md #15, Acceptance Scenario 3).
8. Con una tercera Oportunidad, `POST .../win`.
   - **Verificar**: 200, `state = Ganada`; un intento posterior de `PATCH` como
     `Ventas` (sin `opportunity.edit_won`) responde 403 (RN-005, Acceptance
     Scenario 1).
9. `POST /organizations/:id/opportunities/:opportunityId/archive` sobre una Oportunidad
   `Abierta`, luego intentar `POST .../move-stage`.
   - **Verificar**: el `move-stage` se rechaza con 409 hasta ejecutar `POST
     .../restore` primero (Acceptance Scenario 4, RN-008).

## Validación del Audit Log (FR-016, SC-004)

10. `GET /organizations/:id/audit-log` tras los pasos 2, 3, 5, 6 y 7.
    - **Verificar**: aparecen `OpportunityCreated`, `OpportunityStageChanged`,
      `OpportunityValueChanged`, `OpportunityLost` y `OpportunityReopened` con actor y
      timestamp correctos.

Este flujo cubre US1, US2 y US3 (P1-P3). US4 (KPIs/forecast, agregación en vivo sobre
datos ya cargados) y US5 (búsqueda <300ms, timeline completa) se validan por separado
siguiendo el mismo patrón, una vez esas historias estén implementadas.
