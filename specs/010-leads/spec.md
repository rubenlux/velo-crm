# Feature Specification: Gestión de Prospectos (Leads)

**Feature Branch**: `010-leads`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-010 — Gestión de Prospectos (Leads). Registrar, gestionar, calificar y convertir potenciales clientes en Cliente, Contacto y Oportunidad en una única operación, con asignación de responsables, seguimiento comercial, historial, timeline, etiquetas, búsqueda y auditoría completa. La conversión nunca elimina el Prospecto original (pasa a estado Convertido) y los Prospectos Perdidos pueden reactivarse. No incluye automatizaciones, IA para scoring, campañas de marketing ni integraciones con plataformas de anuncios."

**Nota de terminología**: Esta especificación posee la entidad `Lead` del bounded
context **CRM** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)),
reemplazando el detalle de captura/calificación de Lead que hoy vive de forma resumida
en la User Story 1 de
[specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md)
(ver nota de deprecación en esa spec). Depende de `Customer` (spec 008) y `Contact`
(spec 009), a los que da origen al convertirse, y de `Opportunity`, cuyo pipeline sigue
definido en [specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md)
(User Story 2). El estado del Lead (`LeadStatus`: Nuevo, Contactado, Calificado, En
negociación, Convertido, Perdido, Archivado) es un ciclo de vida propio y **distinto**
del pipeline de etapas de `Opportunity` (Nuevo, Calificado, Propuesta, Negociación,
Ganado, Perdido, definido en spec 001); comparten algunos nombres por convención de
negocio, pero son máquinas de estado independientes: un Lead se califica y convierte
antes de que exista una Opportunity con su propio avance de etapas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro y calificación de Prospectos (Priority: P1)

Como Vendedor o Gerente de una Organization, quiero registrar un nuevo Prospecto con
sus datos de contacto y comerciales, calificarlo y asignarle un responsable, para
empezar a trabajarlo dentro de mi proceso comercial.

**Why this priority**: Es la puerta de entrada del embudo comercial: sin poder
registrar y calificar Prospectos no hay nada que convertir después (US3).

**Independent Test**: Puede probarse creando un Prospecto con sus datos principales,
asignándole un responsable y calificándolo (cambiando su estado y/o Score), sin
depender de conversión ni de otras historias.

**Acceptance Scenarios**:

1. **Given** una Organization activa, **When** un usuario crea un Prospecto con nombre,
   empresa, datos de contacto y origen, **Then** el Prospecto queda creado en estado
   `Nuevo` con un responsable asignado.
2. **Given** un Prospecto `Nuevo`, **When** el responsable lo contacta y registra el
   resultado, **Then** el Prospecto pasa a estado `Contactado`.
3. **Given** un Prospecto `Contactado`, **When** el responsable evalúa su interés y lo
   califica, **Then** el Prospecto pasa a estado `Calificado` con su Score actualizado.
4. **Given** un Prospecto sin responsable asignado, **When** un Administrador le asigna
   uno, **Then** ese Prospecto aparece en la lista de trabajo de ese responsable.

---

### User Story 2 - Seguimiento comercial del Prospecto (Priority: P2)

Como Vendedor, quiero registrar actividades, notas y la próxima acción sobre un
Prospecto, y ver su línea de tiempo completa, para no perder el hilo de la negociación
mientras avanza por el embudo.

**Why this priority**: Refuerza la trazabilidad del proceso una vez que ya existen
Prospectos calificados (US1); sin seguimiento, el embudo se vuelve tan desordenado como
las planillas que VELO busca reemplazar.

**Independent Test**: Con un Prospecto ya creado, puede probarse registrando una
actividad, una nota y una próxima acción, y verificando que todo aparece ordenado en su
línea de tiempo.

**Acceptance Scenarios**:

1. **Given** un Prospecto, **When** el responsable registra una actividad (llamada,
   reunión, email), **Then** queda listada en la línea de tiempo del Prospecto con
   fecha y usuario.
2. **Given** un Prospecto, **When** el responsable agrega una nota, **Then** la nota
   queda asociada y visible en su historial, sin límite de cantidad.
3. **Given** un Prospecto con una próxima acción definida, **When** se consulta su
   ficha, **Then** esa próxima acción es visible junto con su fecha.
4. **Given** un Prospecto con adjuntos, **When** el responsable adjunta un documento,
   **Then** el documento queda asociado y accesible desde la ficha del Prospecto.

---

### User Story 3 - Conversión de Prospecto en Cliente, Contacto y Oportunidad (Priority: P3)

Como Vendedor, quiero convertir un Prospecto calificado en Cliente, Contacto principal
y Oportunidad en una única operación, para no tener que recrear manualmente esa
información en tres lugares distintos.

**Why this priority**: Es el momento de mayor valor de negocio del módulo — el punto en
que un Prospecto se convierte en negocio real — pero depende de que ya exista un
Prospecto calificado (US1/US2).

**Independent Test**: Con un Prospecto calificado, puede probarse ejecutando la
conversión y verificando que se crean automáticamente un Customer (spec 008), un
Contact principal (spec 009) y una Opportunity (spec 001), y que el Prospecto original
pasa a estado `Convertido` sin eliminarse.

