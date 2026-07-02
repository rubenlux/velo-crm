# Feature Specification: Gestión de Oportunidades de Venta (Pipeline Comercial)

**Feature Branch**: `011-opportunities`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-011 — Gestión de Oportunidades de Venta (Pipeline Comercial). Administrar el ciclo de vida completo de una venta desde la identificación de la oportunidad hasta su cierre exitoso o pérdida: pipeline configurable con etapas por defecto (Nueva, Calificada, Descubrimiento, Propuesta, Negociación, Cierre, Ganada, Perdida), valor estimado y probabilidad de cierre con cálculo automático de valor ponderado, drag & drop entre etapas, KPIs comerciales (tasa de conversión, ticket promedio, tiempo promedio de cierre, rendimiento por vendedor/etapa) y forecast (mensual/trimestral/anual), con auditoría completa y aislamiento entre organizaciones. No incluye cotizaciones, facturación, cobros, automatizaciones ni IA."

**Nota de terminología**: Esta especificación posee la entidad `Opportunity` del
bounded context **CRM** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)),
reemplazando el detalle de pipeline que hoy vive de forma resumida en la User Story 2
de [specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md)
(ver nota de deprecación en esa spec). Depende de `Customer` (spec 008), `Contact`
(spec 009) y `Lead` (spec 010, que crea la Opportunity inicial al convertir). El estado
del ciclo de vida (`OpportunityState`: Abierta, Ganada, Perdida, Cancelada, Archivada)
es distinto de la **etapa** dentro del pipeline (`PipelineStage`: Nueva, Calificada,
Descubrimiento, Propuesta, Negociación, Cierre — más las etapas terminales Ganada/
Perdida, que son a la vez etapa y estado). Los nombres de etapa se corrigen a
concordancia de género femenino ("Ganada"/"Perdida", no "Ganado"/"Perdido" como en la
versión original de spec 001) porque el sujeto es "la Oportunidad".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Creación y gestión del pipeline (Priority: P1) 🎯

Como Vendedor o Gerente Comercial de una Organization, quiero crear Oportunidades
asociadas a un Customer y moverlas entre las etapas de mi pipeline, para saber en qué
estado está cada negociación y priorizar mi trabajo.

**Why this priority**: Es el valor central del módulo: sin poder crear y mover
Oportunidades entre etapas no existe pipeline que gestionar.

**Independent Test**: Puede probarse creando una Oportunidad para un Customer existente
(spec 008), asignándole un responsable, y moviéndola entre etapas del pipeline por
defecto, verificando que cada cambio de etapa queda registrado.

**Acceptance Scenarios**:

1. **Given** un Customer existente, **When** un usuario crea una Oportunidad manualmente
   con nombre, responsable y valor estimado, **Then** la Oportunidad queda creada en la
   etapa `Nueva` del pipeline de su Organization.
2. **Given** un Lead convertido (spec 010), **When** ocurre la conversión, **Then** el
   sistema crea automáticamente la Oportunidad asociada sin intervención manual
   adicional.
3. **Given** una Oportunidad en una etapa del pipeline, **When** el usuario la mueve a la
   siguiente etapa (por ejemplo, arrastrándola en un tablero), **Then** el sistema
   registra el cambio de etapa con fecha y usuario responsable.
4. **Given** una Organization, **When** un Administrador configura sus propias etapas de
   pipeline, **Then** las Oportunidades nuevas de esa Organization usan ese pipeline
   personalizado en lugar del set por defecto.
5. **Given** una Oportunidad, **When** se reasigna su responsable, **Then** el cambio
   queda registrado y la Oportunidad aparece en la lista de trabajo del nuevo
   responsable.

---

### User Story 2 - Valor estimado, probabilidad y valor ponderado (Priority: P2)

Como Gerente Comercial, quiero ver el valor estimado, la probabilidad de cierre y el
valor ponderado de cada Oportunidad, para priorizar el pipeline según su impacto
económico real.

**Why this priority**: Aporta valor de negocio sobre un pipeline ya funcional (US1); no
bloquea la gestión básica de mover Oportunidades entre etapas.

