# Feature Specification: Gestión de Notificaciones

**Feature Branch**: `024-notifications`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-024 — Gestión de Notificaciones. Informar a los usuarios sobre eventos relevantes del sistema en tiempo real, como servicio transversal usado por todos los módulos: notificaciones en la aplicación con centro de notificaciones (pendientes/leídas/archivadas/todas), tipos (información/advertencia/error/éxito/recordatorio/seguridad/comercial/sistema), prioridades (baja/normal/alta/crítica), destinatarios (usuario/rol/organización), asociación opcional con cualquier entidad, agrupación de notificaciones similares, preferencias por usuario, búsqueda, con auditoría completa y aislamiento entre organizaciones y entre usuarios. No incluye email, SMS, WhatsApp, push notifications ni integraciones externas."

**Nota de terminología**: Esta especificación posee la entidad `Notification` del
bounded context **Collaboration** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md),
que ya la anticipaba junto a `Task`, `CalendarEvent` y `Document`). Es el mecanismo de
notificación interna al que ya referenciaban de forma genérica specs anteriores
(por ejemplo, spec 004 "recordatorios... notificación interna", spec 014 "recordatorios
se envían como notificación interna"). Esta feature define cómo se genera, entrega y
gestiona una Notification dentro de la aplicación; no incluye canales externos (email,
SMS, WhatsApp, push), que se definirán en specs futuras que reutilizarán esta entidad
como origen del contenido a enviar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar y consultar notificaciones (Priority: P1) 🎯

Como Usuario de una Organization, quiero recibir notificaciones automáticas de eventos
relevantes de cualquier módulo y consultarlas en un centro de notificaciones, para
enterarme de lo que requiere mi atención sin tener que revisar cada módulo por
separado.

**Why this priority**: Es el valor central del módulo: sin poder generar y consultar
notificaciones no hay nada que marcar como leído, archivar ni filtrar en las historias
siguientes.

**Independent Test**: Puede probarse generando una notificación de prueba (por ejemplo,
"nueva tarea asignada") dirigida a un Usuario, y verificando que aparece en su centro de
notificaciones con el contador de pendientes actualizado.

**Acceptance Scenarios**:

1. **Given** un evento relevante en cualquier módulo (por ejemplo, una Task asignada,
   spec 013), **When** ocurre, **Then** el sistema genera una Notification dirigida al
   Usuario, Role u Organization correspondiente (RN-002: todo destinatario definido).
2. **Given** un Usuario con notificaciones pendientes, **When** consulta su centro de
   notificaciones, **Then** ve un contador de pendientes y puede filtrar entre
   Pendientes, Leídas, Archivadas y Todas.
3. **Given** dos Users de la misma Organization, **When** cada uno consulta sus
   notificaciones, **Then** cada uno ve únicamente las suyas (regla de Seguridad:
   ningún Usuario ve notificaciones de otro salvo autorización específica).
4. **Given** una notificación generada, **When** se intenta modificar su contenido,
   **Then** el sistema lo impide (RN-003: no se modifican una vez enviadas).

---

### User Story 2 - Marcar notificaciones como leídas (Priority: P2)

Como Usuario, quiero marcar una notificación (o todas) como leída, para llevar control
de qué ya revisé y qué todavía no.

**Why this priority**: Es la interacción básica sobre notificaciones ya generadas
(US1); sin ella, el centro de notificaciones no distingue pendientes de revisadas.

**Independent Test**: Con varias notificaciones pendientes, puede probarse marcando una
como leída individualmente, y luego usando "marcar todas como leídas" para el resto.

**Acceptance Scenarios**:

1. **Given** una notificación `Pendiente`, **When** el Usuario la marca como leída,
   **Then** pasa a estado `Leída` con su fecha de lectura registrada.
2. **Given** varias notificaciones pendientes, **When** el Usuario elige "marcar todas
   como leídas", **Then** todas sus notificaciones pendientes pasan a `Leída`.

---

### User Story 3 - Archivar y eliminar notificaciones (Priority: P3)

Como Usuario, quiero archivar o eliminar (baja lógica) notificaciones que ya no
necesito ver en mi bandeja principal, para mantener mi centro de notificaciones
ordenado sin perder el historial.

**Why this priority**: Es mantenimiento sobre notificaciones ya leídas (US1/US2); no
bloquea la recepción y lectura básica.

**Independent Test**: Con una notificación leída, puede probarse archivándola y
verificando que sigue disponible para consulta (RN-004); por separado, eliminándola
lógicamente y verificando que ya no aparece en las vistas activas.

**Acceptance Scenarios**:

1. **Given** una notificación, **When** el Usuario la archiva, **Then** pasa a estado
   `Archivada` y permanece disponible para consulta (RN-004).
2. **Given** una notificación, **When** el Usuario la elimina, **Then** pasa a estado
   `Eliminada` (baja lógica, RN-005), sin eliminarse físicamente.

---

### User Story 4 - Configurar preferencias de notificación (Priority: P4)

Como Usuario, quiero configurar qué tipos y prioridades de notificación quiero recibir,
y cómo se agrupan, para adaptar el centro de notificaciones a lo que realmente me
importa.

**Why this priority**: Aporta personalización sobre un sistema de notificaciones ya
funcional (US1-US3); las notificaciones ya son útiles con la configuración por
defecto.

**Independent Test**: Puede probarse desactivando un tipo de notificación en las
preferencias de un Usuario, generando un evento de ese tipo, y verificando que no le
llega (o llega marcada de forma distinta según la configuración).

**Acceptance Scenarios**:

1. **Given** un Usuario, **When** configura sus preferencias de tipos y prioridades de
   notificación, **Then** las notificaciones futuras respetan esa configuración.
2. **Given** un Usuario, **When** configura la agrupación de notificaciones similares,
   **Then** el centro de notificaciones las agrupa según esa preferencia.

---

### User Story 5 - Búsqueda e indicadores (Priority: P5)

Como Usuario o Administrador, quiero buscar notificaciones por distintos atributos y
ver indicadores (total, pendientes, leídas, tiempo promedio de lectura, por módulo,
críticas), para encontrar una notificación puntual o entender patrones de uso.

**Why this priority**: Aporta valor de usabilidad y análisis sobre notificaciones ya
existentes (US1-US4); no bloquea el uso diario del centro de notificaciones.

**Independent Test**: Con varias notificaciones generadas desde distintos módulos,
puede probarse buscando por distintos atributos y consultando los indicadores.

**Acceptance Scenarios**:

1. **Given** varias notificaciones cargadas, **When** se busca por título, tipo,
   prioridad, estado, fecha, módulo de origen o usuario, **Then** el sistema devuelve
   las que coinciden.
2. **Given** las notificaciones de una Organization, **When** un Administrador
   consulta los indicadores, **Then** el sistema muestra correctamente el total,
   pendientes, leídas, archivadas, tiempo promedio de lectura, notificaciones por
   módulo y notificaciones críticas — sin exponer el contenido privado de
   notificaciones de otros Users salvo autorización específica.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente una notificación? El sistema MUST
  impedirlo (RN-005); solo existe `Archivada`/`Eliminada` como baja lógica.
- ¿Qué ocurre si una notificación tiene como destinatario un Role en lugar de un
  Usuario específico? El sistema MUST entregarla a todos los Users que tengan ese Role
  en la Organization al momento de generarse (spec 007).
- ¿Qué pasa si un Administrador intenta consultar el contenido de las notificaciones de
  otro Usuario sin autorización específica? El sistema MUST denegarlo (Seguridad del
  input); solo puede ver indicadores agregados, no el contenido individual.
- ¿Qué sucede si se genera una notificación para un Usuario que fue desactivado (spec
  006)? El sistema MUST generarla igualmente (queda en su historial), pero ese Usuario
  no podrá consultarla mientras esté `Inactive`/`Suspended`, consistente con spec 006.
- ¿Qué pasa si una notificación tiene fecha de vencimiento y esta se cumple sin haberse
  leído? El sistema MUST conservarla en el historial, dejando claro visualmente que
  venció, sin eliminarla automáticamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir que cualquier módulo de VELO genere
  notificaciones automáticamente ante eventos relevantes.
- **FR-002**: El sistema MUST exigir al menos un destinatario (Usuario, Role u
  Organization) por notificación.
- **FR-003**: El sistema MUST mostrar un contador de notificaciones pendientes por
  Usuario.
- **FR-004**: El sistema MUST proveer un centro de notificaciones con las vistas
  Pendientes, Leídas, Archivadas y Todas.
- **FR-005**: El sistema MUST permitir marcar una notificación, o todas las pendientes
  de un Usuario, como leídas.
- **FR-006**: El sistema MUST permitir archivar una notificación, conservándola
  disponible para consulta.
- **FR-007**: El sistema MUST permitir eliminar lógicamente una notificación sin
  eliminarla físicamente.
- **FR-008**: El sistema MUST permitir agrupar notificaciones similares en el centro
  de notificaciones.
- **FR-009**: El sistema MUST permitir a cada Usuario configurar sus preferencias de
  tipos, prioridades, agrupación y orden de visualización de notificaciones.
- **FR-010**: El sistema MUST impedir modificar el contenido de una notificación una
  vez generada.
- **FR-011**: El sistema MUST permitir buscar y filtrar notificaciones por título,
  tipo, prioridad, estado, fecha, módulo de origen o usuario.
- **FR-012**: El sistema MUST calcular indicadores: total, pendientes, leídas,
  archivadas, tiempo promedio de lectura, notificaciones por módulo y notificaciones
  críticas.
- **FR-013**: El sistema MUST garantizar que un Usuario solo pueda consultar sus
  propias notificaciones, salvo autorización específica para un Administrador.
- **FR-014**: El sistema MUST registrar en el Audit Log la generación, lectura,
  archivado, eliminación lógica y cambio de preferencias de notificaciones.
- **FR-015**: El sistema MUST garantizar que las notificaciones de una Organization
  nunca sean visibles ni modificables desde otra Organization.

### Key Entities

- **Notification**: Mensaje generado por el sistema para informar a uno o varios
  destinatarios sobre un evento relevante (ver
  [Domain Model](../../docs/domain-model.md) y
  [Bounded Contexts](../../docs/bounded-contexts.md)). Atributos: información general
  (título, mensaje, tipo, prioridad, estado), destinatarios (Usuario, Role,
  Organization) y adicional (fecha de creación, fecha de lectura, fecha de
  vencimiento, acción asociada). Puede asociarse opcionalmente a cualquier entidad del
  sistema (Customer, Lead, Opportunity, Activity, Task, Invoice, Payment, Purchase,
  Document, Workflow) como origen del evento.
- **NotificationType**: Tipo de Notification: Información, Advertencia, Error, Éxito,
  Recordatorio, Seguridad, Comercial, Sistema.
- **NotificationPriority**: Prioridad de la Notification: Baja, Normal, Alta, Crítica.
- **NotificationStatus**: Estado de la Notification: `Pendiente`, `Leída`,
  `Archivada`, `Eliminada` (baja lógica).
- **NotificationPreference**: Configuración por Usuario de qué tipos/prioridades
  recibir, agrupación y orden de visualización.
- **Audit Log**: Registro inmutable de generación/lectura/archivado/eliminación
  lógica/cambio de preferencias de notificaciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una notificación generada por un evento del sistema aparece en el centro
  de notificaciones del destinatario en menos de 5 segundos.
- **SC-002**: El 100% de los Users solo pueden consultar sus propias notificaciones,
  salvo autorización específica.
- **SC-003**: El 100% de las acciones de generación, lectura, archivado y eliminación
  lógica quedan registradas en el Audit Log.
- **SC-004**: El 0% de las notificaciones puede eliminarse físicamente.
- **SC-005**: El 100% de las preferencias configuradas por un Usuario se respetan en
  las notificaciones generadas después de guardarlas.
- **SC-006**: Las búsquedas de notificaciones devuelven resultados en menos de 300 ms
  en el 95% de los casos.
- **SC-007**: El sistema soporta al menos 1 millón de notificaciones por Organization
  sin degradar el tiempo de búsqueda definido en SC-006.

## Assumptions

- "Entrega en tiempo real" (RNF del input) se interpreta como que la notificación
  queda disponible de inmediato en el centro de notificaciones al consultarlo; el
  mecanismo técnico concreto (polling, WebSocket u otro) se decide en la fase de
  planificación técnica.
- Los "recordatorios" ya mencionados como "notificación interna" en spec 004
  (verificación de sesión) y spec 014 (recordatorios de eventos) se implementan sobre
  esta entidad `Notification`; esta spec es la base que esas referencias asumían.
- Email, SMS, WhatsApp, Push Notifications e integraciones con Slack/Teams/Discord
  quedan explícitamente fuera de alcance de esta fase, según el input; se definirán en
  specs futuras de canales externos que reutilizarán `Notification` como origen del
  contenido a enviar, sin redefinirla.
- Las notificaciones inteligentes mediante IA (mencionadas como fuera de alcance)
  corresponden a la Fase 6 del roadmap (Automation/AI), no a esta fase.
