# API Contract: Gestión de Prospectos (Leads)

API REST expuesta por el módulo `leads` (NestJS). El frontend React consume exactamente
estos mismos endpoints (Constitución, Principio VI). Todas las rutas viven bajo
`/organizations/:organizationId/...` y exigen `Authorization: Bearer <access-token>`
(global) + `X-Organization-Id` (`TenantContextGuard`, spec 005) +
`@RequirePermission(...)` indicado (`PermissionsGuard`, spec 007).

## Alta, edición y calificación (US1 → FR-001, FR-003, FR-004, FR-009)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/leads` | `lead.create` | Crea un Lead en estado `Nuevo`. |
| GET | `/organizations/:id/leads/:leadId` | `lead.read` | Obtiene un Lead. |
| PATCH | `/organizations/:id/leads/:leadId` | `lead.update` | Edita campos (incluye `status`, `score`, `ownerUserId`, `nextActionAt`/`nextActionNote`). Exige `version` (research.md #15); 409 `LeadStaleUpdateError` si no coincide. Cambios de `status`/`ownerUserId` generan `LeadStatusChanged`/`LeadOwnerChanged` en el Audit Log en vez del genérico `LeadUpdated`. |

## Seguimiento comercial (US2 → FR-005, FR-006, FR-007, FR-008)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/leads/:leadId/notes` | `lead.update` | Body: `{ note }`. Agrega una `LeadNote` (research.md #6); sin límite de cantidad. |
| GET | `/organizations/:id/leads/:leadId/notes` | `lead.read` | Lista las notas del Lead. |
| POST | `/organizations/:id/leads/:leadId/attachments` | `lead.update` | Body: `{ fileName, fileUrl }`. Asocia una `LeadAttachment` (research.md #8, sin subida de archivo — `fileUrl` ya alojado). |
| GET | `/organizations/:id/leads/:leadId/attachments` | `lead.read` | Lista los adjuntos del Lead. |

> Nota: "registrar una actividad (llamada, reunión, email)" (Acceptance Scenario 1, US2)
> no tiene endpoint en esta spec — diferido a spec 012 (research.md #9).

## Conversión (US3 → FR-010, FR-011, FR-012)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/leads/:leadId/convert` | `lead.update` | Body opcional: `{ linkToExistingCustomerId?, linkToExistingContactId?, forceCreateNew? }`. Crea Customer + Contact principal + Opportunity (mínima, research.md #10) en una única transacción; marca el Lead `Convertido`. Rechaza con 409 `LeadAlreadyConvertedError` si ya estaba `Convertido`, o `LeadNotConvertibleError` si está `Perdido`/`Archivado` (research.md #11). Si detecta un Customer/Contact existente por email/teléfono y la solicitud no trae `linkToExistingCustomerId`/`linkToExistingContactId` ni `forceCreateNew: true`, responde 409 `LeadDuplicateWarning` con los candidatos encontrados, sin crear nada (edge case de spec.md). |

## Pérdida y reactivación (US4 → FR-013, FR-014)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/leads/:leadId/lose` | `lead.update` | `status → Perdido`, guarda `statusBeforeLost` (research.md #12). Genera `LeadLost`. |
| POST | `/organizations/:id/leads/:leadId/reactivate` | `lead.update` | Solo si `status = Perdido`: restaura `status = statusBeforeLost`, limpia `statusBeforeLost`. Rechaza con 409 si el Lead no está `Perdido` (por ejemplo, `Convertido`, terminal — edge case de spec.md). Genera `LeadReactivated`. |

`Archivado` (FR-004) no tiene una acción dedicada — se alcanza vía el `PATCH` genérico
de arriba (`status: "Archivado"`), como cualquier otro cambio de estado; ningún
Acceptance Scenario ejercita una transición especial hacia ese valor (research.md #13).

Sin endpoint de eliminación física en ningún estado (FR-014) — `lead.delete` no se usa
por esta spec (research.md #2).

## Búsqueda, línea de tiempo e importación (US5 → FR-002, FR-015)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/leads` | `lead.read` | Lista/busca Leads con query params: `q` (nombre/empresa/email/teléfono), `status`, `source`, `ownerUserId`, `tag`, `city`, paginado. Responde en <300ms (SC-002). |
| GET | `/organizations/:id/leads/:leadId/timeline` | `lead.read` | Eventos combinados de `LeadHistory` + `AuditLog` + `LeadNote` de ese Lead, orden cronológico (research.md #14). |
| POST | `/organizations/:id/leads/import` | `lead.create` | Body: CSV (multipart o texto, mismo formato que `customers/import`). Aplica las mismas validaciones que la creación manual fila por fila (research.md #16). |

Todas las mutaciones (creación, edición, cambio de responsable, cambio de estado,
conversión, pérdida, reactivación, archivado) quedan registradas en el Audit Log
(FR-016), ver `AuditLogAction` nuevos en data-model.md.
