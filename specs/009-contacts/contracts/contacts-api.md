# API Contract: Gestión de Contactos (Contacts)

API REST expuesta por el módulo `contacts` (NestJS). El frontend React consume
exactamente estos mismos endpoints (Constitución, Principio VI). Todas las rutas viven
bajo `/organizations/:organizationId/...` y exigen `Authorization: Bearer
<access-token>` (global) + `X-Organization-Id` (`TenantContextGuard`, spec 005) +
`@RequirePermission(...)` indicado (`PermissionsGuard`, spec 007).

## Alta y edición (US1 → FR-001, FR-002, FR-009, FR-012)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/customers/:customerId/contacts` | `contact.create` | Crea un Contact vinculado a `customerId` (RN-001: siempre bajo un Customer, nunca standalone). |
| GET | `/organizations/:id/contacts/:contactId` | `contact.read` | Obtiene un Contact. Responde 409 `ContactMergedError` con `survivorContactId` si fue descartado en una fusión. |
| PATCH | `/organizations/:id/contacts/:contactId` | `contact.update` | Edita campos. Exige `version` (research.md #8); 409 `ContactStaleUpdateError` si no coincide. |
| POST | `/organizations/:id/contacts/:contactId/archive` | `contact.update` | `status → archived` (baja lógica, sin eliminación física). |
| POST | `/organizations/:id/contacts/:contactId/restore` | `contact.update` | `status → active`. |

## Contacto principal (US2 → FR-003, FR-004)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/contacts/:contactId/set-primary` | `contact.update` | Marca este Contact como principal de su Customer; desmarca automáticamente el anterior en la misma transacción (research.md #4). |

## Búsqueda (US3 → FR-014)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/contacts` | `contact.read` | Lista/busca Contacts con query params: `q` (nombre/apellido/email/teléfono/whatsapp/cargo/empresa/ciudad), `customerId`, `status`, `tag`, `ownerUserId`, paginado. Responde en <300ms (SC-001). |

## Línea de tiempo (US4 → FR-015)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/contacts/:contactId/timeline` | `contact.read` | Eventos combinados de `ContactHistory` + `AuditLog` de ese Contact, orden cronológico (research.md #7). |

## Transferencia y fusión (US5 → FR-010, FR-013)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/contacts/:contactId/transfer` | `contact.update` | Body: `{ toCustomerId }`. Reasigna `customerId`, fuerza `isPrimary = false` (research.md #5). |
| POST | `/organizations/:id/contacts/merge` | `contact.delete` | Body: `{ survivorContactId, discardedContactId }`. Rechaza si no pertenecen al mismo Customer (research.md #6, edge case). |

Todas las mutaciones (creación, edición, cambio de Customer, cambio de principal,
archivado, restauración, fusión) quedan registradas en el Audit Log (FR-016), ver
`AuditLogAction` nuevos en data-model.md.
