# API Contract: Gestión de Oportunidades de Venta (Pipeline Comercial)

API REST expuesta por el módulo `opportunities` (NestJS). El frontend React consume
exactamente estos mismos endpoints (Constitución, Principio VI). Todas las rutas viven
bajo `/organizations/:organizationId/...` y exigen `Authorization: Bearer
<access-token>` (global) + `X-Organization-Id` (`TenantContextGuard`, spec 005) +
`@RequirePermission(...)` indicado (`PermissionsGuard`, spec 007).

> **Nota de implementación**: `GET .../opportunities/kpis` y `GET
> .../opportunities/forecast` son rutas literales de la misma profundidad que `GET
> .../opportunities/:opportunityId` — deben registrarse **antes** que la ruta dinámica
> en el controller (mismo gotcha ya resuelto en `CustomersController` para
> `.../customers/export`, ver CLAUDE.md).

## Pipeline y etapas (US1 → FR-004)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/pipelines` | `opportunity.read` | Lista los Pipelines de la Organization con sus `PipelineStage` (orden incluido). Si no existe ninguno, `PipelineRepository.findOrCreateDefault` lo crea perezosamente (research.md #3) antes de responder. |
| POST | `/organizations/:id/pipelines` | `opportunity.manage_pipeline` | Crea un Pipeline adicional (Assumptions: una Organization puede tener más de uno). |
| POST | `/organizations/:id/pipelines/:pipelineId/stages` | `opportunity.manage_pipeline` | Agrega una `PipelineStage` (`name`, `order`, `isWonStage?`, `isLostStage?`). |
| PATCH | `/organizations/:id/pipelines/:pipelineId/stages/:stageId` | `opportunity.manage_pipeline` | Renombra/reordena una etapa o cambia sus flags `isWonStage`/`isLostStage`. |
| DELETE | `/organizations/:id/pipelines/:pipelineId/stages/:stageId` | `opportunity.manage_pipeline` | Elimina una etapa. Rechaza con 409 si tiene Oportunidades `Abierta` asignadas (research.md #11, edge case de spec.md). |

## Alta y gestión del pipeline de Oportunidades (US1 → FR-001, FR-002, FR-003, FR-005)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/opportunities` | `opportunity.create` | Crea una Oportunidad manual, asociada a un Customer existente. Si no se indica `pipelineId`/`stageId`, usa el Pipeline por defecto de la Organization (perezoso, research.md #3) en su primera etapa. |
| GET | `/organizations/:id/opportunities/:opportunityId` | `opportunity.read` | Obtiene una Oportunidad, con `stage`/`pipeline` expandidos (research.md #5) y `weightedValue` calculado (research.md #7). |
| PATCH | `/organizations/:id/opportunities/:opportunityId` | `opportunity.update` (o `opportunity.edit_won` si `state = Ganada`, RN-005) | Edita campos (nombre, responsable, `estimatedValue`, `probability`, `estimatedCloseDate`, `priority`, `competitor`, `notes`, `tags`). Exige `version`; 409 si no coincide. Cambios de `estimatedValue`/`probability` generan `OpportunityValueChanged`; cambio de `ownerUserId` genera `OpportunityOwnerChanged`; el resto, `OpportunityUpdated`. |
| POST | `/organizations/:id/opportunities/:opportunityId/move-stage` | `opportunity.update` | Body: `{ stageId }`. Mueve la Oportunidad a otra etapa del mismo Pipeline; si la etapa destino tiene `isWonStage`/`isLostStage`, dispara el cambio de `state` correspondiente (research.md #2, #15) — usado también internamente por `win`/`lose` de abajo. Genera `OpportunityStageChanged`. |

## Valor estimado, probabilidad y valor ponderado (US2 → FR-006, FR-007)

Cubierto por el `PATCH` de arriba (`estimatedValue`, `probability`) — sin endpoints
adicionales. `weightedValue` viaja calculado en toda respuesta que incluya una
Oportunidad completa (research.md #7).

## Cierre, reapertura y archivado (US3 → FR-009, FR-010, FR-011, FR-012)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/opportunities/:opportunityId/win` | `opportunity.update` | Mueve la Oportunidad a la etapa `isWonStage` de su Pipeline; `state → Ganada`. Genera `OpportunityWon`. |
| POST | `/organizations/:id/opportunities/:opportunityId/lose` | `opportunity.update` | Guarda `stageBeforeLost`, mueve a la etapa `isLostStage`; `state → Perdida`. Genera `OpportunityLost`. |
| POST | `/organizations/:id/opportunities/:opportunityId/reopen` | `opportunity.update` | Solo si `state = Perdida`: restaura `stageId = stageBeforeLost`, `state → Abierta`. Rechaza con 409 si no está `Perdida`. Genera `OpportunityReopened`. |
| POST | `/organizations/:id/opportunities/:opportunityId/archive` | `opportunity.update` | Guarda `stateBeforeArchive`, `state → Archivada` (no toca `stageId`, research.md #15). Genera `OpportunityArchived`. |
| POST | `/organizations/:id/opportunities/:opportunityId/restore` | `opportunity.update` | Restaura `state = stateBeforeArchive`, limpia el campo. Rechaza con 409 si no está `Archivada`. Genera `OpportunityRestored`. Requerido antes de cualquier `move-stage` sobre una Oportunidad archivada (RN-008, edge case de spec.md). |

Editar una Oportunidad con `state = Ganada` (incluye `win`/`lose`/`move-stage` sobre
ella) exige `opportunity.edit_won` en vez de `opportunity.update` (RN-005).

## KPIs y Forecast (US4 → FR-013, FR-014)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/opportunities/kpis` | `opportunity.read` | Valor total del pipeline, valor ponderado, cantidad abiertas/ganadas/perdidas, tasa de conversión, ticket promedio, tiempo promedio de cierre, rendimiento por vendedor y por etapa — agregación en vivo (research.md #13). |
| GET | `/organizations/:id/opportunities/forecast` | `opportunity.read` | Ventas estimadas del mes/trimestre/año y proyección por vendedor, basado en Oportunidades abiertas con `estimatedCloseDate` (excluye las que no la tienen, edge case de spec.md). |

## Búsqueda y línea de tiempo (US5 → FR-015)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/opportunities` | `opportunity.read` | Lista/busca Oportunidades con query params: `q` (nombre), `customerId`, `contactId`, `ownerUserId`, `stageId`, `state`, `priority`, `tag`, paginado. Responde en <300ms (SC-002). |
| GET | `/organizations/:id/opportunities/:opportunityId/timeline` | `opportunity.read` | Eventos combinados de `OpportunityHistory` + `AuditLog` de esa Oportunidad, orden cronológico (research.md #10). |

Todas las mutaciones (creación, edición, cambio de etapa, cambio de responsable,
cambio de valor/probabilidad, ganar, perder, reabrir, archivar, restaurar) quedan
registradas en el Audit Log (FR-016), ver `AuditLogAction` nuevos en data-model.md. La
configuración de `Pipeline`/`PipelineStage` **no** genera entradas de Audit Log
(research.md, nota de simplicidad — FR-016 solo enumera eventos de Opportunity).
