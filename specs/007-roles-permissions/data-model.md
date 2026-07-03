# Data Model: Roles & Permissions (RBAC)

Dos tablas nuevas; ninguna tabla existente se modifica (ver [research.md](research.md)
#1). Sigue el lenguaje de [spec.md](spec.md) Key Entities.

## Role

Agrupa Permissions. Compartido (por defecto) o exclusivo de una Organization
(personalizado).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| organizationId | UUID \| null | `null` = rol por defecto, compartido (research.md #2); valor concreto = rol personalizado de esa Organization |
| name | string | único por `organizationId` (dos Organizations pueden tener cada una un rol personalizado llamado igual; ningún rol por defecto repite nombre) |
| isDefault | boolean | `true` para los 8 sembrados (Administrador, Gerente, Ventas, Soporte, Contabilidad, Inventario, RRHH, Lector) — **no** incluye "Propietario", que no es una fila (research.md #3) |
| inheritsFromRoleId | UUID \| null | rol por defecto del que parte un rol personalizado (FR-009); `null` si no hereda de ninguno |
| permissions | string[] | claves `recurso.acción` otorgadas directamente por este rol (sin incluir las heredadas, que se resuelven en tiempo de cálculo) |
| createdAt / updatedAt | datetime | |

**Reglas**:
- Un rol con `isDefault = true` no puede editarse ni eliminarse (FR-007).
- Un rol personalizado no puede eliminarse mientras tenga `RoleAssignment` activos
  (FR-008).
- Los permisos efectivos de un rol personalizado con `inheritsFromRoleId` = unión de
  `permissions` propios + `permissions` del rol heredado, salvo que el propio
  documente explícitamente una sobreescritura (research.md del edge case de herencia
  en spec.md — para esta fase, "sobreescribir" se limita a *agregar* permisos, no a
  *quitar* uno heredado; quitar un permiso heredado específico queda fuera de alcance
  de esta fase por no estar pedido por ningún Acceptance Scenario).

## RoleAssignment

Relación entre una Membership y un Role adicional (más allá del rol base
`Membership.role` — ver research.md #1).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| membershipId | UUID | FK → `Membership` (spec 005) |
| roleId | UUID | FK → `Role` |
| assignedByUserId | UUID | actor que hizo la asignación (para auditoría) |
| createdAt | datetime | |

**Reglas**:
- Único por (`membershipId`, `roleId`) — no se puede asignar el mismo Role dos veces a
  la misma Membership.
- Revocar = eliminar la fila (no hay soft-delete de asignaciones; el historial de
  asignación/revocación vive en el Audit Log, no en esta tabla).

## MembershipPermission

Permiso otorgado directamente a una Membership, por encima de sus Roles
(research.md #6 — requisito explícito de las Assumptions de spec.md).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| membershipId | UUID | FK → `Membership` (spec 005) |
| permission | string | clave `recurso.acción` del catálogo |
| grantedByUserId | UUID | actor que otorgó el permiso (para auditoría) |
| createdAt | datetime | |

**Reglas**: único por (`membershipId`, `permission`). Sujeto al mismo chequeo
anti-escalamiento que `RoleAssignment` (research.md #4): el actor debe poseer él mismo
el permiso que otorga, salvo que sea Propietario.

## Permission (no es una tabla)

Catálogo estático en código
(`backend/src/modules/roles/infrastructure/permission-catalog.ts`), no persistido —
ver research.md #5. Cada entrada:

| Campo | Tipo | Notas |
|---|---|---|
| key | string | `recurso.acción`, ej. `customer.read`, `role.manage` |
| module | string \| null | módulo de spec 005 al que pertenece (`crm`, `agenda`, `facturacion`, `inventario`, `rrhh`, `automatizaciones`); `null` para permisos de plataforma (`organization.manage`, `user.manage`, `role.manage`) que no dependen de ningún módulo |

## Referencias a otros bounded contexts

- **Membership** (`organizations`, spec 005): rol base sin cambios; esta feature solo
  agrega roles adicionales vía `RoleAssignment`, referenciando `Membership.id`.
- **Organization** (`organizations`, spec 005): `Role.organizationId` referencia sus
  filas para roles personalizados; `Organization.enabledModules` determina qué
  Permissions están disponibles para asignar (FR-010).
- **AuditLog** (`organizations`, spec 005): esta feature publica en él (creación/
  edición/eliminación de roles, asignación/revocación, `PermissionDenied`); no define
  un log propio.

## Diagrama de relaciones

```text
Organization (0..1) ── (0..N) Role                [organizationId null = por defecto, compartido]
Role (0..1) ── (0..N) Role                          [inheritsFromRoleId, solo entre personalizado → por defecto]
Membership (1) ── (0..N) RoleAssignment ── (N..1) Role
Membership (1) ── (0..N) MembershipPermission       [permisos directos, sin Role intermedio]
```
