# Data Model: Gestión de Actividades (spec 012)

Ver research.md para el razonamiento de cada decisión referenciada abajo.

## `ActivityType`

Catálogo compartido + tipos custom por Organization (research.md #3).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| organizationId | string? | `null` = tipo por defecto compartido, seedeado por `DefaultActivityTypesSeeder` |
| name | string | |
| isDefault | boolean | `true` para las 12 filas seedeadas |
| createdAt | datetime | |

`@@unique([organizationId, name])` — ver la salvedad de spec 007 research.md #2
(no deduplica entre filas `organizationId = null`, el seeder es la única fuente de
verdad para esas filas).

Catálogo por defecto (FR-010): Llamada, Reunión, Correo electrónico, Videollamada,
Nota, Visita, Mensaje, Seguimiento, Presentación, Demostración, Capacitación, Otro.

## `Activity`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| organizationId | string | FK → Organization, `onDelete: Cascade` |
| customerId | string? | FK → Customer, `onDelete: Restrict` |
| contactId | string? | FK → Contact, `onDelete: Restrict` |
| leadId | string? | FK → Lead, `onDelete: Restrict` |
| opportunityId | string? | FK → Opportunity, `onDelete: Restrict` |
| activityTypeId | string | FK → ActivityType |
| title | string | |
| description | string? | |
| scheduledAt | datetime | fecha/hora de la interacción |
| durationMinutes | int? | |
| status | enum `ActivityStatus` | default `Pendiente` |
| statusBeforeCancel | enum `ActivityStatus`? | poblado al cancelar, restaurado/limpiado al reactivar (research.md #7) |
| priority | enum `CustomerPriority` | reutilizado (research.md #5 de spec 012 / Clarifications) |
| authorUserId | string | inmutable, poblado al crear (research.md #5) |
| ownerUserId | string? | reasignable |
| participantUserIds | string[] | default `[]` (research.md #6) |
| result | string? | solo editable si `status = Finalizada` (research.md #12) |
| finishedAt | datetime? | poblado al entrar a `Finalizada`, limpiado si retrocede |
| originActivityId | string? | auto-relación, poblada por `ScheduleFollowUpActivityUseCase` (research.md #11) |
| tags | string[] | default `[]` |
| version | int | default `1`, concurrencia optimista (research.md #16) |
| createdAt | datetime | |
| updatedAt | datetime | |

Constraint agregada a mano en la migración (research.md #1):
```sql
ALTER TABLE "activities" ADD CONSTRAINT "activities_at_least_one_relation"
  CHECK (customer_id IS NOT NULL OR contact_id IS NOT NULL OR lead_id IS NOT NULL OR opportunity_id IS NOT NULL);
```

Índice de búsqueda (research.md #15), agregado a mano:
```sql
CREATE INDEX "activities_title_trgm_idx" ON "activities" USING GIN ("title" gin_trgm_ops);
```

Índices declarados en `schema.prisma`: `@@index([organizationId, status])`,
`@@index([customerId])`, `@@index([contactId])`, `@@index([leadId])`,
`@@index([opportunityId])`, `@@index([ownerUserId])`.

### `ActivityStatus` (enum)

`Pendiente`, `EnProceso`, `Finalizada`, `Cancelada` (reactivable a `Pendiente` o al
estado previo a cancelar si estaba `EnProceso`, ver research.md #7).

## `ActivityHistory`

Diffs campo-por-campo, mismo patrón que `LeadHistory`/`OpportunityHistory`.

| Campo | Tipo |
|---|---|
| id | uuid |
| activityId | string (FK → Activity, `onDelete: Cascade`) |
| changedByUserId | string |
| changes | json |
| changedAt | datetime |

## `ActivityComment`

Editable/eliminable solo por su autor (research.md #9).

| Campo | Tipo |
|---|---|
| id | uuid |
| activityId | string (FK → Activity, `onDelete: Cascade`) |
| authorUserId | string |
| body | string |
| createdAt | datetime |
| updatedAt | datetime |

## `ActivityAttachment`

Mismo patrón que `LeadAttachment` (research.md #10).

| Campo | Tipo |
|---|---|
| id | uuid |
| activityId | string (FK → Activity, `onDelete: Cascade`) |
| fileName | string |
| fileUrl | string |
| uploadedByUserId | string |
| uploadedAt | datetime |

## `AuditLogAction` — 12 valores nuevos (research.md #17)

`ActivityCreated`, `ActivityUpdated`, `ActivityOwnerChanged`,
`ActivityStatusChanged`, `ActivityCancelled`, `ActivityReactivated`,
`ActivityResultRecorded`, `ActivityFollowUpScheduled`, `ActivityCommentAdded`,
`ActivityCommentUpdated`, `ActivityCommentDeleted`, `ActivityAttachmentAdded`.

## Cambios a `Organization`

Agrega `activities Activity[]` y `activityTypes ActivityType[]` a las relaciones
existentes.

## Sin cambios de esquema en specs 008-011

Customer/Contact/Lead/Opportunity no se modifican (research.md #13) — `Activity`
solo las referencia por FK, y sus propias timelines no se tocan a nivel backend.