**Acceptance Scenarios**:

1. **Given** un Prospecto calificado, **When** el usuario ejecuta la conversión,
   **Then** el sistema crea automáticamente un Customer, un Contact principal para ese
   Customer y una Opportunity asociada, en una sola operación.
2. **Given** una conversión ya realizada, **When** se consulta el Prospecto original,
   **Then** su estado es `Convertido` y conserva su historial completo, con enlaces al
   Customer/Contact/Opportunity generados.
3. **Given** un Prospecto ya convertido, **When** se intenta convertirlo nuevamente,
   **Then** el sistema lo impide (un Prospecto solo se convierte una vez).

---

### User Story 4 - Marcar como perdido y reactivar Prospectos (Priority: P4)

Como Vendedor, quiero marcar un Prospecto como perdido cuando no prospera, y poder
reactivarlo más adelante si vuelve a mostrar interés, para no perder ese registro ni su
historial.

**Why this priority**: Cierra el ciclo de vida del Prospecto cuando no se convierte
(complementa US1-US3); no bloquea el funcionamiento del embudo en su forma básica.

**Independent Test**: Puede probarse marcando un Prospecto calificado como perdido,
verificando que deja de aparecer entre los activos, y luego reactivándolo para
confirmar que recupera su estado de trabajo con el historial intacto.

**Acceptance Scenarios**:

1. **Given** un Prospecto en cualquier estado previo a `Convertido`, **When** el
   responsable lo marca como `Perdido`, **Then** deja de aparecer en el listado de
   Prospectos activos, sin eliminarse.
2. **Given** un Prospecto `Perdido`, **When** el responsable lo reactiva, **Then**
   vuelve a un estado de trabajo activo conservando su historial previo completo.
3. **Given** un Prospecto, **When** se intenta eliminarlo físicamente, **Then** el
   sistema lo rechaza: solo existen los estados `Perdido`/`Archivado` como baja lógica.

---

### User Story 5 - Búsqueda, filtros e importación de Prospectos (Priority: P5)

Como usuario comercial, quiero buscar y filtrar Prospectos por distintos atributos, e
importar Prospectos en lote, para trabajar eficientemente con grandes volúmenes de
datos comerciales.

**Why this priority**: Aporta eficiencia operativa una vez que ya existen Prospectos
(US1); no bloquea el uso básico del módulo con pocos registros.

**Independent Test**: Con varios Prospectos cargados, puede probarse buscando y
filtrando por distintos atributos; por separado, importando un lote de Prospectos desde
un archivo.

**Acceptance Scenarios**:

1. **Given** varios Prospectos cargados, **When** se busca por nombre, empresa, email,
   teléfono, responsable, estado, etiquetas, ciudad u origen, **Then** el sistema
   devuelve los Prospectos que coinciden en menos de 300 ms.
2. **Given** un archivo de Prospectos válido, **When** un usuario lo importa, **Then**
   los Prospectos se crean en estado `Nuevo` respetando las mismas validaciones que el
   alta manual.

---

### Edge Cases

- ¿Qué pasa si se intenta convertir un Prospecto sin datos suficientes para crear un
  Customer válido (por ejemplo, sin CUIT si la Organization lo exige)? El sistema MUST
  detener la conversión y solicitar los datos faltantes antes de crear el Customer
  (spec 008 sigue siendo la autoridad de validación de Customer).
- ¿Qué ocurre si el email/teléfono de un Prospecto ya corresponde a un Customer o
  Contact existente? El sistema MUST advertir sobre el posible duplicado antes de
  convertir, ofreciendo vincular al Customer/Contact existente en lugar de crear uno
  nuevo.
- ¿Qué pasa si se intenta reactivar un Prospecto `Convertido`? El sistema MUST
  impedirlo: `Convertido` es terminal, a diferencia de `Perdido` que sí es reactivable.
- ¿Qué sucede si dos usuarios intentan convertir el mismo Prospecto al mismo tiempo? El
  sistema MUST garantizar que la conversión ocurra una sola vez, rechazando el segundo
  intento sin crear Customers/Contacts/Opportunities duplicados.
- ¿Qué pasa si se cambia el responsable de un Prospecto con actividades ya
  registradas? El sistema MUST conservar el historial de actividades tal como quedó
  registrado, atribuido a quien las realizó, no reasignarlo retroactivamente al nuevo
  responsable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear Prospectos manualmente con datos de
  contacto y comerciales (origen, campaña, interés).
- **FR-002**: El sistema MUST permitir importar Prospectos en lote, respetando las
  mismas validaciones que el alta manual.
- **FR-003**: El sistema MUST asignar un responsable a cada Prospecto.
- **FR-004**: El sistema MUST modelar el estado de un Prospecto (`LeadStatus`) como uno
  de: `Nuevo`, `Contactado`, `Calificado`, `En negociación`, `Convertido`, `Perdido`,
  `Archivado`.
- **FR-005**: El sistema MUST registrar todas las actividades realizadas sobre un
  Prospecto, con fecha y usuario responsable.
