# API Contract: Gestión de Customers (Clientes)

API REST expuesta por el módulo `customers` (NestJS). El frontend React consume
exactamente estos mismos endpoints (Constitución, Principio VI). Todas las rutas viven
bajo `/organizations/:organizationId/customers...` y exigen `Authorization: Bearer
<access-token>` (global) + `X-Organization-Id` validado por `TenantContextGuard`
(spec 005) + el `@RequirePermission(...)` indicado (`PermissionsGuard`, spec 007),
igual que el resto de rutas anidadas bajo una Organization.

## Alta y edición (US1 → FR-001, FR-002, FR-003, FR-004, FR-005)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/customers` | `customer.create` | Crea un Customer. Rechaza si faltan campos obligatorios (FR-002) o si `taxId` ya existe en la Organization (RN-003). |
| GET | `/organizations/:id/customers/:customerId` | `customer.read` | Obtiene un Customer. Responde 409 `CustomerMergedError` con `survivorCustomerId` si fue descartado en una fusión (research.md #6). |
| PATCH | `/organizations/:id/customers/:customerId` | `customer.update` | Edita campos de un Customer. Exige `version` en el body (research.md #8); responde 409 `CustomerStaleUpdateError` si no coincide con la actual. Cada cambio queda en `CustomerHistory` (FR-004, FR-005). |

## Búsqueda y filtros (US2 → FR-006, FR-007, FR-008)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/customers` | `customer.read` | Lista/busca Customers con query params: `q` (nombre/razón social/CUIT/email/teléfono), `status`, `ownerUserId`, `city`, `state`, `country`, `category`, `tag`, `createdFrom`/`createdTo`, paginado. Responde en <300ms (SC-001) vía índices `pg_trgm`/GIN (research.md #9). |

## Baja lógica, archivado y restauración (US3 → FR-010, FR-011)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/customers/:customerId/archive` | `customer.update` | `status → archived` (RN-004). No elimina físicamente ni borra historial. |
| POST | `/organizations/:id/customers/:customerId/restore` | `customer.update` | `status → active`. |

`DELETE` físico de un Customer no existe como endpoint — no hay ruta que lo exponga
(FR-011, RN-004: solo baja lógica en toda esta fase).

## Línea de tiempo (US4 → FR-012)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| GET | `/organizations/:id/customers/:customerId/timeline` | `customer.read` | Eventos combinados de `CustomerHistory` + `AuditLog` de ese Customer, orden cronológico (research.md #5). Extensible por specs futuras (Contacts, Activities, Opportunities, Documentos, Cotizaciones, Facturas). |

## Fusión, exportar e importar (US5 → FR-013, FR-014)

| Método | Ruta | Permission | Descripción |
|---|---|---|---|
| POST | `/organizations/:id/customers/merge` | `customer.delete` | Body: `{ survivorCustomerId, discardedCustomerId }`. Fusiona: `CustomerHistory` del descartado se re-parenta al sobreviviente, el descartado queda con `mergedIntoCustomerId` seteado (research.md #6). |
| GET | `/organizations/:id/customers/export` | `customer.read` | Devuelve un CSV con los Customers de la Organization (filtros de US2 aplicables como query params) (research.md #7). |
| POST | `/organizations/:id/customers/import` | `customer.create` | Body: `{ csv: string }` (contenido CSV como texto, no multipart — payload chico y siempre UTF-8, mantiene el endpoint testeable con el mismo patrón JSON plano del resto de la API). Procesa fila por fila reutilizando la validación/unicidad de creación manual (FR-014); responde un resumen `{ created, rejected: [{ row, reason }] }` sin abortar el batch ante errores puntuales. |

Todas las mutaciones (creación, edición, archivado, restauración, fusión, importación,
exportación) quedan registradas en el Audit Log de la Organization (FR-015, spec 005),
consultable vía `GET /organizations/:id/audit-log` — ver data-model.md para los valores
nuevos de `AuditLogAction`.
