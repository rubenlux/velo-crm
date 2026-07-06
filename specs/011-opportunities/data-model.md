# Data Model: Gestión de Oportunidades de Venta (Pipeline Comercial)

Dos tablas nuevas (`Pipeline`, `PipelineStage`), una tabla existente **reformada**
(`Opportunity`, creada mínima por spec 010 — ver research.md #1, #4), una tabla nueva
de historial (`OpportunityHistory`); el enum `PipelineStage` de spec 010 se elimina
(reemplazado por la tabla del mismo nombre). `AuditLogAction` gana 10 valores nuevos.
Sigue [spec.md](spec.md) Key Entities y [research.md](research.md).

## Pipeline

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| organizationId | UUID | FK → `Organization`; una Organization puede tener más de uno (Assumptions) |
| name | string | ej. "Por defecto" |
| isDefault | boolean | default `false`; el creado por `findOrCreateDefault` (research.md #3) lo tiene en `true` |
| createdAt | datetime | |

## PipelineStage

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| pipelineId | UUID | FK → `Pipeline` |
| name | string | ej. "Nueva", "Calificada"... — editable por un Administrador (FR-004) |
| order | int | posición dentro del pipeline |
| isWonStage | boolean | default `false`; `true` dispara `OpportunityState = Ganada` al mover una Oportunidad aquí (research.md #2) |
| isLostStage | boolean | default `false`; ídem para `Perdida` |
| createdAt | datetime | |

**Reglas**:
- Eliminar una `PipelineStage` con Oportunidades `Abierta` asignadas se rechaza
  (`DeleteStageError`, research.md #11) — deben reasignarse primero.
- Seed por defecto (`findOrCreateDefault`, research.md #3): Nueva, Calificada,
  Descubrimiento, Propuesta, Negociación, Cierre, Ganada (`isWonStage`), Perdida
  (`isLostStage`), en ese `order`.

## Opportunity (reformada — ver research.md #1, #4; spec 010 la creó mínima)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK (sin cambios) |
| organizationId | UUID | FK → `Organization`; aislamiento tenant (sin cambios) |
| customerId | UUID | FK → `Customer` (spec 008, sin cambios) |
| contactId | UUID \| null | FK → `Contact` (spec 009, sin cambios) |
| leadId | UUID \| null | FK → `Lead` (spec 010, sin cambios) — no-null solo si se originó por conversión |
| name | string | sin cambios |
| ownerUserId | UUID \| null | responsable (sin cambios) |
| **pipelineId** | UUID | **nuevo** — FK → `Pipeline` |
| **stageId** | UUID | **nuevo** — FK → `PipelineStage`, reemplaza el enum `stage` de spec 010 |
| state | `OpportunityState` | sin cambios de tipo; ahora también se dispara automáticamente por `stageId.isWonStage`/`isLostStage` (research.md #2) |
| estimatedValue | decimal(14,2) \| null | sin cambios de tipo |
| **probability** | int \| null | **nuevo** — 0-100, "probabilidad de cierre" (FR-006) |
| **estimatedCloseDate** | datetime \| null | **nuevo** — fecha estimada de cierre |
| **priority** | `CustomerPriority` | **nuevo** — reutiliza el enum de spec 008, default `medium` |
| **competitor** | string \| null | **nuevo** — competidor opcional |
| **notes** | string \| null | **nuevo** — observaciones (research.md #9, no es una tabla de notas ilimitadas) |
| **tags** | string[] | **nuevo** — default `[]` |
| source | string \| null | sin cambios (spec 010 escribe `"Lead"` al convertir) |
| **stageBeforeLost** | UUID \| null | **nuevo** — poblado al perder, restaurado y limpiado al reabrir (research.md #15) |
| **stateBeforeArchive** | `OpportunityState` \| null | **nuevo** — poblado al archivar, restaurado y limpiado al restaurar (research.md #15) |
| **version** | int | **nuevo** — concurrencia optimista (mismo patrón que Customer/Contact/Lead) |
| createdAt / updatedAt | datetime | sin cambios |

**`weightedValue`** (US2, FR-007) **no** es una columna — se calcula en el momento de
la consulta como `estimatedValue * probability / 100` (research.md #7).

**Reglas**:
- Toda Oportunidad pertenece a exactamente un `Pipeline` y una `PipelineStage` de ese
  mismo Pipeline (FR-004).
- Mover a una etapa con `isWonStage = true` → `state = Ganada`; `isLostStage = true` →
  `state = Perdida` (research.md #2, Assumptions).
- Editar una Oportunidad `Ganada` exige `opportunity.edit_won` (RN-005); sin ese
  permiso, el intento se rechaza y queda auditado como intento denegado (mismo patrón
  `PermissionDenied` que spec 007).
- Reabrir desde `Perdida` vuelve a `Abierta` en la etapa que corresponda, conservando
  el historial (FR-011).
- `Archivada` exige `RestoreOpportunityUseCase` antes de poder volver a moverla en el
  pipeline activo (research.md #12).
- Nunca se elimina físicamente.

## OpportunityHistory

Idéntica forma a `LeadHistory`/`ContactHistory`/`CustomerHistory`.

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| opportunityId | UUID | FK → `Opportunity` |
| changedByUserId | UUID | |
| changes | Json | `{ campo: { before, after } }` |
| changedAt | datetime | |

## Enums

```text
# Sin cambios (spec 010) — el ciclo de vida no es configurable, solo la etapa lo es.
OpportunityState : Abierta | Ganada | Perdida | Cancelada | Archivada

# ELIMINADO (spec 010) — reemplazado por la tabla PipelineStage (research.md #1).
# enum PipelineStage { Nueva | Calificada | ... }  ← ya no existe
```

`CustomerPriority` (spec 008) se reutiliza para `Opportunity.priority` — no se crea un
`OpportunityPriority` duplicado.

## AuditLogAction — valores nuevos (spec 005, tabla existente sin cambios de esquema)

```text
OpportunityCreated
OpportunityUpdated
OpportunityStageChanged
OpportunityOwnerChanged
OpportunityValueChanged
OpportunityWon
OpportunityLost
OpportunityReopened
OpportunityArchived
OpportunityRestored
```

`AuditLog.metadata` incluye al menos `{ opportunityId }`; para
`OpportunityStageChanged` además `{ previousStageId, newStageId }`; para
`OpportunityOwnerChanged` `{ previousOwnerUserId, newOwnerUserId }`; para
`OpportunityValueChanged` `{ previousEstimatedValue, newEstimatedValue,
previousProbability, newProbability }`; para `OpportunityWon`/`OpportunityLost`/
`OpportunityReopened` `{ previousState, newState }`. No se agregan acciones de
`AuditLog` para la configuración de `Pipeline`/`PipelineStage` — FR-016 solo enumera
eventos de Opportunity (research.md, nota de simplicidad).

## Referencias a otros bounded contexts

- **Customer** (spec 008), **Contact** (spec 009): sin cambios, ya referenciados desde
  spec 010.
- **Lead** (spec 010): `LeadsModule` deja de escribir directamente esta tabla vía
  `OpportunityStubRepository` (eliminado) y pasa a importar `OpportunitiesModule` y
  usar su `OpportunityRepository`/`PipelineRepository` reales (research.md #4).
- **Organization** (spec 005): `Pipeline.organizationId`/`Opportunity.organizationId`
  aíslan por tenant; `CreateOrganizationUseCase` (spec 005) **no se modifica** —
  Pipeline se crea perezosamente (research.md #3), nunca en el momento de crear la
  Organization.
- **Permission catalog** (spec 007): agrega `opportunity.edit_won` y
  `opportunity.manage_pipeline` — primera spec de la Fase 2 en sumar permission keys
  nuevas en vez de solo reutilizar las ya declaradas (research.md #6).
- **Activities (012), Tasks (013), Documentos (023), Comentarios** (sin spec propia
  aún): no contribuyen a la línea de tiempo de esta spec todavía (research.md #10).

## Diagrama de relaciones

```text
Organization (1) ── (0..N) Pipeline                   [organizationId, aislamiento tenant]
Pipeline (1) ── (0..N) PipelineStage                  [pipelineId]
Pipeline (1) ── (0..N) Opportunity                    [pipelineId]
PipelineStage (1) ── (0..N) Opportunity                [stageId]
Organization (1) ── (0..N) Opportunity                [organizationId]
Customer (1) ── (0..N) Opportunity                    [customerId]
Contact (0..1) ── (0..N) Opportunity                  [contactId, nullable]
Lead (0..1) ── (0..1) Opportunity                     [leadId, no-null solo si vino de conversión]
Opportunity (1) ── (0..N) OpportunityHistory          [opportunityId]
User (0..1) ── (0..N) Opportunity                     [ownerUserId, responsable]
```
