# Data Model: Gestión de Customers (Clientes)

Dos tablas nuevas (`Customer`, `CustomerHistory`); ninguna tabla existente se modifica.
Sigue el lenguaje de [spec.md](spec.md) Key Entities y las decisiones de
[research.md](research.md).

## Customer

Entidad núcleo del CRM. Persona física o jurídica con relación comercial con una
Organization.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| organizationId | UUID | FK → `Organization` (spec 005); todo acceso filtra por esto en la query misma (patrón de `OrganizationInvitationRepository`) |
| name | string | nombre; obligatorio (FR-002) |
| legalName | string \| null | razón social |
| tradeName | string \| null | nombre comercial |
| type | `CustomerType` | `person` \| `company` |
| taxId | string \| null | CUIT/NIF; único por `organizationId` (research.md #3) |
| taxCondition | string \| null | condición fiscal (varía por país, texto libre) |
| email | string \| null | |
| phone | string \| null | |
| website | string \| null | |
| country | string \| null | |
| state | string \| null | provincia |
| city | string \| null | |
| address | string \| null | |
| ownerUserId | UUID \| null | responsable comercial, FK → `User` (identity); no exige Membership activa al leerlo, solo referencia |
| source | string \| null | fuente |
| category | string \| null | categoría |
| tags | string[] | sin límite (FR-008); indexado GIN (research.md #9) |
| priority | `CustomerPriority` | `low` \| `medium` \| `high` |
| customFields | Json | campos personalizados libres (FR-009), default `{}` |
| status | `CustomerStatus` | `active` \| `inactive` \| `suspended` \| `archived`; default `active` |
| mergedIntoCustomerId | UUID \| null | auto-relación; no-null = este registro fue descartado en una fusión (research.md #6) |
| version | int | concurrencia optimista (research.md #8), incrementa en cada edición |
| createdAt / updatedAt | datetime | |

**Reglas**:
- Único por (`organizationId`, `taxId`) — NULLs no cuentan como duplicado (research.md
  #3).
- Nunca se elimina físicamente (RN-004, FR-011) — "eliminar" un Customer siempre es
  `status = archived`, nunca un `DELETE` de la fila.
- `status = archived` bloquea la creación de nuevas Opportunities para este Customer
  salvo autorización explícita (FR-011); el enforcement real vive en la spec que
  implemente Opportunities (011) — ver research.md #10-estilo forward-declaration,
  documentado también en research.md #6.
- `mergedIntoCustomerId` no-null bloquea lectura/edición directa: cualquier caso de uso
  que reciba ese id debe fallar con `CustomerMergedError(survivorId)` en vez de operar
  sobre el registro (research.md #6).
- Toda edición exitosa incrementa `version` en 1; un `UPDATE` con `version` desactualizada
  respecto a la fila actual falla con `CustomerStaleUpdateError` (research.md #8).

## CustomerHistory

Historial de cambios de un Customer, campo por campo, por operación de edición
(research.md #4). Alimenta la línea de tiempo de US4 junto con `AuditLog`.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| customerId | UUID | FK → `Customer`; re-parentado al sobreviviente en una fusión (research.md #6) |
| changedByUserId | UUID | actor que hizo el cambio |
| changes | Json | `{ campo: { before, after } }`, solo campos efectivamente modificados en esa operación |
| changedAt | datetime | |

**Reglas**: append-only, nunca se edita ni elimina una fila existente. Una fusión agrega
una fila sintética (`changes: { merged: { before: null, after: <idDescartado> } }`) al
sobreviviente en vez de fila propia del descartado.

## Enums nuevos

```text
CustomerType      : person | company
CustomerStatus    : active | inactive | suspended | archived
CustomerPriority  : low | medium | high
```

## AuditLogAction — valores nuevos (spec 005, tabla existente sin cambios de esquema)

Se agregan al enum ya existente `AuditLogAction` (spec 005), no se crea un log propio
para `customers` (research.md #4):

```text
CustomerCreated
CustomerUpdated
CustomerArchived
CustomerRestored
CustomerMerged
CustomersExported
CustomersImported
```

`AuditLog.metadata` para estas acciones incluye al menos `{ customerId }`; para
`CustomerMerged` además `{ survivorCustomerId, discardedCustomerId }`.

## Referencias a otros bounded contexts

- **Organization** (`organizations`, spec 005): `Customer.organizationId` filtra cada
  query (tenant isolation, FR-016); `Organization.enabledModules` determina si `crm`
  está habilitado, sin enforcement en runtime todavía (research.md #10, gap heredado).
- **Membership/User** (`organizations`/`identity`): `Customer.ownerUserId` referencia un
  `User`, no una `Membership` — el responsable comercial puede quedar sin Membership
  activa (ex-empleado) sin que eso invalide el histórico del Customer.
- **AuditLog** (`organizations`, spec 005): recibe una entrada por acción de alto nivel
  (ver arriba); no contiene el diff campo-por-campo, que vive en `CustomerHistory`.
- **Permission catalog** (`roles`, spec 007): reutiliza `customer.read/create/update/
  delete`, ya declarados; sin claves nuevas (research.md #2).
- **Opportunities** (spec 011, futura): consumirá `Customer.status` para bloquear
  creación sobre Customers archivados (FR-011) y `Customer.mergedIntoCustomerId` para
  resolver referencias tras una fusión — a implementar en esa spec.
- **Contacts, Activities, Documentos, Cotizaciones, Facturas** (specs 009, 012, 023,
  015, 016, futuras): cada una contribuirá eventos a la línea de tiempo de US4
  extendiendo `GetCustomerTimelineUseCase` (research.md #5), sin tabla `TimelineEntry`
  compartida.

## Diagrama de relaciones

```text
Organization (1) ── (0..N) Customer                 [organizationId, aislamiento tenant]
Customer (0..1) ── (0..N) Customer                   [mergedIntoCustomerId, self-relation]
Customer (1) ── (0..N) CustomerHistory               [customerId]
User (0..1) ── (0..N) Customer                       [ownerUserId, responsable comercial]
```
