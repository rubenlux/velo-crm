# Feature Specification: Gestión de Tareas

**Feature Branch**: `013-tasks`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-013 — Gestión de Tareas. Planificar, asignar, ejecutar y controlar tareas derivadas de la operación comercial y administrativa: responsable obligatorio, colaboradores, prioridades, estados, fechas límite, subtareas, comentarios, adjuntos, tiempo estimado/real, vistas (Lista, Kanban, Mis tareas, Equipo, Próximas a vencer, Vencidas, Completadas), relación con Customer/Contact/Lead/Opportunity/Activity/Documento, con auditoría completa y aislamiento entre organizaciones. No incluye calendario, automatizaciones, workflows, gestión completa de proyectos ni diagramas de Gantt."

**Nota de terminología**: Esta especificación posee la entidad `Task` del bounded
context **Collaboration** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)).
`Task` es una entidad **distinta** de `Activity` (spec 012): una Activity registra una
interacción ya ocurrida (llamada, reunión, email — un hecho pasado), mientras que una
Task representa trabajo pendiente por ejecutar con responsable y fecha límite (un
compromiso futuro). Una Task puede asociarse a Customer (008), Contact (009), Lead
(010), Opportunity (011) o Activity (012), pero no redefine ninguna de esas entidades.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y asignar Tasks (Priority: P1) 🎯

Como Usuario de una Organization, quiero crear una Task con un responsable obligatorio,
prioridad y fecha límite, para dejar claro qué hay que hacer, quién lo hace y para
cuándo.

**Why this priority**: Es el valor central del módulo: sin poder crear y asignar Tasks
no hay nada que gestionar en las historias siguientes.

**Independent Test**: Puede probarse creando una Task con título, responsable, prioridad
y fecha límite, opcionalmente asociada a un Customer u Opportunity existente, sin
depender de subtareas, comentarios ni vistas.

**Acceptance Scenarios**:

1. **Given** una Organization, **When** un Usuario crea una Task con título, responsable
   y fecha límite, **Then** la Task queda creada en estado `Pendiente` con ese
   responsable.
2. **Given** una Task, **When** se intenta crear sin responsable, **Then** el sistema lo
   impide (RN-003: toda Task debe tener al menos un responsable).
3. **Given** una Task, **When** el creador agrega uno o más colaboradores, **Then** esos
   colaboradores quedan asociados sin reemplazar al responsable principal.
4. **Given** una Task, **When** se asocia a un Customer, Contact, Lead, Opportunity o
   Activity existente, **Then** queda vinculada a esa entidad y visible desde su ficha.
5. **Given** una Task, **When** el responsable cambia su prioridad, **Then** el nuevo
   valor (Muy Baja, Baja, Media, Alta, Crítica) se refleja de inmediato.

---

### User Story 2 - Ejecutar y controlar el avance de una Task (Priority: P2)

Como responsable de una Task, quiero cambiar su estado a medida que avanzo y registrar
el tiempo real empleado, para reflejar el progreso real del trabajo.

**Why this priority**: Aporta valor de seguimiento sobre Tasks ya creadas (US1); no
bloquea la creación/asignación básica.

**Independent Test**: Con una Task ya creada, puede probarse moviéndola por sus estados
(Pendiente → En progreso → Completada), y registrando tiempo estimado/real.

**Acceptance Scenarios**:

1. **Given** una Task `Pendiente`, **When** el responsable la marca `En progreso`,
   **Then** el estado se actualiza y queda visible para todos los que la ven.
2. **Given** una Task, **When** el responsable la marca `Completada`, **Then** se
   registra la fecha de finalización y la Task conserva todo su historial (RN-006).
3. **Given** una Task, **When** el responsable la marca `Cancelada`, **Then** pasa a ese
   estado sin eliminarse físicamente (RN-007).
4. **Given** una Task con tiempo estimado definido, **When** el responsable registra el
   tiempo real empleado al completarla, **Then** ambos valores quedan visibles para
   comparación.
5. **Given** una Task, **When** se intenta eliminarla físicamente, **Then** el sistema lo
   rechaza: solo existen los estados `Cancelada`/`Archivada` como baja lógica.

---

### User Story 3 - Descomponer una Task en subtareas (Priority: P3)

Como Usuario, quiero dividir una Task compleja en subtareas más pequeñas, para
organizar y repartir mejor el trabajo.

**Why this priority**: Aporta valor de organización sobre Tasks ya existentes (US1); una
Task simple no necesita subtareas para ser útil.

