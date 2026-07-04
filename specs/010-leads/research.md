# Research: Gestión de Prospectos (Leads)

Decisiones técnicas para spec 010. Sigue el lenguaje de [spec.md](spec.md) y reutiliza
varios patrones ya validados en
[specs/008-customers/research.md](../008-customers/research.md) y
[specs/009-contacts/research.md](../009-contacts/research.md) (referenciados en vez de
re-derivados). Dos decisiones de alcance (#9 y #10) fueron resueltas explícitamente con
el usuario antes de este documento por afectar el límite de esta spec con specs futuras
(011, 012).

## 1. Nuevo módulo `leads`, importa `customers` y `contacts` (spec 008/009)

**Decisión**: módulo NestJS nuevo `backend/src/modules/leads/`, con tabla `Lead`
independiente (no hereda de `Customer`/`Contact`). Importa `CustomersModule` y
`ContactsModule` (vía sus repositorios exportados) para la conversión (US3), además del
core de plataforma (`identity`, `organizations`, `roles`).

**Rationale**: mismo patrón modular que `contacts` (spec 009) importando `customers`
(spec 008, research.md #1) — `leads` es el segundo módulo de la Fase 2 con una
dependencia dura hacia otro módulo de la misma fase, y el primero con **dos**
dependencias de Fase 2 simultáneas.

**Alternatives considered**: ninguna — es la única forma de crear un Customer/Contact
real desde la conversión sin duplicar su lógica de validación (Constitution II, Modular
by Design).

## 2. Permission keys: reutilizar `lead.*`, ya declarado por spec 007; `lead.delete` queda sin uso

**Decisión**: igual que spec 008/009 research.md #2, sin permission keys nuevas.

| Acción | Permission |
|---|---|
| Crear / importar (US1, US5) | `lead.create` |
| Editar / calificar / asignar responsable / próxima acción / adjuntar / convertir / marcar perdido / reactivar / archivar (US1-US4) | `lead.update` |
| Buscar / ver / timeline (US2, US5) | `lead.read` |
| — | `lead.delete` (sin uso — spec 010 no tiene operación destructiva equivalente a la fusión de Customers/Contacts; FR-014 prohíbe la eliminación física en todo estado) |

**Rationale**: a diferencia de spec 008/009 (donde `.delete` se reservaba para
`merge`, la operación más sensible), spec 010 no tiene fusión de Prospectos ni ninguna
otra operación que descarte una fila — todo es aditivo o un cambio de estado reversible
(salvo `Convertido`, que es una transición de estado, no una eliminación). Dejar
`lead.delete` sin uso es consistente con FR-014 y no requiere quitarlo del catálogo (ya
lo declaró spec 007 para los 4 verbos CRUD de todos los recursos CRM por igual).

## 3. `LeadStatus` y `LeadSource`: identificadores ASCII para valores con espacios/acentos

**Decisión**: `LeadStatus`: `Nuevo`, `Contactado`, `Calificado`, `EnNegociacion`,
`Convertido`, `Perdido`, `Archivado`. `LeadSource`: `SitioWeb`, `Formulario`,
`RedesSociales`, `Referido`, `Llamada`, `Email`, `Importacion`, `Evento`,
`CargaManual`, `Api`.

**Rationale**: los enums de Prisma deben ser identificadores válidos (sin espacios ni
acentos); mismo criterio ya aplicado a `MembershipRole` (nombres en español,
capitalizados, sin acentos: `Propietario`, `Administrador`). El texto de presentación
("En negociación", "Sitio Web") es responsabilidad del frontend, no del valor
persistido.

## 4. `ownerUserId` nullable pese a FR-003 ("MUST asignar un responsable")

**Decisión**: `Lead.ownerUserId: String?` (nullable), no `NOT NULL`.

**Rationale**: el Acceptance Scenario 4 de US1 describe explícitamente un Prospecto
**sin** responsable asignado ("Given un Prospecto sin responsable asignado, When un
Administrador le asigna uno..."), un estado válido y probado por la propia spec. FR-003
se interpreta como "el sistema debe soportar asignar un responsable" (mecanismo
disponible), no como una restricción `NOT NULL` en la creación — de lo contrario el
propio Acceptance Scenario 4 sería irrealizable. Mismo criterio que spec 008 aplicó a
`Customer.ownerUserId` (también nullable).

## 5. Score comercial (FR-009): campo manual, sin fórmula automática en esta fase

**Decisión**: `Lead.score: Int?` (0-100), editable directamente por el responsable al
calificar el Prospecto (Acceptance Scenario 3, US1: "el responsable evalúa su interés y
lo califica... con su Score actualizado"). Sin cálculo automático ni fórmula
configurable por Organization en esta fase.

**Rationale**: Assumptions de spec.md deja el algoritmo concreto "a la fase de
planificación técnica" (este documento) y excluye explícitamente IA para scoring.
Construir un motor de fórmulas configurables por Organization no está pedido por ningún
FR/Acceptance Scenario concreto — solo que el Score se pueda "calcular y mostrar", lo
que un campo editable satisface literalmente sin la complejidad de un motor de reglas
(Simplicity Wins). Una fórmula configurable queda como extensión futura si una spec
posterior la pide explícitamente.

**Alternatives considered**: fórmula fija basada en campos del Lead (interacciones,
origen, etc.) — rechazada, ningún Acceptance Scenario define qué fórmula ni qué
variables, inventarla sería alcance no pedido.

## 6. Notas ilimitadas (FR-007): tabla `LeadNote` propia, solo alta (sin edición/borrado)

**Decisión**: tabla `LeadNote` (id, leadId, authorUserId, note: String, createdAt), sin
límite de filas por Lead. Sin endpoints de edición/borrado de una nota individual —
ningún Acceptance Scenario los pide.

**Rationale**: FR-007 exige explícitamente "sin límite de cantidad", lo que descarta un
campo único `notes: String` en `Lead` (reemplazaría la nota anterior). Mismo criterio de
tabla de historial ya usado (`CustomerHistory`/`ContactHistory`), pero de contenido
libre en vez de diffs de campos.

## 7. Próxima acción (US2 AC3): par de columnas en `Lead`, no una tabla

**Decisión**: `Lead.nextActionAt: DateTime?` + `Lead.nextActionNote: String?`, columnas
simples en la propia fila de `Lead`.

**Rationale**: el Acceptance Scenario habla de **la** próxima acción (singular, "esa
próxima acción es visible junto con su fecha"), no de un historial de próximas
acciones — una tabla sería complejidad no pedida (Simplicity Wins). Se sobrescribe al
definir una nueva.

## 8. Adjuntos (FR-008): tabla `LeadAttachment` de solo metadata, sin almacenamiento binario

**Decisión**: tabla `LeadAttachment` (id, leadId, fileName: String, fileUrl: String,
uploadedByUserId, uploadedAt). Sin endpoint de subida de archivos ni almacenamiento
binario/blob — `fileUrl` asume un recurso ya alojado (mismo patrón que
`User.avatarUrl`/`Organization.logoUrl`, campos `String?` sin infraestructura de subida
propia).

**Rationale**: no existe infraestructura de almacenamiento de archivos en el proyecto
(spec 023-documentos, que la definiría, no está implementada). Construir un mecanismo de
subida/almacenamiento propio para esta spec sería alcance de spec 023, no de spec 010 —
mismo principio que ya aplica el proyecto para `avatarUrl`/`logoUrl`. El Acceptance
Scenario 4 de US2 ("el documento queda asociado y accesible desde la ficha") se
satisface con la asociación + referencia; "accesible" se resuelve navegando a `fileUrl`.

**Alternatives considered**: integrar un proveedor de almacenamiento (S3, etc.) ahora —
rechazado, alcance explícito de una spec futura (023), no pedido por ningún FR de esta.

## 9. "Registrar actividades" (US2 AC1): diferido a spec 012, no implementado en esta fase

**Decisión** (confirmada con el usuario): spec 012 (Activities, sin implementar aún)
declara explícitamente ser la única dueña del registro de actividades (llamada,
reunión, email, etc.) para Customer/Contact/Lead/Opportunity por igual ("esta spec
define cómo se registra una Activity; esas specs solo consumen y muestran ese
historial"). Specs 008/009 (ya implementadas) respetaron ese límite y nunca crearon su
propia tabla de actividades — sus líneas de tiempo solo combinan su propio historial de
campos + Audit Log. Spec 010 sigue el mismo precedente: el Acceptance Scenario 1 de US2
("registrar una actividad... queda listada en la línea de tiempo") queda explícitamente
**fuera de esta implementación**, diferido a cuando exista spec 012. El resto de US2
(notas, próxima acción, adjuntos) sí se implementa completo.

**Rationale**: mantener el mismo límite modular ya validado dos veces (008, 009) evita
construir una tabla `LeadActivity` que spec 012 tendría que migrar/reemplazar apenas se
implemente — spec 012 es explícita sobre no querer que las specs consumidoras redefinan
el concepto. `GetLeadTimelineUseCase` combina `LeadHistory` + `AuditLog` (filtrado por
`leadId`) + `LeadNote`, extensible por spec 012 cuando exista (mismo patrón "calculado,
no tabla propia" de spec 008 research.md #5/#7).

**Alternatives considered**: tabla `LeadActivity` acotada a Leads ahora, migrar cuando
exista spec 012 — rechazada explícitamente por el usuario: duplicaría trabajo y
contradice el texto de spec 012 sobre no ser redefinida por specs consumidoras.

## 10. Conversión (US3, FR-010): tabla `Opportunity` mínima dentro de esta spec, spec 011 la amplía después

**Decisión** (confirmada con el usuario): se agrega un modelo Prisma `Opportunity`
mínimo ahora — solo los campos que exige FR-010 (nombre, Customer, Contact, responsable,
Pipeline/etapa inicial, estado, origen) — sin configuración de Pipeline, KPIs, forecast,
probabilidad ni valor ponderado (eso es alcance de spec 011, US2/US4). Los valores de los
enums `OpportunityState`/`PipelineStage` se toman **literalmente** de las Key Entities ya
redactadas en `specs/011-opportunities/spec.md` (no se inventan), aunque el código de
esta spec solo escriba `Abierta`/`Nueva`. Como todavía no existe un `OpportunitiesModule`
(spec 011 no implementada), la única escritura a esta tabla vive en
`backend/src/modules/leads/infrastructure/opportunity-stub.repository.ts` — un
repositorio deliberadamente angosto (solo `create`), documentado como temporal. Cuando se
implemente spec 011, su `OpportunitiesModule` pasa a ser dueño de la tabla y expone su
propio repositorio completo; `LeadsModule` cambia en ese momento a importar y usar ese
repositorio real en lugar de `opportunity-stub.repository.ts` (mismo mecanismo de
"módulo exporta repositorio" ya usado entre `customers`↔`contacts`).

**Rationale**: alternativa elegida explícitamente por el usuario frente a invertir el
orden de implementación (011 antes que 010) o dejar la conversión sin implementar. Definir
los enums completos ahora (en vez de un subconjunto ad-hoc) evita una migración
adicional en spec 011 solo para agregar valores de enum que ya están documentados hoy.
Se documenta como una excepción deliberada y acotada a "Modular by Design" en el
Constitution Check de plan.md, con una ruta de resolución clara (spec 011 absorbe la
propiedad).

**Alternatives considered**: (a) implementar spec 011 completa antes que spec 010 —
rechazada por el usuario, mayor alcance/tiempo ahora y no es el orden numérico ni de
prioridad de negocio establecido; (b) US3 sin conversión, diferida a cuando exista spec
011 — rechazada por el usuario, US3 es la historia de mayor valor de negocio de spec
010 (P3, "el momento de mayor valor... el Prospecto se convierte en negocio real") y
dejarla sin implementar vacía el propósito central de la spec.

## 11. Reglas de conversión: estados de origen permitidos, duplicados y concurrencia

**Decisión**:

- **Estados de origen permitidos**: `Nuevo`, `Contactado`, `Calificado`,
  `EnNegociacion` pueden convertirse. `Convertido` (ya convertido, FR-011),
  `Perdido` y `Archivado` (deben reactivarse primero, o no aplica) son rechazados con un
  error dedicado (`LeadNotConvertibleError`).
- **Duplicados** (edge case): antes de crear, `ConvertLeadUseCase` busca un Customer o
  Contact existente en la misma Organization cuyo email o teléfono coincida con el del
  Lead. Si encuentra coincidencias, la conversión responde con una advertencia listando
  los candidatos, sin crear nada, a menos que la solicitud incluya
  `linkToExistingCustomerId`/`linkToExistingContactId` (usar el existente) o
  `forceCreateNew: true` (crear de todas formas).
- **Concurrencia** (edge case): toda la conversión ocurre en una única transacción
  Prisma. El primer paso es un `updateMany({ where: { id, status: { in: [...estados
  permitidos] } }, data: { status: 'Convertido', ... } })`; si `count === 0` (otro
  request ya convirtió o cambió el estado), se aborta antes de crear Customer/Contact/
  Opportunity, lanzando `LeadAlreadyConvertedError`. Esto garantiza que la creación de
  las tres entidades ocurra como mucho una vez por Lead.

**Rationale**: "Prospecto calificado" (FR-010, Acceptance Scenarios) se interpreta como
"en un estado de trabajo activo", no estrictamente `LeadStatus.Calificado` — restringir
a un único valor de estado sería más estricto de lo que pide la spec y bloquearía
convertir un Lead ya en `EnNegociacion` (más avanzado que `Calificado`). El patrón de
"update condicional dentro de transacción" es la misma técnica de defensa en profundidad
que el índice parcial de spec 009 research.md #4: nunca confiar solo en una lectura
previa para decidir si escribir.

## 12. Reactivación de `Perdido`: vuelve al estado previo a la pérdida

**Decisión**: `Lead.statusBeforeLost: LeadStatus?`, poblado al marcar `Perdido` con el
valor de `status` justo antes de la transición, y restaurado (y limpiado a `null`) al
reactivar.

**Rationale**: el Acceptance Scenario 2 de US4 solo exige "vuelve a un estado de trabajo
activo", sin especificar cuál — restaurar el estado previo exacto es más fiel al
historial real del Prospecto que un destino fijo arbitrario (por ejemplo, siempre
`Contactado`), que perdería información (un Lead `Calificado` marcado `Perdido` no
debería "retroceder" a `Contactado` al reactivarse).

**Alternatives considered**: reactivar siempre a `Contactado` — rechazada, pierde
información y es arbitraria; agregar un historial completo de transiciones de estado —
rechazada, `LeadHistory` (diffs de campo) ya cubre esto para auditoría; una sola columna
extra basta para la única transición que importa (reactivar).

## 13. `Archivado`: valor de enum alcanzable solo vía el PATCH genérico, sin acción dedicada

**Decisión**: `Archivado` (FR-004) se alcanza mediante el mismo `PATCH
/leads/:leadId` genérico usado para cualquier cambio de `status` (US1) — no tiene un
endpoint `POST .../archive` propio, ni una acción de Audit Log dedicada más allá del
`LeadStatusChanged` genérico que ya dispara cualquier cambio de `status` vía ese PATCH.
Sin ruta de reactivación desde `Archivado` en esta fase (a diferencia de `Perdido`, que
sí la tiene, FR-013).

**Rationale**: ningún Acceptance Scenario de spec.md ejercita una transición especial
hacia o desde `Archivado` — solo aparece en la definición del enum (`LeadStatus`, Key
Entities) y en Assumptions, que remite el detalle fino a esta fase de planificación.
Construir un endpoint/acción dedicados sin un Acceptance Scenario concreto que los
pida sería alcance no pedido (Simplicity Wins); el valor de enum queda disponible desde
ya (FR-004 se satisface con modelarlo), y una spec futura puede agregar una acción
dedicada (con o sin reactivación) si un requisito concreto lo pide.

**Alternatives considered**: endpoint `POST .../archive` dedicado con su propia acción
de Audit Log (`LeadArchived`) — rechazada, hubiera sido la misma complejidad que
`lose`/`reactivate` (que sí tienen Acceptance Scenarios explícitos) sin un requisito
equivalente que lo justifique.

## 14. Historial y línea de tiempo: mismo patrón calculado de spec 008/009

**Decisión**: tabla `LeadHistory` (misma forma que `CustomerHistory`/`ContactHistory`) +
`GetLeadTimelineUseCase` combinando `LeadHistory` + `AuditLog` (filtrado por `leadId`) +
`LeadNote`, ordenados cronológicamente. Sin tabla `TimelineEntry` compartida (spec 008
research.md #7).

**Rationale**: consistencia arquitectónica ya validada dos veces; ver decisión #9 sobre
por qué `LeadActivity` no se incluye todavía.

## 15. Concurrencia optimista y búsqueda a escala: mismos mecanismos de spec 008/009

**Decisión**: `version: Int` + rechazo 409 en edición concurrente normal (no relacionada
a conversión, que usa su propio guard de estado, decisión #11); índices `pg_trgm`/GIN
para `name`, `company`, `primaryEmail`≡`email`, `city`, `tags` — mismos campos que
FR-015 pide como filtros de búsqueda (nombre, empresa, email, teléfono, responsable,
estado, etiquetas, ciudad, origen); `phone`/`ownerUserId`/`status`/`source` filtran por
igualdad exacta (btree, no trigram).

**Rationale**: mismo requisito de rendimiento (SC-002/SC-003, idénticos a spec 008/009),
misma solución ya validada dos veces.

## 16. Importación en lote (US5, FR-002): mismas validaciones que el alta manual

**Decisión**: `ImportLeadsUseCase` nuevo (CSV), reutiliza las mismas validaciones de
`CreateLeadUseCase` fila por fila — mismo patrón que
`ImportCustomersUseCase`/`CustomerCsv` (spec 008), sin compartir código entre módulos
(cada uno con su propio parser CSV acotado a las columnas de su propia entidad).

**Rationale**: FR-002 exige explícitamente "respetando las mismas validaciones que el
alta manual" — reutilizar el use case de creación fila por fila (no una ruta de
validación paralela) es la única forma de garantizarlo sin duplicar reglas.
