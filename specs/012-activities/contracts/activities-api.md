# API Contract: Gestión de Actividades

API REST expuesta por el módulo `activities` (NestJS). El frontend React consume
exactamente estos mismos endpoints (Constitución, Principio VI). Todas las rutas viven
bajo `/organizations/:organizationId/...` y exigen `Authorization: Bearer
<access-token>` (global) + `X-Organization-Id` (`TenantContextGuard`, spec 005) +
`@RequirePermission(...)` indicado (`PermissionsGuard`, spec 007).

## Tipos de Activity (US1 → FR-010)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/activity-types` | `activity.read` | Lista los tipos disponibles: los 12 por defecto (compartidos, `organizationId = null`) + los custom de esta Organization. |
| POST | `/organizations/:id/activity-types` | `activity.manage_types` | Crea un tipo custom para esta Organization (research.md #4). |

## Alta y gestión de Activities (US1 → FR-001, FR-002, FR-003, FR-011a)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/activities` | `activity.create` | Crea una Activity (`activityTypeId`, `title`, `scheduledAt`, y al menos uno de `customerId`/`contactId`/`leadId`/`opportunityId`). Rechaza con 400 si ninguna relación fue provista, o si las provistas no remiten al mismo Customer (research.md #1, #2). Queda en `Pendiente`. Genera `ActivityCreated`. |
| GET | `/organizations/:id/activities/:activityId` | `activity.read` | Obtiene una Activity. |
| PATCH | `/organizations/:id/activities/:activityId` | `activity.update` | Edita campos (título, descripción, `scheduledAt`, duración, prioridad, responsable, participantes, tags, `status` — transición libre entre `Pendiente`/`EnProceso`/`Finalizada`, puebla/limpia `finishedAt`, ver research.md #7 —, `result` — solo si `status = Finalizada`, rechaza con 409 si no, research.md #12). Exige `version`; 409 si no coincide. Cambio de `ownerUserId` genera `ActivityOwnerChanged`; cambio de `status` genera `ActivityStatusChanged`; `result` genera `ActivityResultRecorded`; el resto, `ActivityUpdated`. |
| POST | `/organizations/:id/activities/:activityId/cancel` | `activity.update` | Guarda `statusBeforeCancel`, `status → Cancelada`. Genera `ActivityCancelled`. |
| POST | `/organizations/:id/activities/:activityId/reactivate` | `activity.update` | Solo si `status = Cancelada`: restaura `status = statusBeforeCancel` (o `Pendiente` si no había ninguno registrado). Rechaza con 409 si no está `Cancelada`. Genera `ActivityReactivated`. |

## Próxima actividad programada (US2 → FR-007)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/activities/:activityId/schedule-follow-up` | `activity.update` | Crea una nueva Activity `Pendiente` heredando `customerId`/`contactId`/`leadId`/`opportunityId` de la Activity origen (`:activityId`), con `originActivityId` apuntando a ella (research.md #11). Body: los mismos campos que POST `/activities` salvo las relaciones (heredadas, no reemplazables). Genera `ActivityFollowUpScheduled`. |

Registrar el resultado de una Activity (US2 → FR-006) se cubre con el `PATCH` de
arriba (`result`) — sin endpoint adicional.

## Adjuntos y comentarios internos (US3 → FR-004, FR-005, FR-005a)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/activities/:activityId/attachments` | `activity.read` | Lista adjuntos. |
| POST | `/organizations/:id/activities/:activityId/attachments` | `activity.update` | Adjunta un archivo (`fileName`, `fileUrl` — referencia externa, research.md #10). Genera `ActivityAttachmentAdded`. |
| GET | `/organizations/:id/activities/:activityId/comments` | `activity.read` | Lista comentarios internos. |
| POST | `/organizations/:id/activities/:activityId/comments` | `activity.update` | Agrega un comentario (`body`). Genera `ActivityCommentAdded`. |
| PATCH | `/organizations/:id/activities/:activityId/comments/:commentId` | `activity.update` | Edita un comentario propio. Rechaza con 403 si el actor no es su autor (research.md #9). Genera `ActivityCommentUpdated`. |
| DELETE | `/organizations/:id/activities/:activityId/comments/:commentId` | `activity.update` | Elimina un comentario propio. Rechaza con 403 si el actor no es su autor. Genera `ActivityCommentDeleted`. |

## Búsqueda y línea de tiempo (US5 → FR-008, FR-009)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/activities` | `activity.read` | Lista/busca Activities con query params: `q` (título), `customerId`, `contactId`, `leadId`, `opportunityId`, `ownerUserId`, `activityTypeId`, `status`, `priority`, `tag`, paginado. Responde en <300ms (SC-002). **Reutilizado por el frontend de Customer/Contact/Lead/Opportunity** para componer su propia línea de tiempo (research.md #13) — filtrando por el id correspondiente. |
| GET | `/organizations/:id/activities/:activityId/timeline` | `activity.read` | Eventos combinados de `ActivityHistory` + `AuditLog` de esa Activity, orden cronológico (research.md #14) — historial de la Activity misma, no a confundir con lo anterior. |

Todas las mutaciones (creación, edición, cambio de estado, cancelación,
reactivación, resultado, próxima actividad, comentarios, adjuntos) quedan
registradas en el Audit Log (FR-012), ver `AuditLogAction` nuevos en data-model.md.
