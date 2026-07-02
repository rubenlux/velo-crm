# Feature Specification: Calendario y Agenda

**Feature Branch**: `014-calendar`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-014 — Calendario y Agenda. Planificar, organizar y visualizar eventos, reuniones, actividades y tareas programadas: calendario corporativo y agenda personal, participantes internos/externos con aceptación/rechazo de invitación, disponibilidad de usuarios, eventos recurrentes, recordatorios configurables, vistas múltiples (Día/Semana/Mes/Agenda/Mis eventos/Equipo/Comercial), integración con Customer/Contact/Lead/Opportunity/Activity/Task, con auditoría completa y aislamiento entre organizaciones. No incluye videollamadas, sincronización con Google Calendar/Outlook, reserva de salas ni automatizaciones."

**Nota de terminología**: Esta especificación posee la entidad `CalendarEvent` del
bounded context **Collaboration** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md),
que ya la listaba junto a `Task`, `Document` y `Notification`). Un `CalendarEvent` es
**distinto** de una `Activity` (spec 012) y de una `Task` (spec 013): un CalendarEvent
representa un compromiso de tiempo/agenda (con fecha, hora y participantes que aceptan o
rechazan asistir), mientras que una Activity registra una interacción ya ocurrida y una
Task representa trabajo pendiente sin necesariamente un horario fijo. Un CalendarEvent
puede asociarse a Customer (008), Contact (009), Lead (010), Opportunity (011), Activity
(012) o Task (013), sin redefinir ninguna de esas entidades.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear, editar y cancelar eventos (Priority: P1) 🎯

Como Usuario de una Organization, quiero crear un evento con fecha, horario y
descripción, editarlo si cambian los planes, y cancelarlo si ya no se realiza, para
mantener mi agenda y la del equipo siempre al día.

**Why this priority**: Es el valor central del módulo: sin poder crear/editar/cancelar
eventos no hay agenda que gestionar en las historias siguientes.

**Independent Test**: Puede probarse creando un evento con fecha y horario válidos,
editando su horario (reprogramación) y cancelándolo, sin depender de participantes,
recordatorios ni vistas.

**Acceptance Scenarios**:

1. **Given** una Organization, **When** un Usuario crea un evento con título, tipo,
   fecha/hora de inicio y fin, **Then** el evento queda creado en estado `Programado`
   con ese Usuario como organizador.
2. **Given** un evento, **When** se intenta guardar con fecha de finalización anterior a
   la de inicio, **Then** el sistema lo rechaza (RN-003).
3. **Given** un evento `Programado`, **When** el organizador cambia su fecha/hora
   (reprogramación), **Then** el cambio se registra y los participantes ven la nueva
   fecha/hora.
4. **Given** un evento, **When** el organizador lo cancela, **Then** pasa a estado
   `Cancelado` sin eliminarse físicamente (RN-008).
5. **Given** un evento `Finalizado`, **When** se intenta modificarlo sin permisos
   especiales, **Then** el sistema lo deniega (RN-006).

---

### User Story 2 - Participantes, invitaciones y disponibilidad (Priority: P2)

Como organizador de un evento, quiero agregar participantes internos y externos (Users,
Customers, Contacts, Leads), y ver su disponibilidad antes de agendar, para coordinar
reuniones sin superposiciones.

**Why this priority**: Aporta el valor de coordinación de equipo/cliente sobre eventos
ya creados (US1); un evento individual ya es útil sin participantes adicionales.

**Independent Test**: Con un evento ya creado, puede probarse agregando dos
participantes internos, verificando que cada uno puede aceptar o rechazar la
invitación, y consultando la disponibilidad de un Usuario antes de agendar un nuevo
evento en su horario.

**Acceptance Scenarios**:

1. **Given** un evento, **When** el organizador agrega participantes (Users, Customers,
   Contacts, Leads o invitados externos), **Then** cada uno queda invitado al evento.
2. **Given** un participante invitado, **When** acepta o rechaza la invitación, **Then**
   su respuesta queda registrada y visible para el organizador (RN-004).
3. **Given** un Usuario con eventos ya agendados en un horario, **When** otro Usuario
   consulta su disponibilidad para ese horario, **Then** el sistema indica que está
   ocupado en ese rango.

---

### User Story 3 - Recordatorios y eventos recurrentes (Priority: P3)

Como Usuario, quiero configurar recordatorios antes de un evento y crear eventos que se
repiten periódicamente, para no olvidar compromisos frecuentes ni tener que recrearlos
manualmente cada vez.

**Why this priority**: Aporta comodidad sobre eventos ya creados (US1/US2); un evento
único ya es funcional sin recordatorios ni recurrencia.

**Independent Test**: Puede probarse configurando un recordatorio sobre un evento
existente, y por separado creando un evento recurrente y verificando que genera
instancias independientes futuras.

**Acceptance Scenarios**:

