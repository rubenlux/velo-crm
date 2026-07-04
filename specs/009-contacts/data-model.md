# Data Model: Gestión de Contactos (Contacts)

Dos tablas nuevas (`Contact`, `ContactHistory`); ninguna tabla existente se modifica
salvo el enum `AuditLogAction` (spec 005). Sigue [spec.md](spec.md) Key Entities y
[research.md](research.md).

## Contact

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| organizationId | UUID | FK → `Organization`; filtra cada query (FR-017) |
| customerId | UUID | FK → `Customer` (spec 008), **no nullable** (RN-001, research.md #1) |
| firstName | string | obligatorio |
| lastName | string | obligatorio |
| photoUrl | string \| null | |
| birthDate | date \| null | |
| gender | string \| null | |
| jobTitle | string \| null | cargo |
| department | string \| null | |
| area | string \| null | |
| decisionLevel | string \| null | nivel de decisión; valor de referencia, no catálogo cerrado (Assumptions) |
| company | string | denormalizado desde `Customer.name` al crear (research.md #8) |
| primaryEmail | string \| null | |
| secondaryEmails | string[] | default `[]` |
| primaryPhone | string \| null | |
| secondaryPhones | string[] | default `[]` |
| whatsapp | string \| null | |
| linkedin | string \| null | |
| website | string \| null | |
| country / state / city / address | string \| null | |
| ownerUserId | UUID \| null | responsable, FK → `User` |
| status | `ContactStatus` | `active` \| `inactive` \| `archived`; default `active` |
| tags | string[] | default `[]` |
| priority | `CustomerPriority` | reutiliza el mismo enum de spec 008 (`low`/`medium`/`high`) — mismo concepto, sin duplicar tipo |
| isPrimary | boolean | default `false`; único activo por `customerId` vía índice parcial (research.md #4) |
| customFields | Json | default `{}` |
| mergedIntoContactId | UUID \| null | auto-relación; no-null = descartado en una fusión (research.md #6) |
| version | int | concurrencia optimista (research.md #8) |
| createdAt / updatedAt | datetime | |

**Reglas**:
- `customerId` nunca es null (RN-001); un Contact sin Customer no puede existir.
- A lo sumo un Contact con `isPrimary = true` por `customerId` (FR-004, SC-004) —
  aplicación (transacción) + índice único parcial (research.md #4).
- Transferir (`customerId` cambia) fuerza `isPrimary = false` incondicionalmente
  (research.md #5).
- Fusionar exige `a.customerId === b.customerId` (research.md #6, edge case de
  spec.md); si no, se rechaza.
- Nunca se elimina físicamente (FR-012) — baja lógica es siempre `status = archived`.
- `mergedIntoContactId` no-null bloquea lectura/edición directa
  (`ContactMergedError(survivorId)`, mismo patrón que spec 008).

## ContactHistory

Idéntica forma a `CustomerHistory` (spec 008 data-model.md), aplicada a `Contact`.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| contactId | UUID | FK → `Contact`; re-parentado al sobreviviente en una fusión |
| changedByUserId | UUID | |
| changes | Json | `{ campo: { before, after } }` |
| changedAt | datetime | |

## Enums nuevos

```text
ContactStatus : active | inactive | archived
```

`CustomerPriority` (spec 008) se reutiliza tal cual — no se crea un `ContactPriority`
duplicado (mismo concepto de negocio, mismos 3 valores).

## AuditLogAction — valores nuevos (spec 005, tabla existente sin cambios de esquema)

```text
ContactCreated
ContactUpdated
ContactCustomerChanged
ContactPrimaryChanged
ContactArchived
ContactRestored
ContactMerged
```

`AuditLog.metadata` incluye al menos `{ contactId }`; para `ContactCustomerChanged`
además `{ fromCustomerId, toCustomerId }`; para `ContactPrimaryChanged`
`{ customerId, previousPrimaryContactId, newPrimaryContactId }`; para `ContactMerged`
`{ survivorContactId, discardedContactId }`.

## Referencias a otros bounded contexts

- **Customer** (`customers`, spec 008): `Contact.customerId` es una dependencia dura,
  no opcional (research.md #1); `company` se denormaliza de `Customer.name`
  (research.md #8).
- **Organization** (`organizations`, spec 005): `Contact.organizationId` aísla por
  tenant (FR-017), igual patrón que `Customer.organizationId`.
- **AuditLog** (`organizations`, spec 005): recibe las 7 acciones nuevas listadas
  arriba; el diff campo-por-campo vive solo en `ContactHistory`.
- **Permission catalog** (`roles`, spec 007): reutiliza `contact.read/create/update/
  delete`, ya declarados; sin claves nuevas (research.md #2).
- **Activities, Opportunities, Documentos** (specs 012, 011, 023, futuras): cada una
  contribuirá eventos a la línea de tiempo de US4 extendiendo
  `GetContactTimelineUseCase`, mismo patrón que spec 008 research.md #5.

## Diagrama de relaciones

```text
Organization (1) ── (0..N) Contact                  [organizationId, aislamiento tenant]
Customer (1) ── (0..N) Contact                       [customerId, obligatorio — RN-001]
Contact (0..1) ── (0..N) Contact                     [mergedIntoContactId, self-relation]
Contact (1) ── (0..N) ContactHistory                 [contactId]
User (0..1) ── (0..N) Contact                        [ownerUserId, responsable]
```
