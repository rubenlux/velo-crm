# Research: Gestión de Oportunidades de Venta (Pipeline Comercial)

Decisiones técnicas para spec 011. A diferencia de specs 008-010, esta spec no arranca
de una tabla vacía: **absorbe y reforma** la tabla `Opportunity` mínima que spec 010
(Leads) ya creó como propiedad temporal (`specs/010-leads/research.md` #10). Varias
decisiones de esta spec giran específicamente en torno a esa migración.

## 1. `Pipeline`/`PipelineStage` pasan a ser tablas reales, no el enum `PipelineStage` de spec 010

**Decisión**: se elimina el enum `PipelineStage` (spec 010) y se reemplaza por dos
modelos nuevos: `Pipeline` (id, organizationId, name, isDefault, createdAt) y
`PipelineStage` (id, pipelineId, name, order, isWonStage, isLostStage, createdAt).
`Opportunity.stage: PipelineStage` (enum) se reemplaza por `Opportunity.pipelineId` +
`Opportunity.stageId` (FKs). `OpportunityState` (enum: Abierta/Ganada/Perdida/
Cancelada/Archivada) se mantiene tal cual — el estado del ciclo de vida no es
configurable, solo la etapa dentro del pipeline lo es.

**Rationale**: FR-004 exige explícitamente "etapas configurables por Organization" y el
Acceptance Scenario 4 de US1 ("un Administrador configura sus propias etapas de
pipeline") es tan concreto como puede ser un requisito — un enum fijo de Prisma no
puede modelar esto por definición (los valores de un enum son fijos en el schema, no en
runtime). Sin esta migración, la spec no podría implementar su propio FR-004.

**Alternatives considered**: mantener el enum y agregar un campo `customStageName:
String?` como "override" de texto libre — rechazado, no permite reordenar etapas, no
distingue etapas ganadora/perdedora de forma fiable (dependería de comparar contra el
texto "Ganada" exacto, rompible si un Admin lo renombra), y no soporta múltiples
Pipelines por Organization (Assumptions de spec.md lo exige explícitamente).

## 2. `isWonStage`/`isLostStage` en vez de comparar por nombre

**Decisión**: `PipelineStage.isWonStage`/`isLostStage: Boolean` (default `false`,
`true` en las etapas seed "Ganada"/"Perdida"). Mover una Oportunidad a una etapa con
`isWonStage = true` dispara `OpportunityState = Ganada` automáticamente (y análogo para
`isLostStage`/`Perdida`) — FR-009, Assumptions ("mover una Oportunidad a esas etapas
dispara el cambio de estado correspondiente").

**Rationale**: si el nombre de la etapa fuera la señal (comparar `stage.name ===
'Ganada'`), renombrar la etapa (permitido por FR-004) rompería silenciosamente la
detección de cierre. Un flag booleano explícito es estable ante renombres y es la
forma correcta de modelar "esta etapa es terminal" como dato, no como convención de
texto.

## 3. Pipeline por defecto: creación perezosa (`findOrCreateDefault`), no un hook en spec 005

**Decisión**: **no** se modifica `CreateOrganizationUseCase` (spec 005) para crear un
Pipeline al crear la Organization. En su lugar, `PipelineRepository
.findOrCreateDefault(organizationId)` se invoca desde `CreateOpportunityUseCase` y
desde el `ConvertLeadUseCase` actualizado (spec 010) — crea el Pipeline "Por defecto" +
sus 8 `PipelineStage` seed (Nueva, Calificada, Descubrimiento, Propuesta, Negociación,
Cierre, Ganada [isWonStage], Perdida [isLostStage]) la primera vez que una Organization
necesita una Oportunidad, de forma idempotente.

**Rationale**: `OrganizationsModule` (spec 005) nunca debe importar `OpportunitiesModule`
(spec 011) — sería una dependencia invertida (un módulo de plataforma dependiendo de un
módulo de dominio muy posterior), violando Modular by Design. La creación perezosa
resuelve el problema sin tocar spec 005 en absoluto, y cubre gratis tanto las
Organizations nuevas como las creadas antes de esta spec (specs 004-010, incluidas las
usadas en tests) — sin necesitar una migración de backfill.

**Alternatives considered**: hook en `CreateOrganizationUseCase` (mismo momento que la
Membership de Propietario automática, spec 005) — rechazado por la dependencia
invertida que introduciría; backfill vía script de migración de datos — rechazado,
más complejo que la creación perezosa para el mismo resultado, e irrelevante en este
entorno de desarrollo sin datos de producción reales.

## 4. `LeadsModule` deja de usar `OpportunityStubRepository`, pasa a importar `OpportunitiesModule`

**Decisión**: se cumple la promesa de `specs/010-leads/research.md` #10. Se elimina
`backend/src/modules/leads/infrastructure/opportunity-stub.repository.ts`.
`LeadsModule` importa `OpportunitiesModule` (spec 011) y `ConvertLeadUseCase` se
actualiza para: (1) resolver `pipelineId`/`stageId` vía
`PipelineRepository.findOrCreateDefault` + su etapa "Nueva", en vez de escribir el
valor de enum `'Nueva'` a mano; (2) crear la Opportunity a través del `OpportunityRepository`
real que `OpportunitiesModule` exporta.

**Impacto en spec 010 (ya implementada y con tests pasando)**: dos aserciones de test
comparaban `opportunity.stage` contra el string literal `'Nueva'`
(`leads-convert.spec.ts`, `e2e/leads/quickstart.spec.ts`) — dejan de ser válidas porque
`stage` pasa de string a `stageId` (UUID). Se actualizan para verificar
`opportunity.stage.name === 'Nueva'` contra la relación expandida que
`ConvertLeadUseCase` ahora incluye en su resultado (decisión #5). Ningún otro test de
spec 010 depende de la forma de `Opportunity`. Se vuelve a correr la suite completa de
specs 004-010 después de la migración para confirmar que no se rompió nada más
(mismo hábito que specs 008/009/010 establecieron).

**Alternatives considered**: mantener `OpportunityStubRepository` indefinidamente y
duplicar un segundo repositorio "real" — rechazado explícitamente por
`specs/010-leads/research.md` #10, que documentó esta migración como el plan desde el
principio.

## 5. `GetOpportunityUseCase`/`ConvertLeadUseCase` devuelven `stage`/`pipeline` expandidos

**Decisión**: las consultas de una Opportunity individual (incluida la que devuelve
`ConvertLeadUseCase` tras convertir un Lead) incluyen la relación `stage` (con `name`,
`order`, `isWonStage`, `isLostStage`) y `pipeline` (con `name`) vía `include` de Prisma,
no solo los ids crudos.

**Rationale**: cualquier consumidor (frontend, o los tests de spec 010 que verifican el
resultado de la conversión) necesita el nombre de la etapa para mostrarla o verificarla
— exigirle un segundo round-trip para resolver `stageId → nombre` sería fricción
innecesaria (Simplicity Wins aplicado a la forma de la respuesta, no solo al modelo de
datos).

## 6. Permission keys nuevas: `opportunity.edit_won` y `opportunity.manage_pipeline`

**Decisión**: a diferencia de specs 008-010 (que solo reutilizaron CRUD ya declarado
por spec 007), esta spec agrega **dos** permission keys nuevas al catálogo estático de
`roles/infrastructure/permission-catalog.ts` (módulo `crm`, mismo mecanismo que los
demás):

| Acción | Permission |
|---|---|
| Crear (US1 AC1) | `opportunity.create` |
| Buscar / ver / timeline / KPIs / forecast (US1, US4, US5) | `opportunity.read` |
| Editar / mover de etapa / reasignar responsable / definir valor-probabilidad / marcar Perdida / reabrir / archivar / restaurar (US1-US3, salvo los casos de abajo) | `opportunity.update` |
| Editar una Oportunidad ya `Ganada` (por PATCH o vía `move-stage`), o moverla directamente a `Perdida` desde `Ganada` (RN-005) — incluye editarla mientras está `Archivada` si `stateBeforeArchive = Ganada` (cierra el bypass archive→update→restore encontrado en la revisión de seguridad de esta spec) | `opportunity.edit_won` (**nueva**) |
| Configurar las etapas de un Pipeline de la Organization (US1 AC4) | `opportunity.manage_pipeline` (**nueva**) |

**Rationale**: spec.md Assumptions ya anticipa explícitamente la primera
("los 'permisos especiales' ... por ejemplo, un Permission específico
`opportunity.edit_won`"). La segunda se justifica por texto equivalente en US1 AC4
("un Administrador configura") — reconfigurar el pipeline de todo el equipo comercial
es una acción de administración, no de uso diario del CRM, y no debería quedar
habilitada por el mismo `opportunity.update` que cualquier Ventas tiene por defecto.
`DEFAULT_ROLE_PERMISSIONS` (spec 007) se actualiza: `Administrador` las recibe ambas
(ya recibe todo el catálogo salvo `organization.manage`, sin cambios ahí); `Gerente`
recibe `opportunity.edit_won` pero no `opportunity.manage_pipeline` (Gerente ya tenía
CRUD completo de `opportunity` en spec 007, ver `byResource(['...opportunity...'])`);
`Ventas` no recibe ninguna de las dos (mismo criterio ya calibrado en spec 007).

**Alternatives considered**: gatear ambas acciones detrás del `opportunity.update`
existente — rechazado, la propia spec pide explícitamente un nivel de permiso
diferenciado para las dos.

## 7. Valor ponderado: calculado en el use case, no almacenado

**Decisión**: `weightedValue` (US2) se calcula en `GetOpportunityUseCase`/
`SearchOpportunitiesUseCase`/KPI queries como `estimatedValue * probability / 100` en
el momento de la consulta — no es una columna persistida.

**Rationale**: es una derivación trivial de dos campos que ya existen
(`estimatedValue`, `probability`); persistirla introduciría el riesgo de que quede
desincronizada si alguno de los dos cambia sin recalcular (Simplicity Wins). FR-007
solo exige que el sistema "calcule automáticamente" el valor ponderado, no que lo
persista.

## 8. Sin `currency` propio en `Opportunity`

**Decisión**: no se agrega un campo `currency` a `Opportunity`. La moneda de
presentación es siempre `Organization.currency` (spec 005), ya existente.

**Rationale**: ningún FR/Acceptance Scenario pide multi-moneda dentro de una misma
Organization; agregar un campo redundante sin un requisito concreto que lo use sería
alcance no pedido (Simplicity Wins).

## 9. `notes`/observaciones: campo simple, no una tabla de notas ilimitadas

**Decisión**: `Opportunity.notes: String?`, una columna simple — a diferencia de
`LeadNote` (spec 010), que existe porque FR-007 de esa spec pedía explícitamente
"sin límite de cantidad". Spec 011 no tiene un requisito equivalente para
Opportunity; su Key Entities solo menciona "observaciones" en singular.

**Rationale**: replicar el patrón de `LeadNote` sin que ningún FR lo pida sería
alcance no solicitado.

## 10. Actividades, Tareas, Documentos y Comentarios (FR-008): diferidos a sus specs dueñas

**Decisión**: igual que `specs/010-leads/research.md` #9, ninguna de las asociaciones
que FR-008 menciona (actividades → spec 012, tareas → spec 013, documentos → spec 023,
comentarios → sin spec propia identificada aún) se construye en esta fase. La línea de
tiempo de una Opportunity (US5) combina únicamente `OpportunityHistory` (diffs de
campo) + `AuditLog` filtrado por `opportunityId`, extensible cuando esas specs existan
— mismo patrón calculado que Customer/Contact/Lead.

**Rationale**: mismo razonamiento ya validado tres veces (specs 008, 009, 010): no
construir un stand-in que la spec dueña tendría que migrar o reemplazar.

## 11. Eliminar una `PipelineStage` con Oportunidades activas: rechazado, exige reasignar primero

**Decisión**: `DeleteStageError` si `count(Opportunity where stageId = X and state IN
(Abierta)) > 0`. El caller debe mover esas Oportunidades a otra etapa antes de poder
eliminarla.

**Rationale**: edge case explícito de spec.md ("El sistema MUST exigir reasignarlas a
una etapa válida antes de permitir eliminarla").

## 12. Archivar exige restaurar antes de volver al pipeline activo

**Decisión**: mismo patrón de baja lógica que Customer/Contact — `OpportunityState.Archivada`
es un estado adicional al ciclo normal (Abierta/Ganada/Perdida/Cancelada), alcanzado
vía una acción explícita de archivado, y `RestoreOpportunityUseCase` es la única forma
de sacarla de ahí antes de poder moverla de etapa de nuevo.

**Rationale**: edge case explícito de spec.md ("el sistema MUST exigir restaurarla
explícitamente antes").

## 13. KPIs y Forecast (US4): agregación en el momento de la consulta, sin caché

**Decisión**: `GetOpportunityKpisUseCase`/`GetForecastUseCase` ejecutan agregaciones
Prisma (`groupBy`, `count`, `avg`, `sum`) directamente contra la tabla `Opportunity` en
cada consulta — sin tabla de KPIs materializada ni caché.

**Rationale**: SC-005 solo exige que los KPIs reflejen cambios recientes "en menos de 5
segundos" — una agregación en vivo lo satisface trivialmente (siempre es inmediata) sin
la complejidad de invalidar una caché o materialized view. Ninguna Success Criteria
exige un límite de latencia específico para KPIs/forecast (a diferencia de SC-002, que
sí lo exige para búsqueda de Oportunidades individuales).

## 14. Búsqueda (US5): mismo patrón `pg_trgm`/GIN que specs 008-010

**Decisión**: índice trigram sobre `Opportunity.name`; filtros exactos (btree) sobre
`customerId`, `contactId`, `ownerUserId`, `stageId`, `state`, `priority`, `tags` (GIN).
`priority` reutiliza `CustomerPriority` (spec 008) — sin duplicar el tipo.

**Rationale**: mismo requisito de rendimiento (SC-002/SC-003), misma solución ya
validada tres veces.

## 15. Ganar/perder mueve a la etapa designada del Pipeline; reabrir restaura la etapa previa

**Decisión**: `WinOpportunityUseCase`/`LoseOpportunityUseCase` no solo cambian
`state` — mueven la Oportunidad a la `PipelineStage` de su propio Pipeline marcada
`isWonStage`/`isLostStage` (research.md #2), guardando el `stageId` anterior en
`Opportunity.stageBeforeLost: String?` antes de sobrescribirlo (solo para el caso
`Lost`, ya que solo se reabre desde `Perdida`, FR-011 — "Ganada" no tiene ruta de
reapertura en ningún Acceptance Scenario). `ReopenOpportunityUseCase` restaura
`stageId = stageBeforeLost`, `state = Abierta`, limpia `stageBeforeLost` — mismo
mecanismo que `Lead.statusBeforeLost` (spec 010, research.md #12), aplicado aquí a
`stageId` en vez de a un enum de estado.

Archivar es distinto: **no** toca `stageId` (solo `state → Archivada`), así que
restaurar solo necesita volver al `state` anterior — `Opportunity.stateBeforeArchive:
OpportunityState?`, poblado por `ArchiveOpportunityUseCase` y restaurado/limpiado por
`RestoreOpportunityUseCase`. No hace falta un `stageBeforeArchive` separado porque
archivar nunca cambió `stageId` en primer lugar.

**Rationale**: reutiliza el mecanismo "guardar el valor previo antes de una transición
reversible" ya validado en spec 010, en vez de inventar uno nuevo. Distinguir
"perder mueve de etapa" (necesita registrar `stageId` previo) de "archivar no mueve de
etapa" (no necesita registrarlo) evita una columna sin uso real.

## 16. Fix post-entrega (encontrado durante el research de spec 012): `CreateOpportunityUseCase` no llamaba a `CustomerArchivedGuardService`

**Bug encontrado**: spec 008 (`research.md` #6/#10 de esa spec) había declarado por
adelantado `CustomerArchivedGuardService.assertActive()` explícitamente para que esta
spec lo consumiera (cumple FR-011 de spec 008: "impedir crear nuevas Oportunidades
para un Customer archivado"). La implementación original de
`create-opportunity.use-case.ts` (arriba) solo llamaba a
`CustomerRepository.findById` y chequeaba `!customer` — nunca chequeó
`customer.status === 'archived'` — dejando pasar la creación de Oportunidades sobre
Customers archivados. No lo encontró ningún test (ninguno de los 19 tests de esta
spec ejercía ese escenario) ni la revisión de seguridad de T062 (que auditó
aislamiento por tenant y permisos, no reglas de negocio cross-spec como ésta) — se
encontró por inspección manual mientras se investigaba si spec 012 (Activities)
necesitaba el mismo guard para su propio `CreateActivityUseCase`.

**Fix**: `CreateOpportunityUseCase` ahora inyecta `CustomerArchivedGuardService`
(ya exportado por `CustomersModule`, ya importado por `OpportunitiesModule` — sin
cambios de wiring de módulos) y llama a `assertActive()` en vez de `findById` +
chequeo manual; el `CustomerNotFoundError` que ese servicio lanza se recaptura y se
vuelve a lanzar como `CustomerNotFoundForOpportunityError` para no romper el
contrato 400 ya documentado (`CustomerArchivedError` sí se deja propagar tal cual,
ya capturado globalmente por `CustomersExceptionsFilter` → 409
`customer_archived`, registrado en `main.ts` junto con el resto de los filtros).
Cubierto por `opportunities-archived-customer-guard.spec.ts` (2 tests: rechaza
sobre archivado con 409, sigue rechazando 400 sobre inexistente).

**Lección para specs futuras**: cuando una spec declara un servicio "forward-declared
para que la spec N lo consuma" (mismo patrón que los permission keys de spec 007
declarados para 008+), agregar una verificación explícita de "¿la spec consumidora
realmente lo está llamando?" a la checklist de Polish/seguridad de esa spec
consumidora — no alcanza con que compile o que existan los imports correctos.