**Independent Test**: Con una Oportunidad ya creada, puede probarse definiendo su valor
estimado y probabilidad de cierre, y verificando que el sistema calcula
automáticamente el valor ponderado (valor × probabilidad).

**Acceptance Scenarios**:

1. **Given** una Oportunidad con valor estimado y probabilidad de cierre definidos,
   **When** se consulta su ficha, **Then** el sistema muestra el valor ponderado
   calculado automáticamente.
2. **Given** una Oportunidad, **When** el usuario actualiza su valor estimado o su
   probabilidad de cierre, **Then** el valor ponderado se recalcula de inmediato.
3. **Given** varias Oportunidades abiertas, **When** se consulta el valor total del
   pipeline, **Then** el sistema suma correctamente el valor estimado y el valor
   ponderado de todas ellas.

---

### User Story 3 - Cierre, reapertura y archivado de Oportunidades (Priority: P3)

Como Vendedor, quiero marcar una Oportunidad como ganada o perdida, y poder reabrirla si
corresponde, para reflejar con precisión el resultado real de cada negociación.

**Why this priority**: Cierra el ciclo de vida de la Oportunidad iniciado en US1/US2; el
pipeline ya es útil sin esta historia mientras las Oportunidades permanecen abiertas.

**Independent Test**: Puede probarse marcando una Oportunidad como ganada, verificando
que queda protegida contra ediciones sin permisos especiales, y luego marcando otra como
perdida y reabriéndola.

**Acceptance Scenarios**:

1. **Given** una Oportunidad abierta, **When** el usuario la marca como `Ganada`,
   **Then** pasa a ese estado y ya no puede modificarse sin permisos especiales
   (RN-005).
2. **Given** una Oportunidad abierta, **When** el usuario la marca como `Perdida`,
   **Then** pasa a ese estado conservando todo su historial (RN-006).
3. **Given** una Oportunidad `Perdida`, **When** el usuario la reabre, **Then** vuelve a
   estado `Abierta` en la etapa que corresponda, con su historial intacto.
4. **Given** una Oportunidad `Archivada`, **When** se intenta moverla al pipeline
   activo, **Then** el sistema exige restaurarla explícitamente antes (RN-008).

---

### User Story 4 - KPIs comerciales y Forecast (Priority: P4)

Como Gerente Comercial o Administrador, quiero ver indicadores del pipeline (tasa de
conversión, ticket promedio, tiempo promedio de cierre, rendimiento por vendedor/etapa)
y una proyección de ventas (forecast), para tomar decisiones comerciales basadas en
datos.

**Why this priority**: Aporta valor analítico una vez que ya existen Oportunidades con
movimiento (US1-US3); no bloquea el uso operativo diario del pipeline.

**Independent Test**: Con varias Oportunidades en distintos estados y etapas, puede
probarse consultando los KPIs y el forecast, y verificando que los números coinciden con
los datos reales cargados.

**Acceptance Scenarios**:

1. **Given** un conjunto de Oportunidades abiertas, ganadas y perdidas, **When** se
   consultan los KPIs del pipeline, **Then** el sistema muestra correctamente el valor
   total del pipeline, valor ponderado, oportunidades abiertas/ganadas/perdidas, tasa de
   conversión, ticket promedio, tiempo promedio de cierre y rendimiento por
   vendedor/etapa.
2. **Given** Oportunidades abiertas con fecha estimada de cierre, **When** se consulta
   el forecast, **Then** el sistema muestra las ventas estimadas del mes, trimestre y
   año, y la proyección por vendedor.
3. **Given** un cambio reciente en el pipeline (nueva Oportunidad, cambio de etapa,
   cierre), **When** se vuelve a consultar KPIs/forecast, **Then** los valores reflejan
   ese cambio.

---

### User Story 5 - Búsqueda global y línea de tiempo (Priority: P5)

Como usuario comercial, quiero buscar Oportunidades por distintos atributos y ver su
línea de tiempo completa, para ubicar rápidamente una negociación y entender su
historial.

