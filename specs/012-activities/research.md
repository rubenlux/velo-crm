# Research: Gestión de Actividades (spec 012)

## 1. Asociación a múltiples entidades relacionadas: FKs nullable + CHECK constraint a mano

**Decisión**: `Activity` tiene cuatro columnas nullable (`customerId`, `contactId`,
`leadId`, `opportunityId`), cada una con FK propia (`onDelete: Restrict`, mismo
criterio que `Opportunity.customerId`/`Contact.customerId`). Al menos una debe estar
presente (RN-004 del input, FR-002/edge case). Prisma no puede expresar un CHECK
multi-columna en `schema.prisma` (mismo límite ya conocido para índices únicos
parciales, specs 009/011) — se agrega a mano en el `.sql` de la migración:
`CHECK (customer_id IS NOT NULL OR contact_id IS NOT NULL OR lead_id IS NOT NULL OR
opportunity_id IS NOT NULL)`.

**Rationale**: mismo patrón "Prisma DSL no alcanza → hand-edit migration.sql" ya
usado dos veces (`contacts_customer_primary_unique` en spec 009,
`pipelines_organization_default_unique` en spec 011) — defensa en profundidad además
de la validación de aplicación en `CreateActivityUseCase`.

**Alternatives considered**: una tabla de join polimórfica
(`ActivityRelation{activityId, entityType, entityId}`) — rechazada: más flexible en
teoría, pero pierde las FKs reales de Postgres (no hay una tabla única "entities" a
la que apuntar) y complica cada query de "Activities de este Customer" con un filtro
por `entityType` en vez de un simple `WHERE customer_id = ...` indexado.

## 2. Coherencia entre entidades relacionadas simultáneas: mismo Customer (FR-002a)

**Decisión**: si se proveen dos o más de {customerId, contactId, leadId,
opportunityId} a la vez, `CreateActivityUseCase`/`UpdateActivityUseCase` resuelven el
Customer implícito de cada una (`Contact.customerId`, `Opportunity.customerId`,
`Lead.convertedCustomerId` si el Lead ya fue convertido) y rechazan con
`ActivityRelatedEntitiesMismatchError` si hay más de un valor distinto entre las
resueltas. Un Lead sin convertir no aporta ningún Customer implícito, así que no
genera conflicto por sí solo (puede combinarse con cualquier otra entidad sin
chequeo, ya que normalmente un Lead sin convertir no coexiste con un Customer/
Contact/Opportunity reales de todas formas).

**Rationale**: cumple la Clarification de spec.md sin inventar una tabla nueva —
reutiliza las FKs ya resueltas (`CustomerRepository`/`ContactRepository`/
`LeadRepository`/`OpportunityRepository`, todos ya exportados por sus módulos).

## 3. `ActivityType`: catálogo compartido + tipos propios por Organization (mismo patrón que `Role`, no el de `Pipeline`)

**Decisión**: `ActivityType.organizationId` es **nullable** — `null` = tipo por
defecto compartido (los 12 de FR-010: Llamada, Reunión, Correo electrónico,
Videollamada, Nota, Visita, Mensaje, Seguimiento, Presentación, Demostración,
Capacitación, Otro), seedeados idempotentemente al bootear por
`DefaultActivityTypesSeeder` (mismo mecanismo que `DefaultRolesSeeder`, spec 007);
un valor concreto = tipo custom de esa Organization (US1 AC2, "un Administrador
configura sus propios tipos"). `@@unique([organizationId, name])` con la misma
salvedad ya documentada en spec 007 research.md #2 (Postgres no deduplica NULLs en
un índice único compuesto — el seeder es la única fuente de verdad para las filas
`organizationId = null`, no la constraint).

**Alternatives considered**: el patrón de `Pipeline`/`PipelineStage` (spec 011,
tabla real *por Organization*, creada perezosamente) — rechazado: ese patrón existe
porque cada `PipelineStage` necesita `order`/`isWonStage`/`isLostStage` propios por
Organization desde el primer uso (no hay nada "compartido" que tenga sentido).
`ActivityType` no tiene esa necesidad — es una etiqueta simple, exactamente como
`Role`, no como `Pipeline`.

## 4. Nueva permission key: `activity.manage_types`

