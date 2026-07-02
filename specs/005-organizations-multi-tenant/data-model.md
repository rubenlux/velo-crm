# Data Model: Organizations (Multi-Tenant)

Entidades derivadas de [spec.md](spec.md) Key Entities, siguiendo el lenguaje ubicuo de
[Domain Model](../../docs/domain-model.md) y [Bounded Contexts](../../docs/bounded-contexts.md)
(bounded context **Organization**). Cierra la referencia pendiente que dejó
[specs/004-authentication-identity/data-model.md](../004-authentication-identity/data-model.md#referencias-a-otros-bounded-contexts)
sobre `Membership`.

## Organization

Empresa que usa VELO; contenedor aislado (tenant) de todos sus datos.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| name | string | |
| timezone | string | IANA tz (ej. `America/Argentina/Buenos_Aires`) |
| currency | string | ISO 4217 (ej. `ARS`, `USD`) |
| language | string | ISO 639-1 (ej. `es`, `en`) |
| logoUrl | string \| null | branding (US2) |
| customDomain | string \| null | único a nivel plataforma (FR-014) |
| taxSettings | JSON | tasas/reglas aplicables (uso efectivo diferido a la fase de Facturación) |
| enabledModules | string[] | módulos habilitados según plan (FR-007) |
| plan | enum(`Free`, `Pro`, `Enterprise`) | ver research.md #2 |
| status | enum(`active`, `suspended`) | FR-008/FR-009 |
| createdAt / updatedAt | datetime | |

**Reglas**:
- `customDomain` único entre todas las Organizations cuando no es null (FR-014).
- Al crear una Organization (FR-001), se crea junto con ella una `Membership` con rol
  `Propietario` para el User creador (FR-002), en la misma transacción.
- `status = suspended` bloquea toda operación tenant-scoped del `TenantContextGuard`
  salvo la propia consulta de estado (edge case de spec.md).

## Membership

Relación User–Organization con un rol. Ya estaba prevista (sin modelo propio) en
[specs/004-authentication-identity/data-model.md](../004-authentication-identity/data-model.md);
esta feature la define y es responsable de su ciclo de vida básico (alta al crear
Organization o aceptar invitación).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → `User` (definido en spec 004; sin FK de base de datos entre módulos, referencia lógica) |
| organizationId | UUID | FK → Organization |
| role | enum(`Propietario`, `Administrador`, `Gerente`, `Ventas`, `Soporte`, `Contabilidad`, `Inventario`, `RRHH`, `Lector`) | catálogo por defecto fijado en spec 007; esta feature solo consume el enum y garantiza el invariante de Propietario — la lógica fina de permisos por rol es responsabilidad de spec 007 |
| status | enum(`active`) | modelo mínimo para esta fase; revocar acceso de un Membership queda fuera de alcance de spec 005 |
| createdAt | datetime | |

**Reglas**:
- Único por (`userId`, `organizationId`) — un User tiene como máximo una Membership por
  Organization.
- Un User puede tener Memberships en múltiples Organizations (Assumptions de spec.md).
- Invariante: una Organization MUST tener al menos un Membership con rol `Propietario`
  en todo momento (FR-012) — validado antes de cualquier operación que remueva el último
  Propietario (fuera de alcance de esta fase remover Memberships salvo ese invariante).

## OrganizationInvitation

Invitación pendiente de un email a unirse a una Organization con un rol determinado.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| organizationId | UUID | FK → Organization |
| email | string | destinatario de la invitación |
| role | enum (mismo catálogo que `Membership.role`) | rol que recibirá al aceptar |
| tokenHash | string | hash del token enviado por email (mismo patrón que spec 004) |
| status | enum(`pending`, `accepted`, `cancelled`, `expired`) | |
| invitedByUserId | UUID | Propietario que emitió la invitación |
| createdAt / expiresAt / resolvedAt | datetime | |

**Reglas**:
- Único `pending` por (`organizationId`, `email`) — invitar a un email ya invitado
  reutiliza/reenvía la invitación existente en vez de duplicarla (edge case de spec.md).
- Al aceptar (`status → accepted`), se crea la `Membership` correspondiente en la misma
  transacción (ver research.md #3); al cancelar (`status → cancelled`), el token deja de
  ser válido de inmediato.
- Rechazada si la Organization ya alcanzó el límite de usuarios de su plan vigente
  (FR-003, SC-006).

## AuditLog

Registro inmutable de eventos del ciclo de vida de una Organization (y, a futuro,
reemplazo del logger de sólo-consola usado por `identity`).

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| organizationId | UUID | FK → Organization |
| actorUserId | UUID \| null | null para acciones administrativas de plataforma (ej. suspensión) |
| action | enum(`OrganizationCreated`, `OrganizationUpdated`, `OrganizationSuspended`, `OrganizationReactivated`, `PlanChanged`, `MemberInvited`, `InvitationCancelled`, `InvitationAccepted`) | |
| metadata | JSON | detalle específico de la acción (ej. `{ "fromPlan": "Free", "toPlan": "Pro" }`) |
| occurredAt | datetime | |

**Reglas**: append-only, sin actualización ni borrado; consultable vía
`GET /organizations/:id/audit-log` (FR-013, SC-004).

## Referencias a otros bounded contexts

- **User**: definido en [specs/004-authentication-identity](../004-authentication-identity/data-model.md);
  esta feature no redefine su modelo, solo lo referencia por `id` desde `Membership` e
  `OrganizationInvitation`.
- **Role/Permission** (motor completo de permisos): definido en
  [specs/007-roles-permissions](../007-roles-permissions/spec.md); esta feature solo
  fija el enum de roles por defecto en `Membership.role` y el invariante de Propietario,
  sin implementar la resolución de permisos efectivos.

## Diagrama de relaciones

```text
Organization (1) ── (0..N) Membership ── (N..1) User            [User definido en spec 004]
Organization (1) ── (0..N) OrganizationInvitation
Organization (1) ── (0..N) AuditLog
```