1. **Given** un evento, **When** el Usuario configura uno o más recordatorios (por
   ejemplo, 15 minutos antes, 1 día antes), **Then** el sistema los asocia al evento.
2. **Given** un evento configurado como recurrente, **When** se guarda, **Then** el
   sistema genera instancias independientes futuras según la periodicidad definida
   (RN-005).
3. **Given** una instancia de un evento recurrente, **When** el Usuario la edita o
   cancela individualmente, **Then** el cambio afecta solo a esa instancia, no a la
   serie completa.

---

### User Story 4 - Vistas múltiples del calendario (Priority: P4)

Como Usuario o Gerente, quiero ver el calendario en distintas vistas (Día, Semana, Mes,
Agenda, Mis eventos, Equipo, Comercial), para planificar mi tiempo y supervisar la
agenda del equipo según lo que necesite en cada momento.

**Why this priority**: Mejora la usabilidad sobre eventos ya existentes (US1-US3); no
bloquea la creación/gestión básica de un evento individual.

**Independent Test**: Con varios eventos cargados en distintas fechas y de distintos
Usuarios, puede probarse alternando entre las vistas Día/Semana/Mes/Agenda y "Mis
eventos"/"Equipo", verificando que cada una muestra el subconjunto correcto de eventos.

**Acceptance Scenarios**:

1. **Given** varios eventos cargados, **When** el Usuario selecciona la vista Día,
   Semana, Mes o Agenda, **Then** el calendario muestra los eventos correspondientes a
   ese rango.
2. **Given** un Usuario, **When** selecciona "Mis eventos", **Then** ve únicamente los
   eventos donde es organizador o participante.
3. **Given** un Gerente, **When** selecciona la vista "Equipo", **Then** ve los eventos
   de los Users que gestiona (según su Role/Permission, spec 007).
4. **Given** eventos asociados a Customers/Opportunities, **When** se selecciona la
   vista "Calendario comercial", **Then** se muestran solo esos eventos comerciales.

---

### User Story 5 - Búsqueda, adjuntos y comentarios (Priority: P5)

Como Usuario, quiero buscar eventos por distintos atributos y adjuntar
documentos/comentarios a un evento, para encontrar rápidamente una reunión pasada o
futura y complementarla con contexto adicional.

**Why this priority**: Aporta valor de usabilidad y colaboración sobre eventos ya
existentes (US1-US4); no bloquea el uso básico del calendario.

**Independent Test**: Con varios eventos cargados, puede probarse buscando por distintos
atributos, y por separado adjuntando un archivo y un comentario a un evento existente.

**Acceptance Scenarios**:

1. **Given** varios eventos cargados, **When** se busca por título, Customer, Contact,
   responsable, participante, tipo, estado, fecha o etiquetas, **Then** el sistema
   devuelve los que coinciden.
2. **Given** un evento, **When** se adjunta un documento o se agrega un comentario,
   **Then** queda visible para el organizador y los participantes.

---

### Edge Cases

- ¿Qué pasa si se intenta modificar un evento `Finalizado` sin permisos especiales? El
  sistema MUST denegarlo y registrar el intento en el Audit Log (RN-006).
- ¿Qué ocurre si se cancela solo una instancia de un evento recurrente? El sistema MUST
  conservar el resto de la serie sin cambios (RN-005, US3).
- ¿Qué pasa si dos organizadores agendan eventos superpuestos para el mismo
  participante? El sistema MUST advertir la superposición (a partir de la disponibilidad
  consultada en US2), sin necesariamente bloquear la creación del segundo evento.
- ¿Qué sucede si un evento se asocia a una entidad archivada (por ejemplo, un Customer
  archivado, spec 008)? El sistema MUST conservar el evento visible en modo solo
  lectura desde la ficha de esa entidad, igual que el resto de sus datos.
- ¿Qué pasa si dos usuarios editan el mismo evento al mismo tiempo? El sistema MUST
  conservar el último cambio guardado sin corromper el registro, informando al segundo
  usuario que los datos se actualizaron.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear eventos manualmente con título,
  descripción, tipo, fecha/hora de inicio y fin (o marca de "todo el día"), y zona
  horaria.
- **FR-002**: El sistema MUST rechazar eventos cuya fecha de finalización sea anterior
  a la de inicio.
- **FR-003**: El sistema MUST exigir un organizador para cada evento.
- **FR-004**: El sistema MUST permitir editar cualquier dato de un evento y
  reprogramarlo (cambiar fecha/hora).
- **FR-005**: El sistema MUST permitir cancelar un evento (baja lógica) sin eliminarlo
  físicamente.
- **FR-006**: El sistema MUST impedir modificar un evento `Finalizado` salvo con
  permisos especiales.
- **FR-007**: El sistema MUST permitir agregar múltiples participantes internos
  (Users) y externos (Customers, Contacts, Leads, invitados externos) a un evento.