- **FR-006**: El sistema MUST permitir asignar etiquetas a un Prospecto.
- **FR-007**: El sistema MUST soportar un número ilimitado de notas por Prospecto.
- **FR-008**: El sistema MUST permitir adjuntar documentos a un Prospecto.
- **FR-009**: El sistema MUST permitir calcular y mostrar un Score comercial por
  Prospecto.
- **FR-010**: El sistema MUST permitir convertir un Prospecto calificado en un Customer,
  un Contact principal y una Opportunity en una única operación (delegando la creación
  de cada entidad a specs 008, 009 y 001 respectivamente).
- **FR-011**: El sistema MUST impedir que un Prospecto se convierta más de una vez.
- **FR-012**: El sistema MUST conservar el Prospecto original tras la conversión,
  cambiando su estado a `Convertido` en lugar de eliminarlo.
- **FR-013**: El sistema MUST permitir marcar un Prospecto como `Perdido` y
  reactivarlo posteriormente a un estado de trabajo activo.
- **FR-014**: El sistema MUST impedir la eliminación física de un Prospecto en
  cualquier estado.
- **FR-015**: El sistema MUST permitir buscar y filtrar Prospectos por nombre, empresa,
  email, teléfono, responsable, estado, etiquetas, ciudad u origen.
- **FR-016**: El sistema MUST registrar en el Audit Log la creación, edición, cambio de
  responsable, cambio de estado, conversión, pérdida y restauración de Prospectos.
- **FR-017**: El sistema MUST garantizar que los Prospectos de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Lead**: Persona o empresa que manifestó interés comercial pero aún no fue
  convertida (ver [Domain Model](../../docs/domain-model.md)); atributos: información
  general (nombre, empresa, cargo, email, teléfono, WhatsApp), comercial (origen,
  campaña, interés, responsable, estado, prioridad, Score) y adicional (observaciones,
  última fecha de contacto, próxima acción).
- **LeadStatus**: Estado del ciclo de vida del Lead: `Nuevo`, `Contactado`,
  `Calificado`, `En negociación`, `Convertido` (terminal), `Perdido` (reactivable),
  `Archivado`.
- **LeadSource**: Origen del Lead (Sitio Web, Formulario, Redes Sociales, Referido,
  Llamada, Email, Importación, Evento, Carga Manual, API).
- **Customer**: Ya definido en [specs/008-customers/spec.md](../008-customers/spec.md);
  esta feature lo crea (o vincula uno existente) al convertir un Lead.
- **Contact**: Ya definido en [specs/009-contacts/spec.md](../009-contacts/spec.md);
  esta feature crea el Contact principal del Customer resultante al convertir.
- **Opportunity**: Ya definida en
  [specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md);
  esta feature la crea al convertir un Lead, en su etapa inicial de pipeline.
- **Audit Log**: Registro inmutable de creación/edición/cambio de responsable/cambio de
  estado/conversión/pérdida/restauración de Leads.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede registrar un Prospecto nuevo con sus datos principales
  en menos de 2 minutos.
- **SC-002**: Las búsquedas de Prospectos devuelven resultados en menos de 300 ms en el
  95% de los casos.
- **SC-003**: El sistema soporta al menos 1 millón de Prospectos por Organization sin
  degradar el tiempo de búsqueda definido en SC-002.
- **SC-004**: El 100% de las conversiones de Prospecto generan correctamente un
  Customer, un Contact principal y una Opportunity, verificable por consulta directa de
  esas tres entidades.
- **SC-005**: El 100% de las acciones de creación, edición, cambio de estado,
  conversión, pérdida y restauración quedan registradas en el Audit Log.
- **SC-006**: El 100% de los intentos de convertir un Prospecto ya convertido son
  rechazados.
- **SC-007**: El 0% de los Prospectos marcados como `Perdido` pierde su historial al
  ser reactivados.

## Assumptions

- El Score comercial (FR-009) se calcula con una fórmula configurable a nivel de
  Organization; el algoritmo concreto de scoring (manual, por reglas o con IA) se
  decide en la fase de planificación técnica — el scoring basado en IA queda fuera de
  alcance de esta fase (ver Fuera de Alcance del input).
- La conversión (US3) exige, como mínimo, los datos obligatorios que
  [specs/008-customers/spec.md](../008-customers/spec.md) requiere para crear un
  Customer válido; si faltan, el sistema solicita completarlos antes de confirmar la
  conversión, en lugar de crear un Customer incompleto.
- `LeadStatus` y las etapas de `Opportunity` (pipeline, spec 001) son máquinas de estado
  independientes, aunque comparten nombres similares (Calificado, Negociación) por
  convención de lenguaje de negocio.
- Los Prospectos `Archivado` (mencionado en el input junto a `Perdido`) se tratan como
  un estado adicional de baja lógica de más largo plazo que `Perdido`; el detalle fino
  de cuándo pasa de uno a otro se define en la fase de planificación técnica.
- Las funcionalidades explícitamente fuera de alcance (automatizaciones inteligentes,
  IA para scoring, campañas de Email Marketing, WhatsApp Business, integraciones con
  plataformas de anuncios, enriquecimiento automático de datos) se definirán en
  especificaciones independientes futuras.
