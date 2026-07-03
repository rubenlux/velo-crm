# API Contract: Roles & Permissions (RBAC)

API REST expuesta por el módulo `roles` (NestJS). El frontend React consume
exactamente estos mismos endpoints (Constitución, Principio VI). Todas las rutas viven
bajo `/organizations/:organizationId/...` y exigen `Authorization: Bearer
<access-token>` (global) + `X-Organization-Id` validado por `TenantContextGuard`
(spec 005), igual que el resto de rutas anidadas bajo una Organization.

## Catálogo y disponibilidad (US4 → FR-010)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/organizations/:id/permissions/catalog` | Lista los Permissions disponibles para asignar en roles nuevos/editados de esta Organization, filtrados por los módulos habilitados en su plan. |

## Roles (US3 → FR-006, FR-007, FR-008, FR-009)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/organizations/:id/roles` | Lista los roles disponibles para esta Organization: los 8 por defecto + los personalizados propios. |
| POST | `/organizations/:id/roles` | Crea un rol personalizado (nombre, permisos, `inheritsFromRoleId` opcional). Requiere `role.manage`. |
| PATCH | `/organizations/:id/roles/:roleId` | Edita un rol personalizado. Rechaza si `roleId` es un rol por defecto (FR-007). Requiere `role.manage`. |
| DELETE | `/organizations/:id/roles/:roleId` | Elimina un rol personalizado. Rechaza si es por defecto (FR-007) o si tiene Users asignados (FR-008). Requiere `role.manage`. |

## Asignación (US1 → FR-003, FR-004, FR-013)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/organizations/:id/members/:userId/roles` | Asigna un Role adicional (por defecto o personalizado) a la Membership de `userId`. Rechaza escalamiento de privilegios (FR-013). |
| DELETE | `/organizations/:id/members/:userId/roles/:roleId` | Revoca ese Role adicional de la Membership. |

## Permisos directos (US1 → Assumptions de spec.md, research.md #6)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/organizations/:id/members/:userId/permissions` | Otorga un Permission directamente a esa Membership, por encima de sus Roles. Rechaza escalamiento de privilegios (FR-013). |
| DELETE | `/organizations/:id/members/:userId/permissions/:permission` | Revoca ese Permission directo. |

## Permisos efectivos (US2 → FR-011)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/organizations/:id/members/:userId/effective-permissions` | Permisos acumulados (rol base + roles adicionales) de ese User en esta Organization. Un User puede consultar los suyos propios; consultar los de otro requiere `role.manage`. |

Todas las mutaciones (creación/edición/eliminación de roles, asignación/revocación)
quedan registradas en el Audit Log de la Organization (FR-014), consultable vía
`GET /organizations/:id/audit-log` (spec 005). Cualquier intento de acción sin el
Permission requerido queda registrado como `PermissionDenied` (Acceptance Scenario 4
de US1, SC-002).