**Independent Test**: Con una Task creada, puede probarse agregando dos o más subtareas
y verificando que cada una puede gestionarse (estado, responsable) de forma
independiente sin perder su vínculo con la Task principal.

**Acceptance Scenarios**:

1. **Given** una Task, **When** el Usuario crea una subtarea, **Then** queda vinculada
   como hija de esa Task, con su propio responsable, estado y fecha límite.
2. **Given** una Task con subtareas, **When** se consulta su avance, **Then** el sistema
   muestra cuántas subtareas están completadas respecto del total.

---

### User Story 4 - Comentarios y adjuntos en una Task (Priority: P4)

Como Usuario, quiero agregar comentarios y adjuntar archivos a una Task, para dejar
contexto adicional visible para el responsable y los colaboradores.

**Why this priority**: Enriquece el trabajo colaborativo sobre Tasks ya existentes
(US1); no es necesaria para el funcionamiento básico del módulo.

**Independent Test**: Con una Task ya creada, puede probarse agregando un comentario y
adjuntando un archivo, verificando que ambos quedan visibles para responsable y
colaboradores.

**Acceptance Scenarios**:

1. **Given** una Task, **When** un colaborador agrega un comentario, **Then** queda
   visible para el responsable y el resto de los colaboradores.
2. **Given** una Task, **When** se adjunta un archivo, **Then** queda disponible
   mientras exista la Task.

---

### User Story 5 - Vistas y búsqueda de Tasks (Priority: P5)

Como Usuario o Gerente, quiero ver mis Tasks (o las de mi equipo) en distintas vistas
(Lista, Kanban, Próximas a vencer, Vencidas, Completadas) y buscarlas por distintos
atributos, para organizar mi trabajo diario y supervisar al equipo.

**Why this priority**: Mejora la usabilidad sobre Tasks ya existentes (US1-US4); no
bloquea la gestión básica de una Task individual.

**Independent Test**: Con varias Tasks en distintos estados y responsables, puede
probarse consultando la vista "Mis tareas", la vista Kanban por estado, y buscando por
distintos atributos.

**Acceptance Scenarios**:

1. **Given** varias Tasks asignadas a distintos Users, **When** un Usuario consulta "Mis
   tareas", **Then** ve únicamente las Tasks donde es responsable o colaborador.
2. **Given** un Gerente, **When** consulta "Tareas del equipo", **Then** ve las Tasks de
   los Users que gestiona (según su Role/Permission, ver spec 007).
3. **Given** Tasks con fecha límite, **When** se consultan las vistas "Próximas a
   vencer" y "Vencidas", **Then** cada Task aparece en la vista correcta según su fecha
   límite y estado actual.
4. **Given** varias Tasks, **When** se busca por título, responsable, Customer,
   Opportunity, estado, prioridad, fecha o etiquetas, **Then** el sistema devuelve las
   que coinciden.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente una Task `Completada`? El sistema MUST
  impedirlo (RN-007); solo existen `Cancelada`/`Archivada` como baja lógica.
- ¿Qué ocurre si se completa una Task que tiene subtareas sin completar? El sistema
  MUST permitirlo, pero MUST advertir claramente que quedan subtareas pendientes antes
  de confirmar.
- ¿Qué pasa si se elimina el responsable principal de una Organization (ver spec 006)
  mientras tiene Tasks asignadas? El sistema MUST exigir reasignar sus Tasks activas
  antes de completar la desactivación de ese User.
- ¿Qué sucede si dos usuarios editan la misma Task al mismo tiempo? El sistema MUST
  conservar el último cambio guardado sin corromper el registro, informando al segundo
  usuario que los datos se actualizaron.
- ¿Qué pasa si una Task no está asociada a ninguna entidad del CRM (Customer, Contact,
  Lead, Opportunity, Activity)? El sistema MUST permitirlo: una Task puede ser
  puramente administrativa/interna, sin relación obligatoria con otra entidad.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear Tasks manualmente con título, descripción,
  prioridad y fecha límite.
- **FR-002**: El sistema MUST exigir un responsable principal obligatorio por Task.
- **FR-003**: El sistema MUST permitir asignar uno o más colaboradores adicionales a
  una Task.
- **FR-004**: El sistema MUST permitir modificar el estado de una Task entre
  `Pendiente`, `En progreso`, `En espera`, `Completada`, `Cancelada`, `Archivada`.
- **FR-005**: El sistema MUST permitir modificar la prioridad de una Task entre `Muy
  Baja`, `Baja`, `Media`, `Alta`, `Crítica`.
