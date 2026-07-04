# Data Model: Gestión de Prospectos (Leads)

Cinco tablas nuevas (`Lead`, `LeadHistory`, `LeadNote`, `LeadAttachment`,
`Opportunity` — esta última mínima, ver [research.md](research.md) #10); ninguna tabla
existente se modifica salvo el enum `AuditLogAction` (spec 005). Sigue [spec.md](spec.md)
Key Entities y [research.md](research.md).

## Lead

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| organizationId | UUID | FK → `Organization`; filtra cada query (FR-017) |
| name | string | obligatorio — nombre de la persona o empresa prospecto |
| company | string \| null | empresa, si el contacto principal no es la empresa misma |
| jobTitle | string \| null | cargo |
| email | string \| null | |
| phone | string \| null | |
| whatsapp | string \| null | |
| country / state / city / address | string \| null | `city` es filtro de búsqueda (FR-015) |
| source | `LeadSource` | origen; default `CargaManual` |
| campaign | string \| null | campaña de origen |
| interest | string \| null | interés comercial (producto/servicio) |
| ownerUserId | UUID \| null | responsable; **nullable** pese a FR-003 — ver research.md #4 |
| status | `LeadStatus` | default `Nuevo` |
| statusBeforeLost | `LeadStatus` \| null | poblado al marcar `Perdido`, restaurado y limpiado al reactivar (research.md #12) |
| priority | `CustomerPriority` | reutiliza el enum de spec 008 (`low`/`medium`/`high`), sin duplicar tipo |
| score | int \| null | 0-100, editable manualmente (research.md #5) |
| tags | string[] | default `[]` |
| lastContactedAt | datetime \| null | última fecha de contacto |
| nextActionAt | datetime \| null | próxima acción — fecha (research.md #7) |
| nextActionNote | string \| null | próxima acción — descripción |
| customFields | Json | default `{}` |
| convertedCustomerId | UUID \| null | poblado por la conversión (US3) |
| convertedContactId | UUID \| null | poblado por la conversión (US3) |
| convertedOpportunityId | UUID \| null | poblado por la conversión (US3) |
| convertedAt | datetime \| null | |
| version | int | concurrencia optimista en ediciones normales (research.md #15) |
| createdAt / updatedAt | datetime | |

**Reglas**:
- Nunca se elimina físicamente (FR-014) — los únicos estados de baja lógica son
  `Perdido`/`Archivado` (no existe un `deletedAt` ni un `hard delete`).
- Solo se convierte una vez (FR-011): un Lead con `status = Convertido` rechaza
  cualquier intento de reconversión (`LeadAlreadyConvertedError`).
- Conversión permitida solo desde `Nuevo`/`Contactado`/`Calificado`/`EnNegociacion`
  (research.md #11); `Perdido`/`Archivado` deben reactivarse primero (`Perdido`) o no
  aplican (`Archivado`, sin ruta de reactivación en esta fase, research.md #13).
- Reactivar desde `Perdido` restaura `status = statusBeforeLost` y limpia
  `statusBeforeLost` a `null` (research.md #12).
- `convertedCustomerId`/`convertedContactId`/`convertedOpportunityId`/`convertedAt` son
  atómicamente no-null juntos (todos poblados por la misma transacción de conversión) o
  todos null — nunca un subconjunto.

## LeadHistory

Idéntica forma a `CustomerHistory`/`ContactHistory` (specs 008/009), aplicada a `Lead`.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| leadId | UUID | FK → `Lead` |
| changedByUserId | UUID | |
| changes | Json | `{ campo: { before, after } }` |
| changedAt | datetime | |

## LeadNote

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| leadId | UUID | FK → `Lead` |
| authorUserId | UUID | |
| note | text | sin límite de longitud práctico |
| createdAt | datetime | |

Sin edición ni borrado de una nota individual (research.md #6) — solo alta y lectura
(vía timeline).

## LeadAttachment

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| leadId | UUID | FK → `Lead` |
| fileName | string | nombre para mostrar |
| fileUrl | string | referencia externa; sin almacenamiento binario propio (research.md #8) |
| uploadedByUserId | UUID | |
| uploadedAt | datetime | |

## Opportunity (mínima — ver research.md #10)

Ámbito deliberadamente acotado a lo que exige FR-010 de esta spec. Sin campos de
probabilidad, valor ponderado, configuración de Pipeline por Organization, KPIs ni
forecast — eso es alcance de spec 011.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| organizationId | UUID | FK → `Organization`; aislamiento tenant |
| customerId | UUID | FK → `Customer` (spec 008) |
| contactId | UUID \| null | FK → `Contact` (spec 009); nullable a nivel de esquema, pero la conversión de Lead siempre lo completa |
| leadId | UUID \| null | FK → `Lead`; no-null solo si se originó por conversión (spec 011 Key Entities: "puede originarse desde un Lead... o crearse directamente") |
| name | string | por conversión: `Lead.name` (+ `Lead.company` si existe) |
| ownerUserId | UUID \| null | por conversión: `Lead.ownerUserId` |
| estimatedValue | decimal(14,2) \| null | sin uso por esta spec (siempre `null` al convertir); campo existe para que spec 011 no necesite una migración adicional |
| state | `OpportunityState` | esta spec solo escribe `Abierta` |
| stage | `PipelineStage` | esta spec solo escribe `Nueva` |
| source | string \| null | por conversión: literal `"Lead"` |
| createdAt / updatedAt | datetime | |

**Nota de propiedad temporal**: sin `OpportunitiesModule` (spec 011 no implementada), el
único escritor de esta tabla es `leads/infrastructure/opportunity-stub.repository.ts`
(solo `create`). Cuando se implemente spec 011, esa spec pasa a ser dueña de la tabla,
agrega los campos de US2/US4 en una migración propia, y `LeadsModule` cambia a importar
el repositorio real que `OpportunitiesModule` exporte (research.md #10).

## Enums nuevos

```text
LeadStatus   : Nuevo | Contactado | Calificado | EnNegociacion | Convertido | Perdido | Archivado
LeadSource   : SitioWeb | Formulario | RedesSociales | Referido | Llamada | Email | Importacion | Evento | CargaManual | Api

# Sourced from specs/011-opportunities/spec.md Key Entities (research.md #10) —
# esta spec solo escribe Abierta/Nueva.
OpportunityState : Abierta | Ganada | Perdida | Cancelada | Archivada
PipelineStage    : Nueva | Calificada | Descubrimiento | Propuesta | Negociacion | Cierre | Ganada | Perdida
```

`CustomerPriority` (spec 008) se reutiliza tal cual para `Lead.priority` — no se crea un
`LeadPriority` duplicado.

## AuditLogAction — valores nuevos (spec 005, tabla existente sin cambios de esquema)

```text
LeadCreated
LeadUpdated
LeadOwnerChanged
LeadStatusChanged
LeadConverted
LeadLost
LeadReactivated
```

`AuditLog.metadata` incluye al menos `{ leadId }`; para `LeadOwnerChanged` además
`{ previousOwnerUserId, newOwnerUserId }`; para `LeadStatusChanged`
`{ previousStatus, newStatus }`; para `LeadConverted`
`{ customerId, contactId, opportunityId }`; para `LeadLost`/`LeadReactivated`
`{ previousStatus, newStatus }` (mismo shape que `LeadStatusChanged`, acción separada
por ser el evento de negocio explícito que pide FR-016).

## Referencias a otros bounded contexts

- **Customer** (`customers`, spec 008) y **Contact** (`contacts`, spec 009): creados (o
  vinculados a uno existente) por `ConvertLeadUseCase` (research.md #10, #11); sin
  modificar sus tablas.
- **Opportunity**: definida mínimamente aquí, propiedad temporal hasta spec 011
  (research.md #10).
- **Organization** (`organizations`, spec 005): `Lead.organizationId`/
  `Opportunity.organizationId` aíslan por tenant (FR-017), mismo patrón que
  `Customer.organizationId`.
- **AuditLog** (`organizations`, spec 005): recibe las 7 acciones nuevas listadas
  arriba; el diff campo-por-campo vive solo en `LeadHistory`.
- **Permission catalog** (`roles`, spec 007): reutiliza `lead.read/create/update`, ya
  declarados; `lead.delete` sin uso (research.md #2); sin claves nuevas.
- **Activities** (spec 012, futura): no contribuye a la línea de tiempo de esta spec
  todavía (research.md #9) — `GetLeadTimelineUseCase` se extenderá cuando exista.
- **Opportunities** (spec 011, futura): pasa a ser dueña de la tabla `Opportunity`
  (research.md #10).

## Diagrama de relaciones

```text
Organization (1) ── (0..N) Lead                      [organizationId, aislamiento tenant]
Lead (1) ── (0..N) LeadHistory                        [leadId]
Lead (1) ── (0..N) LeadNote                           [leadId]
Lead (1) ── (0..N) LeadAttachment                     [leadId]
Lead (0..1) ── (0..1) Opportunity                     [convertedOpportunityId / leadId, poblado solo tras conversión]
Lead (0..1) ──> Customer                              [convertedCustomerId, poblado solo tras conversión]
Lead (0..1) ──> Contact                               [convertedContactId, poblado solo tras conversión]
User (0..1) ── (0..N) Lead                            [ownerUserId, responsable]
Organization (1) ── (0..N) Opportunity                [organizationId, aislamiento tenant]
Customer (1) ── (0..N) Opportunity                    [customerId]
Contact (0..1) ── (0..N) Opportunity                  [contactId, nullable a nivel de esquema]
```
