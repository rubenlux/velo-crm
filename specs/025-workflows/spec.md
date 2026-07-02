# Feature Specification: Automatizaciones y Workflows

**Feature Branch**: `025-workflows`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-025 — Automatizaciones y Workflows. Motor de Workflows basado en eventos, condiciones y acciones configurables sin programación: Trigger (evento que inicia el Workflow), Condiciones (determinan si se ejecuta), Acciones (crear tarea/actividad, cambiar estado, asignar responsable, enviar notificación, crear documento, actualizar campo, ejecutar otro Workflow), ejecución automática o manual con acciones en orden, historial de ejecución con logs y errores, versionado, activación/desactivación, variables de contexto, con auditoría completa y aislamiento entre organizaciones. No incluye editor visual BPMN, IA para generar workflows, integraciones externas (Zapier/Make/n8n) ni ejecución distribuida."

**Nota de terminología**: Esta especificación posee las entidades `Workflow`,
`Trigger` y `Action` del bounded context **Automation** (ver
[SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md), que ya las anticipaba).
Es el mecanismo **determinista** al que se refiere la Constitución (Principio IX, "AI
Assists — Never Governs"): un Workflow ejecuta exactamente las acciones configuradas
cuando se cumplen sus condiciones, sin margen probabilístico — a diferencia de los `AI
Agent` de una fase futura (Fase 7, IA), que asisten pero nunca gobiernan reglas de
negocio. Un Workflow puede reaccionar a eventos y ejecutar acciones sobre cualquier
entidad de las specs 008-024, sin redefinir ninguna de ellas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear un Workflow con Trigger, condiciones y acciones (Priority: P1) 🎯

Como usuario autorizado, quiero crear un Workflow eligiendo un evento disparador,
condiciones opcionales y una o más acciones, sin escribir código, para automatizar un
proceso repetitivo de mi Organization.

**Why this priority**: Es el valor central del módulo: sin poder crear un Workflow no
hay nada que activar, ejecutar ni auditar en las historias siguientes.

**Independent Test**: Puede probarse creando un Workflow con Trigger "Oportunidad
ganada" (spec 011), una condición "Total > 1000" y una acción "Crear tarea" (spec 013),
guardándolo en estado `Borrador` sin necesidad de activarlo.

**Acceptance Scenarios**:

1. **Given** una Organization, **When** un usuario autorizado crea un Workflow
   eligiendo un Trigger de la lista disponible (por ejemplo, "Oportunidad ganada"),
   **Then** el Workflow queda creado en estado `Borrador`.
2. **Given** un Workflow, **When** se agregan una o más condiciones (por ejemplo,
   "Total > 1000", "Prioridad = Alta"), **Then** el Workflow solo se ejecutará cuando
   todas se cumplan.
3. **Given** un Workflow, **When** se agregan una o más acciones (por ejemplo, "Crear
   tarea", "Enviar notificación"), **Then** quedan ordenadas para ejecutarse
   secuencialmente (RN-003).
4. **Given** un Workflow, **When** se usan variables de contexto (por ejemplo,
   `Cliente.Nombre`, `Oportunidad.Total`) dentro de una acción, **Then** el sistema las
   resuelve con los valores reales al ejecutarse.

---

### User Story 2 - Activar, desactivar y duplicar Workflows (Priority: P2)

Como Administrador, quiero activar un Workflow para que empiece a ejecutarse, y
desactivarlo o duplicarlo cuando sea necesario, para controlar qué automatizaciones
están en producción.

**Why this priority**: Es la puerta de control sobre Workflows ya creados (US1); un
Workflow en `Borrador` no ejecuta nada, así que esta historia es la que le da efecto
real.

**Independent Test**: Con un Workflow en `Borrador`, puede probarse activándolo y
verificando que pasa a ejecutarse ante su Trigger (RN-002: solo se ejecuta si está
activo); luego desactivándolo y verificando que deja de ejecutarse.

**Acceptance Scenarios**:

1. **Given** un Workflow en `Borrador`, **When** un Administrador lo activa, **Then**
   pasa a estado `Activo` y comienza a responder a su Trigger.
2. **Given** un Workflow `Activo`, **When** un Administrador lo desactiva, **Then**
   pasa a estado `Pausado` y deja de ejecutarse ante nuevos eventos, sin afectar
   ejecuciones ya completadas.
3. **Given** un Workflow, **When** un usuario lo duplica, **Then** se crea una copia en
   estado `Borrador` con el mismo Trigger, condiciones y acciones.
4. **Given** un Workflow `Pausado` sin uso, **When** un Administrador lo archiva,
   **Then** pasa a estado `Archivado`.

---

### User Story 3 - Ejecución automática y manual con manejo de errores (Priority: P3)

Como usuario autorizado, quiero que un Workflow se ejecute automáticamente cuando
ocurre su Trigger, o dispararlo manualmente cuando lo necesite, y que cualquier error
en una acción quede registrado sin romper el resto del sistema.

**Why this priority**: Es el corazón operativo del motor: convierte un Workflow
`Activo` (US2) en automatización real. Depende de que ya exista un Workflow activo.

**Independent Test**: Con un Workflow activo cuyo Trigger es "Factura vencida" (spec
016), puede probarse generando ese evento y verificando que las acciones se ejecutan en
orden; por separado, forzando que una acción falle y verificando que el error queda
registrado sin detener acciones ya completadas previamente.

**Acceptance Scenarios**:

1. **Given** un Workflow `Activo`, **When** ocurre su Trigger y se cumplen sus
   condiciones, **Then** el sistema ejecuta sus acciones en el orden configurado
   (RN-002, RN-003).
2. **Given** un Workflow, **When** un usuario autorizado lo ejecuta manualmente,
   **Then** el sistema evalúa sus condiciones y ejecuta sus acciones igual que en la
   ejecución automática.
3. **Given** una acción que falla durante la ejecución, **When** ocurre, **Then** el
   sistema registra el error (RN-004) y continúa o detiene el resto de las acciones
   según la gravedad configurada, sin afectar otros Workflows.
4. **Given** errores críticos repetidos, **When** se detectan, **Then** el sistema
   puede detener automáticamente el Workflow (RN-005), dejándolo en un estado que
   requiere revisión manual.
5. **Given** un Workflow, **When** una de sus acciones es "Ejecutar otro Workflow",
   **Then** el sistema encadena la ejecución del segundo Workflow, respetando el mismo
   registro de historial y control de errores.

---

### User Story 4 - Consultar historial de ejecución y errores (Priority: P4)

Como Administrador, quiero consultar el historial de ejecuciones de un Workflow,
incluyendo errores, para entender qué pasó y corregir automatizaciones que fallan.

**Why this priority**: Aporta observabilidad sobre ejecuciones ya ocurridas (US3); no
bloquea la ejecución en sí.

**Independent Test**: Con varias ejecuciones (exitosas y con error) de un Workflow, puede
probarse consultando su historial y verificando que cada entrada muestra fecha, Trigger,
duración, resultado, errores y acciones ejecutadas.

**Acceptance Scenarios**:

1. **Given** un Workflow con ejecuciones previas, **When** se consulta su historial,
   **Then** cada entrada muestra fecha, usuario (si aplica), Trigger, duración,
   resultado, errores y acciones ejecutadas.
2. **Given** una ejecución con error, **When** se revisa en el historial, **Then** el
   detalle del error queda visible para diagnóstico.

---

### User Story 5 - Búsqueda, versionado e indicadores (Priority: P5)

Como Administrador, quiero buscar Workflows por distintos atributos, ver su historial de
versiones, y consultar indicadores globales (activos, ejecuciones diarias, errores, más
utilizados), para gestionar el conjunto de automatizaciones de mi Organization.

**Why this priority**: Aporta valor de gestión y análisis sobre Workflows ya existentes
(US1-US4); no bloquea la operación de un Workflow individual.

**Independent Test**: Con varios Workflows creados y modificados a lo largo del tiempo,
puede probarse buscando por distintos atributos, consultando el historial de versiones
de uno, y viendo los indicadores globales.

**Acceptance Scenarios**:

1. **Given** varios Workflows cargados, **When** se busca por nombre, estado, Trigger,
   usuario creador, fecha o módulo, **Then** el sistema devuelve los que coinciden.
2. **Given** un Workflow modificado varias veces, **When** se consulta su historial de
   versiones, **Then** cada versión queda identificada y disponible para referencia
   (RF-008).
3. **Given** el conjunto de Workflows de una Organization, **When** se consultan los
   indicadores, **Then** el sistema muestra correctamente el total, activos,
   ejecuciones diarias, tiempo promedio de ejecución, errores, acciones ejecutadas y
   Workflows más utilizados.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente un Workflow? El sistema MUST impedirlo;
  solo existe `Archivado` como baja lógica (consistente con el resto de las specs de
  VELO).
- ¿Qué ocurre si dos Workflows activos reaccionan al mismo Trigger sobre el mismo
  registro? El sistema MUST ejecutar ambos de forma independiente, cada uno con su
  propio historial de ejecución, sin que uno interfiera con el otro.
- ¿Qué pasa si un Workflow ejecuta "Ejecutar otro Workflow" en un ciclo (A ejecuta B, B
  ejecuta A)? El sistema MUST detectar y detener la cadena antes de un bucle infinito,
  registrando el error correspondiente.
- ¿Qué sucede si una acción intenta modificar una entidad fuera de la Organization
  propietaria del Workflow? El sistema MUST impedirlo (Seguridad del input: "los
  Workflows nunca podrán ejecutar acciones fuera de la Organización propietaria").
- ¿Qué pasa si se desactiva un Workflow mientras tiene una ejecución en curso? El
  sistema MUST permitir que la ejecución en curso finalice normalmente; solo las
  ejecuciones futuras se ven afectadas por la desactivación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear Workflows sin escribir código, mediante
  configuración de Trigger, condiciones y acciones.
- **FR-002**: El sistema MUST soportar múltiples Triggers disponibles, correspondientes
  a eventos relevantes de los módulos de VELO (por ejemplo: Cliente creado, Prospecto
  convertido, Oportunidad ganada, Factura vencida, Pago recibido, Producto sin stock,
  Tarea completada).
- **FR-003**: El sistema MUST permitir agregar múltiples condiciones a un Workflow,
  todas las cuales deben cumplirse para que se ejecute.
- **FR-004**: El sistema MUST permitir agregar múltiples acciones a un Workflow,
  ejecutándolas en el orden configurado (RN-003).
- **FR-005**: El sistema MUST ejecutar automáticamente un Workflow `Activo` cuando
  ocurre su Trigger y se cumplen sus condiciones.
- **FR-006**: El sistema MUST permitir ejecutar un Workflow manualmente.
- **FR-007**: El sistema MUST registrar un historial de cada ejecución con fecha,
  usuario (si aplica), Trigger, duración, resultado, errores y acciones ejecutadas.
- **FR-008**: El sistema MUST versionar los Workflows, conservando un historial de
  cambios.
- **FR-009**: El sistema MUST permitir activar, desactivar (pausar), duplicar y
  archivar un Workflow.
- **FR-010**: El sistema MUST registrar los errores de ejecución de una acción sin
  detener la ejecución de otros Workflows.
- **FR-011**: El sistema MUST permitir detener automáticamente un Workflow ante
  errores críticos repetidos (RN-005).
- **FR-012**: El sistema MUST resolver variables de contexto (por ejemplo,
  `Cliente.Nombre`, `Oportunidad.Total`, `FechaActual`) dentro de las acciones de un
  Workflow.
- **FR-013**: El sistema MUST permitir buscar y filtrar Workflows por nombre, estado,
  Trigger, usuario creador, fecha o módulo.
- **FR-014**: El sistema MUST calcular indicadores: total de Workflows, activos,
  ejecuciones diarias, tiempo promedio de ejecución, errores, acciones ejecutadas y
  Workflows más utilizados.
- **FR-015**: El sistema MUST garantizar que un Workflow solo pueda ejecutar acciones
  dentro de su propia Organization.
- **FR-016**: El sistema MUST restringir la creación y edición de Workflows a usuarios
  autorizados (vía Role/Permission, spec 007).
- **FR-017**: El sistema MUST registrar en el Audit Log la creación, modificación,
  activación, desactivación, ejecución, error y eliminación lógica de Workflows.
- **FR-018**: El sistema MUST garantizar que los Workflows de una Organization nunca
  interactúen con datos de otra Organization.

### Key Entities

- **Workflow**: Proceso automatizado compuesto por un Trigger, condiciones y acciones
  (ver [Domain Model](../../docs/domain-model.md) y
  [Bounded Contexts](../../docs/bounded-contexts.md)); mecanismo determinista, nunca
  probabilístico (Constitución, Principio IX).
- **Trigger**: Evento del sistema que inicia un Workflow (por ejemplo, "Oportunidad
  ganada", "Factura vencida").
- **Condition**: Regla booleana evaluada sobre el contexto del evento, que determina si
  el Workflow debe ejecutarse.
- **Action**: Operación ejecutable por un Workflow (crear tarea/actividad, cambiar
  estado, asignar responsable, enviar notificación, crear documento, actualizar campo,
  ejecutar otro Workflow), aplicada sobre entidades de las specs 008-024.
- **WorkflowStatus**: Estado del Workflow: `Borrador`, `Activo`, `Pausado`,
  `Archivado`.
- **WorkflowExecution**: Registro histórico de una ejecución (Trigger disparador,
  fecha, usuario si aplica, duración, resultado, errores, acciones ejecutadas).
- **WorkflowVersion**: Versión histórica de la configuración de un Workflow.
- **Audit Log**: Registro inmutable de creación/modificación/activación/desactivación/
  ejecución/error/eliminación lógica de Workflows.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario autorizado puede crear un Workflow funcional (Trigger +
  condición + acción) en menos de 5 minutos, sin escribir código.
- **SC-002**: El 100% de las ejecuciones automáticas se disparan dentro de los
  5 segundos posteriores a que ocurre su Trigger.
- **SC-003**: El 100% de las acciones de un Workflow se ejecutan en el orden
  configurado, verificable por el historial de ejecución.
- **SC-004**: El 100% de los errores de ejecución quedan registrados sin interrumpir
  la ejecución de otros Workflows.
- **SC-005**: El 100% de los intentos de un Workflow de actuar fuera de su propia
  Organization son rechazados.
- **SC-006**: El 100% de las acciones de creación, activación, desactivación,
  ejecución y error quedan registradas en el Audit Log.
- **SC-007**: Las búsquedas de Workflows devuelven resultados en menos de 300 ms en el
  95% de los casos.

## Assumptions

- El catálogo de Triggers y Actions disponibles en esta fase se limita a los eventos y
  operaciones ya definidos por las specs 008-024 existentes; nuevos módulos futuros
  (Fases 7-8 del roadmap) podrán agregar sus propios Triggers/Actions sin que esta spec
  deba redefinirse.
- "Reintentos automáticos" (RNF del input) se interpreta como parte del manejo de
  errores de una acción individual (FR-010), no como reintento de la ejecución completa
  del Workflow; el criterio exacto de cuántos reintentos y con qué backoff se define en
  la fase de planificación técnica.
- La detención automática ante "errores críticos repetidos" (RN-005, FR-011) requiere
  definir un umbral configurable; el valor por defecto y su ajuste se definen en la
  fase de planificación técnica.
- Editor visual tipo BPMN, IA para generar Workflows automáticamente, integraciones
  con Zapier/Make/n8n y ejecución distribuida entre múltiples servidores quedan
  explícitamente fuera de alcance de esta fase, según el input.