- **FR-008**: El sistema MUST permitir que cada participante acepte o rechace su
  invitación a un evento.
- **FR-009**: El sistema MUST permitir consultar la disponibilidad de un Usuario en un
  rango de fecha/hora dado, en base a sus eventos ya agendados.
- **FR-010**: El sistema MUST permitir configurar uno o más recordatorios por evento.
- **FR-011**: El sistema MUST permitir crear eventos recurrentes, generando instancias
  independientes que pueden editarse o cancelarse individualmente.
- **FR-012**: El sistema MUST permitir asociar un evento a un Customer, Contact, Lead,
  Opportunity, Activity o Task, de forma opcional.
- **FR-013**: El sistema MUST proveer al menos las vistas: Día, Semana, Mes, Agenda,
  Mis eventos, Equipo y Calendario comercial.
- **FR-014**: El sistema MUST permitir buscar y filtrar eventos por título, Customer,
  Contact, responsable, participante, tipo, estado, fecha o etiquetas.
- **FR-015**: El sistema MUST permitir adjuntar documentos y agregar comentarios a un
  evento.
- **FR-016**: El sistema MUST registrar en el Audit Log la creación, modificación,
  reprogramación, cambio de participantes, cancelación, finalización y archivado de
  eventos.
- **FR-017**: El sistema MUST garantizar que los eventos de una Organization nunca sean
  visibles ni modificables desde otra Organization.

### Key Entities

- **CalendarEvent**: Actividad programada en una fecha y horario determinado (ver
  [Domain Model](../../docs/domain-model.md) y
  [Bounded Contexts](../../docs/bounded-contexts.md)); distinta de `Activity` (spec
  012) y `Task` (spec 013). Atributos: información general (título, descripción, tipo,
  estado), programación (fecha/hora de inicio y fin, todo el día, zona horaria),
  ubicación (dirección, sala, enlace virtual, coordenadas opcionales) y adicional
  (prioridad, color, etiquetas, adjuntos, comentarios).
- **EventType**: Tipo de evento, configurable por Organization (catálogo por defecto:
  Reunión, Llamada, Videollamada, Visita, Capacitación, Recordatorio, Evento interno,
  Evento comercial, Evento personalizado).
- **EventStatus**: Estado del evento: `Programado`, `Confirmado`, `En curso`,
  `Finalizado`, `Cancelado`, `Archivado`.
- **Participant**: Persona invitada a un evento (User interno, Customer, Contact, Lead
  o invitado externo), con su respuesta de aceptación/rechazo.
- **Reminder**: Recordatorio configurado sobre un evento (por ejemplo, 15 minutos
  antes, 1 día antes).
- **RecurrenceRule**: Regla de repetición de un evento recurrente, que genera
  instancias independientes.
- **Audit Log**: Registro inmutable de creación/modificación/reprogramación/cambio de
  participantes/cancelación/finalización/archivado de eventos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Usuario puede crear un evento nuevo con sus datos principales en menos
  de 1 minuto.
- **SC-002**: Las búsquedas de eventos devuelven resultados en menos de 300 ms en el
  95% de los casos.
- **SC-003**: El sistema soporta al menos 1 millón de eventos por Organization sin
  degradar el tiempo de búsqueda definido en SC-002.
- **SC-004**: El 100% de las acciones de creación, modificación, reprogramación,
  cancelación y archivado quedan registradas en el Audit Log.
- **SC-005**: El 0% de los eventos `Finalizado` puede modificarse sin permisos
  especiales.
- **SC-006**: Un Usuario puede consultar la disponibilidad de otro Usuario para un
  horario dado en menos de 2 segundos.
- **SC-007**: El 100% de las instancias de un evento recurrente pueden editarse o
  cancelarse individualmente sin afectar al resto de la serie.

## Assumptions

- Los recordatorios (FR-010) se envían en esta fase como notificación interna dentro
  de VELO; el envío por email o push queda marcado como "futuro" en el input y se
  define en la fase de Notifications (Collaboration).
- La "disponibilidad" (FR-009, US2) se calcula únicamente a partir de eventos ya
  agendados en VELO; no hay integración con calendarios externos en esta fase
  (explícitamente fuera de alcance).
- Los "permisos especiales" para editar un evento `Finalizado` (RN-006) se resuelven
  con el sistema de Roles/Permissions ya definido en
  [specs/007-roles-permissions/spec.md](../007-roles-permissions/spec.md), sin definir
  un mecanismo de permisos nuevo acá.
- Videollamadas, sincronización con Google Calendar/Outlook, integración con Zoom/Meet/
  Teams, reserva de salas/recursos, automatizaciones e IA de programación quedan
  explícitamente fuera de alcance de esta fase, según el input.
- Un `CalendarEvent` puede existir sin ninguna relación con Customer/Contact/Lead/
  Opportunity/Activity/Task; es válido como evento puramente interno/personal de un
  Usuario.