**Decisión**: spec 007 ya declaró `activity.{read,create,update,delete}` (CRUD
genérico) en `permission-catalog.ts`. Configurar tipos custom (US1 AC2) exige una
key nueva, `activity.manage_types` — mismo argumento exacto que
`opportunity.manage_pipeline` (spec 011 research.md #6): es una acción de
administración de catálogo compartido por todo el equipo, no CRUD normal de
Activities individuales. `Administrador` la recibe (recibe todo el catálogo salvo
`organization.manage`); `Gerente`/`Ventas`/`Soporte` **no** — igual que con
`manage_pipeline`, hay que agregar `.filter((key) => key !== 'activity.manage_types')`
a sus `byResource([...])` en `DEFAULT_ROLE_PERMISSIONS`, porque `byResource` la
incluiría automáticamente si no se excluye a mano (mismo gotcha ya documentado en
spec 011 research.md #6).

**Alternatives considered**: reusar `activity.update` para crear tipos — rechazado,
mezclaría "editar una Activity" con "reconfigurar el catálogo de toda la
Organization", perdiendo la distinción de nivel de permiso que spec 011 ya estableció
como precedente para este tipo exacto de acción.

## 5. Autor vs. responsable: campos independientes (ver Clarifications de spec.md)

**Decisión**: `authorUserId` (`String`, no-nullable, poblado una sola vez al crear,
nunca editable) y `ownerUserId` (`String?`, reasignable vía `UpdateActivityUseCase`,
mismo campo genérico `ownerUserId` de Lead/Opportunity, sin FK real — igual que
`Lead.ownerUserId`/`Opportunity.ownerUserId`, la validación de que sea un Member de
la Organization se hace en la aplicación, no en la DB). FR-008 filtra por
`ownerUserId` (usuario responsable); no se pide filtrar por `authorUserId` en ningún
Acceptance Scenario, así que no se agrega ese filtro.

## 6. Participantes: array escalar, no tabla de join

**Decisión**: `participantUserIds String[] @default([])` en `Activity` — mismo
patrón que `tags`/`Contact.secondaryEmails` (arrays escalares sin FK de Postgres,
validados en la aplicación contra `MembershipRepository` si se necesita, igual que
`ownerUserId`). FR-003 solo pide "conservar la lista completa" — ningún Acceptance
Scenario pide metadata por participante (rol, confirmación, etc.) que justifique una
tabla `ActivityParticipant` propia.

**Alternatives considered**: tabla de join `ActivityParticipant{activityId,
userId}` — rechazada por Simplicity Wins; se puede introducir después si una spec
futura necesita metadata por participante.

## 7. Máquina de estados: PATCH genérico para Pendiente↔EnProceso↔Finalizada; endpoints dedicados para Cancelada (mismo patrón que Lead)

**Decisión**: `status` es un campo más de `UpdateActivityUseCase` (PATCH) para las
transiciones Pendiente↔EnProceso↔Finalizada (sin efectos secundarios de negocio
más allá de poblar `finishedAt` cuando se entra a `Finalizada` y limpiarlo si se
retrocede). `Cancelada`/reactivar son **endpoints dedicados**
(`POST .../cancel`, `POST .../reactivate`), mismo patrón que
`Lead.lose`/`Lead.reactivate` (spec 010) — porque cancelar/reactivar necesita
guardar y restaurar el estado previo (`statusBeforeCancel: ActivityStatus?`, mismo
mecanismo que `Lead.statusBeforeLost`/`Opportunity.stageBeforeLost`), algo que un
PATCH genérico no expresa bien.

**Alternatives considered**: seguir el patrón de `Opportunity` (endpoints dedicados
también para Pendiente→EnProceso→Finalizada) — rechazado, esas transiciones no
tienen side effects comparables a mover de `PipelineStage`; el PATCH genérico de
Lead es más simple y alcanza.

## 8. Sin eliminación física en ningún estado (no solo `Finalizada`)

**Decisión**: no existe ningún endpoint `DELETE` sobre `Activity`, en ningún
estado. **Confirmado explícitamente por Clarifications (sesión 2026-07-05)** — la
redacción original de FR-011/edge case solo mencionaba proteger `Finalizada`, lo
que dejaba ambiguo si `Pendiente`/`EnProceso`/`Cancelada` admitían DELETE físico;
se corrigió FR-011, el edge case y SC-006 en spec.md para cubrir explícitamente
todos los estados, en vez de dejarlo como una extrapolación implícita de esta
spec. Mismo criterio que Customer/Contact/Lead/Opportunity, que nunca tuvieron un
DELETE real: las Activities forman parte del historial operativo y de la línea de
tiempo del CRM, y permitir el borrado físico rompería trazabilidad, auditoría y
las referencias que otras entidades (comentarios, Customer, Contact, Lead,
Opportunity) mantienen hacia ellas. `activity.delete` (ya declarada por spec 007)
queda sin usar, mismo caso que `lead.delete` en spec 010.

## 9. Comentarios: tabla propia, editable/eliminable solo por su autor (ver Clarifications)

**Decisión**: `ActivityComment{id, activityId, authorUserId, body, createdAt,
updatedAt}`. `UpdateActivityCommentUseCase`/`DeleteActivityCommentUseCase`
verifican `comment.authorUserId === input.actorUserId` y lanzan
`CommentNotOwnedError` (403) si no coincide — **sin excepción para Propietario**:
la Clarification dice explícitamente "por su autor", sin mencionar un bypass de
administrador, así que no se agrega uno (a diferencia del bypass total de
Propietario en permisos, que es un concepto distinto — este es un chequeo de
autoría, no de permisos). El borrado de un comentario es físico (la fila desaparece;
no es la entidad auditada principal) pero cada mutación de comentario igual
publica su propia acción de Audit Log (`ActivityCommentAdded/Updated/Deleted`) para
cumplir FR-012, preservando la trazabilidad aunque la fila ya no exista.

## 10. Adjuntos: mismo patrón que `LeadAttachment` (referencia externa, sin storage propio)

**Decisión**: `ActivityAttachment{id, activityId, fileName, fileUrl,
uploadedByUserId, uploadedAt}` — idéntico a `LeadAttachment` (spec 010 research.md
#8). Sin endpoint de borrado de adjuntos individual (ningún Acceptance Scenario lo
pide; el edge case solo exige que sobrevivan a la cancelación de la Activity, no que
sean removibles).

## 11. Próxima actividad programada: use case dedicado que hereda las entidades relacionadas del origen

**Decisión**: `ScheduleFollowUpActivityUseCase(originActivityId, ...campos nuevos)`
— crea una nueva `Activity` en estado `Pendiente` copiando
`customerId`/`contactId`/`leadId`/`opportunityId` de la Activity origen (sin
permitir que el caller los reemplace, ya que la Clarification/AC2 de US2 exige
"vinculada a la misma entidad") y seteando `originActivityId` (auto-relación
nullable, sin `onDelete` especial — igual que `Customer.mergedIntoCustomerId`, ya
que Activities nunca se eliminan físicamente el escenario de FK rota no aplica en la
práctica). Gateado por `activity.update` (actúa sobre la Activity origen), igual que
`Lead.convert` se gateó por `lead.update` en vez de `customer.create` (spec 010) —
mismo criterio: el permiso relevante es el de la entidad sobre la que se actúa, no
el de las entidades creadas como efecto secundario.

## 12. Resultado: campo de `Activity`, editable solo si `status = Finalizada`

**Decisión**: `result: String?` en `Activity`, actualizable vía el mismo
`UpdateActivityUseCase` (PATCH) con una guarda: rechaza con
`ActivityNotFinishedError` si `status !== 'Finalizada'` en el momento de la
edición. Mismo criterio que la guarda de `opportunity.edit_won` de spec 011 (un
chequeo de estado dentro del use case, no un permiso nuevo) — aquí sin nivel de
permiso especial porque spec.md no pide uno.

## 13. Timeline de OTRAS entidades (US4/FR-009): merge en el frontend, no en el backend — evita un ciclo de dependencia entre módulos

**Decisión**: `ActivitiesModule` (el más nuevo) importa `CustomersModule`,
`ContactsModule`, `LeadsModule` y `OpportunitiesModule` (los cuatro, primera vez que
una spec de esta Fase 2 necesita las cuatro a la vez) para validar las FKs al crear/
actualizar una Activity. Para que las Activities de un Customer/Contact/Lead/
Opportunity aparezcan en SU línea de tiempo (FR-009), **no** se modifica
`GetCustomerTimelineUseCase`/`GetContactTimelineUseCase`/`GetLeadTimelineUseCase`/
`GetOpportunityTimelineUseCase` (008-011) para que inyecten un `ActivityRepository`
— eso obligaría a esos cuatro módulos a importar `ActivitiesModule` de vuelta,
creando un ciclo real (`ActivitiesModule → CustomersModule → ActivitiesModule`) que
NestJS solo resuelve con `forwardRef()`, una complejidad que este proyecto no usa en
ningún otro lado. En cambio, el frontend de cada entidad (`CustomerTimeline.tsx`,
`ContactTimeline.tsx`, `LeadTimeline.tsx`, `OpportunityTimeline.tsx`) llama
**además** a `GET /organizations/:id/activities?customerId=X` (el mismo endpoint de
búsqueda de US5, sin necesidad de un endpoint nuevo) y mergea+ordena
cronológicamente ambas listas antes de renderizar.

**Rationale**: FR-009 pide que las Activities "aparezcan automáticamente... sin
pasos manuales adicionales" — no exige que la agregación ocurra en el backend.
Evita tocar 4 módulos ya enviados y testeados (menor superficie de regresión,
alineado con "Quality Before Features": no re-abrir specs cerradas sin necesidad),
y evita la única alternativa que sí lo requeriría (`forwardRef()`), una complejidad
nueva sin precedente en el proyecto (Simplicity Wins).

**Alternatives considered**: agregar `ActivityRepository` a los cuatro módulos vía
`forwardRef()` — rechazado por la complejidad/riesgo de introducir el primer ciclo
de módulos del proyecto para un beneficio (un solo round-trip HTTP en vez de dos)
que no está pedido por ningún Success Criteria.

## 14. Timeline propia de una Activity: mismo patrón calculado que 008-011

**Decisión**: `GetActivityTimelineUseCase` combina `ActivityHistory` (diffs
campo-por-campo) + `AuditLog` filtrado por `activityId`
(`AuditLogRepository.listByMetadataField(organizationId, 'activityId', id)`, ya
existente) — mismo patrón calculado-en-el-momento-de-la-consulta que specs 008-011,
sin tabla de timeline persistida. Esto es distinto de la decisión #13 (que trata de
que Activities aparezcan en las timelines de OTRAS entidades) — acá es la timeline
de la Activity misma.

## 15. Búsqueda (US5): mismo patrón `pg_trgm`/GIN que specs 008-011

**Decisión**: índice GIN con `pg_trgm` sobre `Activity.title`, agregado a mano en
la migración (igual que `customers_name_trgm_idx`,
`contacts_first_name_trgm_idx`, `leads_name_trgm_idx`,
`opportunities_name_trgm_idx`) para cumplir SC-002 (<300ms, 95% de los casos) a
escala de SC-003 (1M Activities por Organization). Recordar revisar el `.sql`
generado por `prisma migrate dev --create-only` para eliminar los `DROP INDEX`
erróneos que Prisma propone para los índices de specs anteriores (gotcha recurrente,
4ª vez consecutiva: specs 008, 009, 010, 011).

## 16. Concurrencia optimista: mismo mecanismo `version` que el resto del CRM

**Decisión**: `Activity.version: Int @default(1)`, chequeado e incrementado en cada
`UpdateActivityUseCase.execute` vía `updateMany({ where: { id, organizationId,
version } })` — mismo patrón exacto que Customer/Contact/Lead/Opportunity, cumple
el edge case de ediciones simultáneas de spec.md sin inventar un mecanismo nuevo.

## 17. Nuevas acciones de `AuditLogAction` (FR-012)

`ActivityCreated`, `ActivityUpdated`, `ActivityOwnerChanged`,
`ActivityStatusChanged`, `ActivityCancelled`, `ActivityReactivated`,
`ActivityResultRecorded`, `ActivityFollowUpScheduled`, `ActivityCommentAdded`,
`ActivityCommentUpdated`, `ActivityCommentDeleted`, `ActivityAttachmentAdded` — 12
valores nuevos, mismo nivel de granularidad que los 10 que agregó spec 011.