**Why this priority**: Mejora la usabilidad sobre un pipeline ya funcional (US1-US4); no
bloquea ninguna capacidad core.

**Independent Test**: Con varias Oportunidades cargadas, puede probarse buscando por
distintos atributos y consultando la línea de tiempo de una de ellas.

**Acceptance Scenarios**:

1. **Given** varias Oportunidades cargadas, **When** se busca por nombre, Customer,
   Contact, responsable, etapa, estado, valor, prioridad, fecha estimada o etiquetas,
   **Then** el sistema devuelve las que coinciden.
2. **Given** una Oportunidad con historial de cambios de etapa, responsable y cierre,
   **When** se consulta su línea de tiempo, **Then** todos los eventos aparecen
   ordenados cronológicamente.

---

### Edge Cases

- ¿Qué pasa si se intenta editar una Oportunidad `Ganada` sin permisos especiales? El
  sistema MUST denegarlo y registrar el intento en el Audit Log (RN-005).
- ¿Qué ocurre si se elimina una etapa del pipeline que tiene Oportunidades activas en
  esa etapa? El sistema MUST exigir reasignarlas a una etapa válida antes de permitir
  eliminarla (consistente con el edge case ya definido en spec 001).
- ¿Qué pasa si dos usuarios mueven la misma Oportunidad a etapas distintas al mismo
  tiempo? El sistema MUST aplicar el último cambio guardado sin corromper el registro,
  informando al segundo usuario que los datos se actualizaron.
- ¿Qué sucede si una Oportunidad no tiene fecha estimada de cierre? El sistema MUST
  excluirla del forecast por período, sin que eso impida su gestión normal en el
  pipeline.
- ¿Qué pasa si se marca como ganada una Oportunidad sin valor estimado? El sistema MUST
  permitirlo pero contarla como valor 0 en los KPIs, sin bloquear el cierre.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear Oportunidades manualmente, asociadas a un
  Customer.
- **FR-002**: El sistema MUST crear automáticamente una Oportunidad al convertir un Lead
  calificado (ver [specs/010-leads/spec.md](../010-leads/spec.md)).
- **FR-003**: El sistema MUST asignar un responsable a cada Oportunidad.
- **FR-004**: El sistema MUST organizar las Oportunidades en un Pipeline con etapas
  configurables por Organization, con un conjunto de etapas por defecto (Nueva,
  Calificada, Descubrimiento, Propuesta, Negociación, Cierre, Ganada, Perdida).
- **FR-005**: El sistema MUST permitir mover una Oportunidad entre etapas del pipeline y
  registrar quién y cuándo lo hizo.
- **FR-006**: El sistema MUST permitir definir un valor estimado y una probabilidad de
  cierre por Oportunidad.
- **FR-007**: El sistema MUST calcular automáticamente el valor ponderado de una
  Oportunidad (valor estimado × probabilidad de cierre).
- **FR-008**: El sistema MUST permitir asociar actividades, tareas, documentos, notas y
  comentarios a una Oportunidad.
- **FR-009**: El sistema MUST permitir marcar una Oportunidad como `Ganada` o `Perdida`.
- **FR-010**: El sistema MUST impedir modificar una Oportunidad `Ganada` salvo con
  permisos especiales.
- **FR-011**: El sistema MUST permitir reabrir una Oportunidad `Perdida` a estado
  `Abierta`, conservando su historial.
- **FR-012**: El sistema MUST permitir archivar una Oportunidad y exigir restaurarla
  explícitamente antes de volver a moverla en el pipeline activo.
- **FR-013**: El sistema MUST calcular KPIs comerciales: valor total del pipeline, valor
  ponderado, cantidad de Oportunidades abiertas/ganadas/perdidas, tasa de conversión,
  ticket promedio, tiempo promedio de cierre, rendimiento por vendedor y por etapa.
- **FR-014**: El sistema MUST proveer un forecast comercial (ventas estimadas del mes,
  trimestre y año, valor ponderado del pipeline y proyección por vendedor) basado en las
  Oportunidades abiertas con fecha estimada de cierre.
