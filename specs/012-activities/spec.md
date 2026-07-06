# Feature Specification: Gestión de Actividades

**Feature Branch**: `012-activities`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-012 — Gestión de Actividades. Registrar, organizar y consultar todas las interacciones (llamada, reunión, correo, videollamada, nota, visita, mensaje, seguimiento, presentación, demostración, capacitación, otro — tipos configurables por organización) realizadas con Customers, Contacts, Leads y Opportunities: múltiples participantes, adjuntos, comentarios internos, resultado, próxima actividad programada, línea de tiempo automática por entidad relacionada, búsqueda/filtros, con auditoría completa y aislamiento entre organizaciones. No incluye calendario, gestión de tareas, automatizaciones ni integraciones con correo/telefonía."

**Nota de terminología**: Esta especificación posee la entidad `Activity` del bounded
context **CRM** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)),
reemplazando el detalle que hoy vive de forma resumida en la User Story 3 de
[specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md)
(ver nota de deprecación en esa spec). Es la fuente de datos de las "Timeline Entry" ya
mencionadas como referencia en
[specs/008-customers](../008-customers/spec.md#key-entities),
[specs/009-contacts](../009-contacts/spec.md#key-entities),
[specs/010-leads](../010-leads/spec.md#key-entities) y
[specs/011-opportunities](../011-opportunities/spec.md#key-entities): esta spec define
cómo se registra una Activity; esas specs solo consumen y muestran ese historial en su
propia línea de tiempo. No redefine `Customer`, `Contact`, `Lead` ni `Opportunity`.

## Clarifications

### Session 2026-07-04

- Q: La spec menciona tanto "autor" como "usuario responsable" para una Activity (Key Entities y FR-008). ¿Son el mismo usuario o dos campos independientes? → A: Campos independientes — `authorUserId` (quién la creó, inmutable, para auditoría) y `ownerUserId` (a quién está asignada, reasignable), mismo patrón que `Lead.ownerUserId`/`Opportunity.ownerUserId`.
- Q: ¿Una Activity `Cancelada` puede volver a `Pendiente` (reactivarse)? → A: Sí — acción `reactivate: Cancelada → Pendiente`, mismo patrón que `Lead.reactivate`/`Opportunity.reopen`.
- Q: Si una Activity se asocia a varias entidades a la vez (ej. Contact + Opportunity), ¿deben pertenecer al mismo Customer? → A: Sí — el sistema exige coherencia entre las entidades relacionadas asociadas simultáneamente (deben remitir al mismo Customer).
- Q: ¿La prioridad de una Activity reutiliza la escala baja/media/alta ya usada en Customer/Lead/Opportunity, o necesita una escala propia? → A: Reutiliza la misma escala (baja/media/alta) — mismo `CustomerPriority` ya usado en las demás specs del CRM.
- Q: ¿Los comentarios internos de una Activity son inmutables una vez publicados, o su autor puede editarlos/borrarlos? → A: Editable/borrable por su autor (no por cualquier otro usuario de la Organization).

### Session 2026-07-05

- Q: FR-011 solo menciona proteger de eliminación física a una Activity `Finalizada`. ¿Una Activity en `Pendiente`/`EnProceso`/`Cancelada` admite eliminación física, o tampoco, independientemente de su estado? → A: Ninguna Activity admite eliminación física en ningún estado. Para una Activity no finalizada, la única baja funcional disponible es la transición a `Cancelada`. Una Activity `Finalizada` tampoco admite DELETE físico. Razón: las Activities forman parte del historial operativo y de la línea de tiempo del CRM — permitir el borrado físico rompería trazabilidad, auditoría y las referencias que otras entidades (comentarios, Customer, Contact, Lead, Opportunity) mantienen hacia ellas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar y gestionar Activities (Priority: P1) 🎯

Como Vendedor, quiero registrar una Activity (llamada, reunión, email, nota, etc.)
asociada a un Customer, Contact, Lead u Opportunity, para dejar constancia de cada
interacción comercial.

**Why this priority**: Es el valor central del módulo: sin poder registrar Activities no
existe historial de interacciones que consultar.

**Independent Test**: Puede probarse creando una Activity de un tipo dado, asociada a un
Customer existente (spec 008), editándola y cambiando su estado, sin depender de
adjuntos, comentarios ni búsqueda.

**Acceptance Scenarios**:

1. **Given** un Customer, Contact, Lead u Opportunity existente, **When** un usuario
   registra una Activity con tipo, título, fecha/hora y duración, **Then** la Activity
   queda creada en estado `Pendiente` asociada a esa entidad.
2. **Given** una Organization, **When** un Administrador configura sus propios tipos de
   Activity, **Then** esos tipos quedan disponibles para registrar nuevas Activities en
   esa Organization.
3. **Given** una Activity `Pendiente`, **When** el usuario la marca como `En proceso` o
   `Finalizada`, **Then** el estado se actualiza y la fecha de finalización se registra
   cuando corresponde.
4. **Given** una Activity, **When** el usuario la cancela, **Then** pasa a estado
   `Cancelada` sin eliminarse físicamente (RN-005).
5. **Given** una Activity con más de un participante, **When** se registra, **Then**
   el sistema conserva la lista completa de participantes (RF-003).
6. **Given** una Activity `Cancelada`, **When** el usuario la reactiva, **Then** vuelve
   al estado `Pendiente` (ver Clarifications).

---

### User Story 2 - Resultado y próxima actividad programada (Priority: P2)

Como Vendedor, quiero registrar el resultado de una Activity y programar la siguiente
acción, para mantener el hilo de la negociación sin perder contexto entre una
interacción y la siguiente.

**Why this priority**: Aporta valor de seguimiento sobre Activities ya registradas
(US1); no bloquea el registro básico de interacciones.

**Independent Test**: Con una Activity finalizada, puede probarse registrando su
resultado y programando una nueva Activity relacionada como próxima acción.

**Acceptance Scenarios**:

1. **Given** una Activity `Finalizada`, **When** el usuario registra su resultado,
   **Then** ese resultado queda visible en el historial de la Activity.
2. **Given** una Activity finalizada, **When** el usuario programa una próxima Activity
   relacionada, **Then** se crea una nueva Activity `Pendiente` vinculada a la misma
   entidad (Customer/Contact/Lead/Opportunity) y, cuando aplique, a la Activity que la
   originó.

---

### User Story 3 - Adjuntos y comentarios internos (Priority: P3)

Como usuario comercial, quiero adjuntar documentos y agregar comentarios internos a una
Activity, para complementar el registro con evidencia y contexto adicional del equipo.

**Why this priority**: Enriquece el registro ya existente (US1); no es necesaria para
que el módulo cumpla su función básica de trazabilidad.

**Independent Test**: Con una Activity ya creada, puede probarse adjuntando un archivo y
agregando un comentario, verificando que ambos quedan asociados y visibles.

**Acceptance Scenarios**:

1. **Given** una Activity, **When** un usuario adjunta un archivo, **Then** el archivo
   queda disponible mientras exista la Activity (RN-007).
2. **Given** una Activity, **When** un usuario agrega un comentario interno, **Then**
   el comentario queda visible para el resto del equipo con esa Organization.

---

### User Story 4 - Línea de tiempo automática por entidad relacionada (Priority: P4)

Como usuario comercial, quiero que las Activities de un Customer, Contact, Lead u
Opportunity aparezcan automáticamente en su línea de tiempo, para ver el historial
completo de interacciones sin tener que buscarlas por separado.

**Why this priority**: Conecta el valor de US1-US3 con las fichas de otras entidades
(specs 008-011); depende de que ya existan Activities registradas.

**Independent Test**: Con varias Activities registradas para un mismo Customer, puede
probarse consultando la línea de tiempo de ese Customer (spec 008) y verificando que
todas las Activities aparecen ordenadas cronológicamente sin pasos adicionales.

**Acceptance Scenarios**:

1. **Given** un Customer con Activities registradas, **When** se consulta su línea de
   tiempo, **Then** todas sus Activities aparecen automáticamente, ordenadas
   cronológicamente, sin necesidad de vincularlas manualmente.
2. **Given** una Activity asociada a más de una entidad (por ejemplo, un Contact y su
   Opportunity), **When** se consulta la línea de tiempo de cada una, **Then** la
   Activity aparece en ambas.

---

### User Story 5 - Búsqueda y filtrado de Activities (Priority: P5)

Como Gerente Comercial, quiero buscar y filtrar Activities por tipo, entidad
relacionada, usuario, estado, prioridad, fecha o etiquetas, para revisar el trabajo del
equipo sin depender de la ficha de cada Customer.

**Why this priority**: Aporta valor de supervisión y reporting sobre Activities ya
existentes (US1); no bloquea el registro ni la consulta básica desde cada entidad.

**Independent Test**: Con varias Activities registradas por distintos usuarios, puede
probarse buscando y filtrando por distintos atributos.

**Acceptance Scenarios**:

1. **Given** varias Activities registradas, **When** se busca por tipo, Customer,
   Contact, Lead, Opportunity, usuario, estado, prioridad, fecha o etiquetas, **Then**
   el sistema devuelve las que coinciden en menos de 300 ms.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente una Activity, en cualquier estado? El
  sistema MUST impedirlo siempre (RN-005, FR-011) — ninguna Activity admite
  eliminación física, ni siquiera `Pendiente`/`En proceso`/`Cancelada`; para una
  Activity no finalizada, la única baja funcional disponible es la transición a
  `Cancelada` (ver Clarifications, sesión 2026-07-05).
- ¿Qué ocurre si se elimina o archiva la entidad relacionada (por ejemplo, un Customer
  archivado, spec 008)? El sistema MUST conservar las Activities asociadas visibles en
  modo solo lectura, igual que el resto de los datos de esa entidad.
- ¿Qué pasa si una Activity no tiene ninguna entidad relacionada asociada? El sistema
  MUST impedirlo: toda Activity debe asociarse al menos a un Customer, Contact, Lead u
  Opportunity (RN-004 implica al menos una relación).
- ¿Qué pasa si se asocian varias entidades relacionadas a la vez que no pertenecen al
  mismo Customer (por ejemplo, un Contact de un Customer y una Opportunity de otro)? El
  sistema MUST rechazarlo: todas las entidades relacionadas asociadas simultáneamente a
  una misma Activity deben remitir al mismo Customer (ver Clarifications).
- ¿Qué sucede si dos usuarios editan la misma Activity al mismo tiempo? El sistema MUST
  conservar el último cambio guardado sin corromper el registro, informando al segundo
  usuario que los datos se actualizaron.
- ¿Qué pasa si se adjunta un archivo a una Activity y luego la Activity se cancela? El
  sistema MUST conservar el adjunto accesible, ya que la cancelación no elimina la
  Activity (RN-007).
- ¿Qué pasa si un usuario intenta editar o eliminar un comentario interno que no es
  suyo? El sistema MUST rechazarlo: solo el autor del comentario puede editarlo o
  eliminarlo (ver Clarifications).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir registrar Activities manualmente con tipo,
  título, descripción, fecha/hora, duración, estado y prioridad.
- **FR-002**: El sistema MUST permitir asociar una Activity a uno o más de: Customer,
  Contact, Lead, Opportunity.
- **FR-002a**: El sistema MUST exigir que, cuando se asocian varias entidades
  relacionadas a la vez a una misma Activity, todas remitan al mismo Customer (ver
  Clarifications).
- **FR-003**: El sistema MUST permitir registrar múltiples participantes en una
  Activity.
- **FR-004**: El sistema MUST permitir adjuntar documentos a una Activity.
- **FR-005**: El sistema MUST permitir agregar comentarios internos a una Activity.
- **FR-005a**: El sistema MUST permitir que el autor de un comentario interno lo edite
  o lo elimine; ningún otro usuario (salvo lo ya cubierto por permisos de
  administración) puede hacerlo (ver Clarifications).
- **FR-006**: El sistema MUST permitir registrar el resultado de una Activity
  finalizada.
- **FR-007**: El sistema MUST permitir programar una próxima Activity relacionada desde
  una Activity existente.
- **FR-008**: El sistema MUST permitir buscar y filtrar Activities por tipo, entidad
  relacionada, usuario responsable, estado, prioridad, fecha o etiquetas.
- **FR-009**: El sistema MUST mostrar automáticamente las Activities de un Customer,
  Contact, Lead u Opportunity en la línea de tiempo de esa entidad, ordenadas
  cronológicamente.
- **FR-010**: El sistema MUST soportar tipos de Activity configurables por
  Organization, con un catálogo por defecto (Llamada, Reunión, Correo electrónico,
  Videollamada, Nota, Visita, Mensaje, Seguimiento, Presentación, Demostración,
  Capacitación, Otro).
- **FR-011**: El sistema MUST impedir la eliminación física de una Activity, sin
  importar su estado (`Pendiente`, `En proceso`, `Finalizada` o `Cancelada`) — ver
  Clarifications, sesión 2026-07-05.
- **FR-011a**: El sistema MUST permitir reactivar una Activity `Cancelada`,
  devolviéndola al estado `Pendiente` (ver Clarifications).
- **FR-012**: El sistema MUST registrar en el Audit Log la creación, modificación,
  cambio de estado, cancelación, finalización, comentarios y adjuntos de una Activity.
- **FR-013**: El sistema MUST garantizar que las Activities de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Activity**: Interacción realizada con un Customer, Contact, Lead u Opportunity (ver
  [Domain Model](../../docs/domain-model.md)); posee autor, fecha y al menos una
  entidad relacionada. Atributos: información general (tipo, título, descripción,
  fecha/hora, duración, estado, prioridad), relaciones (Organization, Customer,
  Contact, Lead, Opportunity, autor, usuario responsable, participantes) e información
  adicional (adjuntos, comentarios, resultado, próxima acción, etiquetas). **Autor**
  (`authorUserId`, quien la creó, inmutable) y **usuario responsable**
  (`ownerUserId`, a quién está asignada, reasignable) son campos independientes —
  mismo patrón que `Lead.ownerUserId`/`Opportunity.ownerUserId` (ver Clarifications).
- **ActivityType**: Tipo de Activity, configurable por Organization (catálogo por
  defecto: Llamada, Reunión, Correo electrónico, Videollamada, Nota, Visita, Mensaje,
  Seguimiento, Presentación, Demostración, Capacitación, Otro).
- **ActivityStatus**: Estado de la Activity: `Pendiente`, `En proceso`, `Finalizada`,
  `Cancelada` (reactivable a `Pendiente`, ver Clarifications).
- **Prioridad**: reutiliza la misma escala baja/media/alta ya usada en Customer, Lead
  y Opportunity (ver Clarifications) — no es un enum nuevo específico de Activity.
- **Attachment**: Documento adjunto a una Activity.
- **Comment**: Comentario interno asociado a una Activity; editable/eliminable solo
  por su autor (ver Clarifications).
- **Audit Log**: Registro inmutable de creación/modificación/cambio de estado/
  cancelación/finalización/comentarios/adjuntos de Activities.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede registrar una Activity nueva en menos de 1 minuto desde
  la ficha de cualquier Customer, Contact, Lead u Opportunity.
- **SC-002**: Las búsquedas de Activities devuelven resultados en menos de 300 ms en el
  95% de los casos.
- **SC-003**: El sistema soporta al menos 1 millón de Activities por Organization sin
  degradar el tiempo de búsqueda definido en SC-002.
- **SC-004**: El 100% de las Activities registradas para una entidad aparecen en su
  línea de tiempo sin pasos manuales adicionales.
- **SC-005**: El 100% de las acciones de creación, modificación, cambio de estado,
  cancelación y finalización quedan registradas en el Audit Log.
- **SC-006**: El 0% de las Activities, sin importar su estado, puede eliminarse
  físicamente (ver Clarifications, sesión 2026-07-05).

## Assumptions

- Una Activity puede asociarse simultáneamente a más de una entidad (por ejemplo, un
  Contact y la Opportunity de su Customer), consistente con RN-004 del input.
- Los "Recordatorios" mencionados en el Alcance del input se interpretan como parte de
  "próxima acción" (FR-007), no como un sistema de notificaciones independiente; un
  módulo de notificaciones dedicado (Fase 5 del roadmap, Collaboration) podrá
  construirse sobre esta base más adelante.
- El calendario, la gestión de tareas propiamente dicha, las automatizaciones y las
  integraciones con correo/telefonía quedan explícitamente fuera de alcance de esta
  spec, según el input, y se definirán en especificaciones futuras (Fase 5 del
  roadmap).
- Los "participantes" de una Activity (FR-003) son Users de la Organization; los
  Contacts asociados a la Activity se registran mediante la relación estándar
  (FR-002), no como "participantes" en el mismo sentido.