- **FR-006**: El sistema MUST permitir crear subtareas vinculadas a una Task, cada una
  con su propio responsable, estado y fecha límite.
- **FR-007**: El sistema MUST permitir adjuntar documentos a una Task.
- **FR-008**: El sistema MUST permitir agregar comentarios internos a una Task.
- **FR-009**: El sistema MUST permitir registrar tiempo estimado y tiempo real empleado
  en una Task.
- **FR-010**: El sistema MUST permitir asociar una Task a un Customer, Contact, Lead,
  Opportunity, Activity o Documento, de forma opcional.
- **FR-011**: El sistema MUST proveer al menos las vistas: Lista, Kanban, Mis tareas,
  Tareas del equipo, Próximas a vencer, Vencidas y Completadas.
- **FR-012**: El sistema MUST permitir buscar y filtrar Tasks por título, responsable,
  Customer, Opportunity, estado, prioridad, fecha o etiquetas.
- **FR-013**: El sistema MUST impedir la eliminación física de una Task; solo
  `Cancelada`/`Archivada` existen como baja lógica.
- **FR-014**: El sistema MUST registrar en el Audit Log la creación, modificación,
  cambio de responsable, cambio de prioridad, cambio de estado, comentarios, adjuntos,
  finalización, cancelación y archivado de una Task.
- **FR-015**: El sistema MUST garantizar que las Tasks de una Organization nunca sean
  visibles ni modificables desde otra Organization.

### Key Entities

- **Task**: Acción a ejecutar dentro de un plazo por uno o varios responsables (ver
  [Domain Model](../../docs/domain-model.md)); distinta de `Activity` (spec 012, un
  hecho ya ocurrido). Atributos: información general (título, descripción, estado,
  prioridad, fecha de creación, fecha límite, fecha de finalización), responsables
  (creador, responsable principal, colaboradores) y adicional (etiquetas, adjuntos,
  comentarios, tiempo estimado, tiempo real).
- **Subtask**: Task hija vinculada a una Task principal, con su propio ciclo de vida.
- **TaskStatus**: Estado de la Task: `Pendiente`, `En progreso`, `En espera`,
  `Completada`, `Cancelada`, `Archivada`.
- **TaskPriority**: Prioridad de la Task: `Muy Baja`, `Baja`, `Media`, `Alta`,
  `Crítica`.
- **Comment**: Comentario interno asociado a una Task (mismo concepto que en spec 012).
- **Attachment**: Documento adjunto a una Task (mismo concepto que en spec 012).
- **Audit Log**: Registro inmutable de creación/modificación/cambio de responsable/
  cambio de prioridad/cambio de estado/comentarios/adjuntos/finalización/cancelación/
  archivado de Tasks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Usuario puede crear y asignar una Task nueva en menos de 1 minuto.
- **SC-002**: Las búsquedas de Tasks devuelven resultados en menos de 300 ms en el 95%
  de los casos.
- **SC-003**: El sistema soporta al menos 1 millón de Tasks por Organization sin
  degradar el tiempo de búsqueda definido en SC-002.
- **SC-004**: El 100% de las acciones de creación, modificación, cambio de estado,
  finalización, cancelación y archivado quedan registradas en el Audit Log.
- **SC-005**: El 0% de las Tasks `Completada`/`Cancelada` puede eliminarse físicamente.
- **SC-006**: Un Usuario puede identificar sus Tasks vencidas desde la vista "Vencidas"
  en menos de 3 segundos desde que ingresa al módulo.

## Assumptions

- Los "Recordatorios" mencionados en el Alcance del input se resuelven mediante las
  vistas "Próximas a vencer"/"Vencidas" (FR-011) y no como un sistema de notificaciones
  push/email independiente; ese sistema, si se construye, pertenecerá a una fase futura
  de Collaboration/Notifications.
- "Tareas del equipo" (una de las vistas de FR-011) muestra las Tasks de los Users que
  el que consulta puede supervisar según su Role/Permission (spec 007); esta spec no
  redefine esas reglas de autorización, solo las consume.
- Las dependencias entre tareas, la gestión completa de proyectos, los diagramas de
  Gantt, las automatizaciones y las integraciones con herramientas externas (Trello,
  Jira, Asana) quedan explícitamente fuera de alcance de esta fase, según el input.
- Una Task puede existir sin ninguna relación con Customer/Contact/Lead/Opportunity/
  Activity (RN del input no lo prohíbe); es válida como tarea puramente
  administrativa/interna de la Organization.