- **FR-015**: El sistema MUST permitir buscar Oportunidades por nombre, Customer,
  Contact, responsable, etapa, estado, valor, prioridad, fecha estimada o etiquetas.
- **FR-016**: El sistema MUST registrar en el Audit Log la creación, edición, cambio de
  etapa, cambio de responsable, cambio de valor/probabilidad, cierre, reapertura y
  archivado de Oportunidades.
- **FR-017**: El sistema MUST garantizar que las Oportunidades de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Opportunity**: Posibilidad real de concretar una venta con un Customer (ver
  [Domain Model](../../docs/domain-model.md)); pertenece a una Organization, un Customer
  y un responsable; puede originarse desde un Lead (spec 010) o crearse directamente.
  Atributos: información general (nombre, Customer, Contact principal, responsable,
  Pipeline, etapa, estado), comercial (valor estimado, moneda, probabilidad de cierre,
  fecha estimada de cierre, prioridad, origen, competidor opcional) y adicional
  (observaciones, fechas).
- **OpportunityState**: Estado del ciclo de vida: `Abierta`, `Ganada`, `Perdida`,
  `Cancelada`, `Archivada`.
- **Pipeline**: Conjunto configurable de `PipelineStage` por Organization; toda
  Oportunidad pertenece a un Pipeline.
- **PipelineStage**: Etapa dentro de un Pipeline (por defecto: Nueva, Calificada,
  Descubrimiento, Propuesta, Negociación, Cierre, Ganada, Perdida), configurable por
  Organization.
- **Audit Log**: Registro inmutable de creación/edición/cambio de etapa/cambio de
  responsable/cambio de valor/probabilidad/cierre/reapertura/archivado de Oportunidades.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede mover una Oportunidad entre etapas del pipeline en menos
  de 10 segundos, sin recargar la página completa.
- **SC-002**: Las búsquedas de Oportunidades devuelven resultados en menos de 300 ms en
  el 95% de los casos.
- **SC-003**: El sistema soporta al menos 1 millón de Oportunidades por Organization
  sin degradar el tiempo de búsqueda definido en SC-002.
- **SC-004**: El 100% de las acciones de creación, edición, cambio de etapa, cierre,
  reapertura y archivado quedan registradas en el Audit Log.
- **SC-005**: El valor ponderado y los KPIs del pipeline reflejan cambios recientes
  (nueva Oportunidad, cambio de etapa, cierre) en menos de 5 segundos.
- **SC-006**: El 100% de los intentos de editar una Oportunidad `Ganada` sin permisos
  especiales son rechazados.
- **SC-007**: El 0% de las Oportunidades marcadas como `Perdida` pierde su historial al
  ser reabiertas.

## Assumptions

- Cada Organization tiene al menos un Pipeline con las etapas por defecto (Nueva,
  Calificada, Descubrimiento, Propuesta, Negociación, Cierre, Ganada, Perdida); el
  soporte de "múltiples pipelines" (RNF del input) se interpreta como que una
  Organization puede tener más de un Pipeline (por ejemplo, por línea de negocio), no
  que exista un único pipeline global para toda la plataforma.
- "Ganada" y "Perdida" son a la vez etapas terminales del pipeline y valores de
  `OpportunityState`; mover una Oportunidad a esas etapas dispara el cambio de estado
  correspondiente (FR-009).
- Los "permisos especiales" para editar una Oportunidad `Ganada` (RN-005) se resuelven
  con el sistema de Roles/Permissions ya definido en
  [specs/007-roles-permissions/spec.md](../007-roles-permissions/spec.md) (por ejemplo,
  un Permission específico `opportunity.edit_won`), sin definir un mecanismo de
  permisos nuevo acá.
- El cálculo de KPIs y forecast (US4) es puramente aritmético sobre datos existentes en
  esta fase; no incluye modelos predictivos ni IA (explícitamente fuera de alcance).
- Las relaciones con Cotizaciones (mencionadas como "futuro" en el input) quedan fuera
  de alcance de esta spec y se definirán cuando exista la fase de Facturación/Ventas del
  roadmap.
