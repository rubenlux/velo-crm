# Data Model: Users

Extiende el modelo `User` ya definido en
[specs/004-authentication-identity/data-model.md](../004-authentication-identity/data-model.md)
con los atributos de perfil y ciclo de vida que esta feature agrega. No crea tablas
nuevas para `User` mismo; ver [research.md](research.md) #1 para por qué.

## User (columnas agregadas)

| Campo | Tipo | Notas |
|---|---|---|
| firstName | string \| null | |
| lastName | string \| null | |
| avatarUrl | string \| null | |
| language | string | default `"es"` |
| timezone | string | default `"UTC"` |
| preferences | JSON | default `{}` (ej. notificaciones) |
| status | enum(`Pending`, `Active`, `Inactive`, `Suspended`, `Deleted`) | default `Active` (ver research.md #6 sobre `Pending`) |
| deletedAt | datetime \| null | seteado al pasar a `Deleted` (soft delete) |

**Reglas**:
- `status` transitions: `Active ⇄ Inactive` (FR-005), `Active/Inactive → Deleted`
  (FR-006, terminal — FR-007 impide revertirlo), `Suspended` es alcanzable/reversible
  por mecanismos fuera de alcance de esta spec (ver Assumptions de spec.md).
- Un User en `Suspended`, `Inactive` o `Deleted` no puede acceder a datos de ninguna
  Organization (FR-012), verificado en cada request por `TenantContextGuard`
  (research.md #5), independientemente de si sus credenciales de login siguen siendo
  válidas.
- El soft delete conserva la fila completa (`deletedAt` seteado, `status = Deleted`);
  ninguna tabla relacionada (`Membership`, `AuditLog`, `Session`) se borra ni se
  reasigna.

## Preferences

Sub-documento JSON dentro de `User.preferences`, sin tabla propia (estructura libre,
ver Assumptions de spec.md — el contenido exacto de notificaciones no está fijado por
esta spec).

## Access History Entry

No es una entidad nueva: es una proyección de solo lectura sobre `Session` (spec 004),
expuesta vía `SessionHistoryRepository.listByUserId` (research.md #3).

| Campo expuesto | Origen |
|---|---|
| deviceUserAgent | `Session.device.userAgent` |
| approxLocation | `Session.device.approxLocation` |
| createdAt | `Session.createdAt` (momento del login) |
| status | `Session.status` (`active`/`revoked`) |
| lastActivityAt | `Session.lastActivityAt` |

## Referencias a otros bounded contexts

- **Membership** (`organizations`, spec 005): esta feature la consume para listar las
  Organizations del User (US2) y para el invariante de administrador (FR-008,
  research.md #4); no redefine su modelo.
- **Session** (`identity`, spec 004): esta feature la consume de solo lectura para el
  historial de accesos (US4, research.md #3); no la modifica.
- **AuditLog** (`organizations`, spec 005): esta feature publica en él (creación,
  cambio de perfil, cambio de estado, cambio de rol, cambio de email) reutilizando
  `AuditLogPublisher`; no define un log propio.

## Diagrama de relaciones

```text
User (1) ── (0..N) Membership          [Membership definido en spec 005]
User (1) ── (0..N) Session              [Session definido en spec 004, solo lectura acá]
User.status ──> valida en cada request  [TenantContextGuard, spec 005, extendido]
```
