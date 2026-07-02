# Feature Specification: Gestión de Customers (Clientes)

**Feature Branch**: `008-customers`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-008 — Gestión de Clientes. Módulo núcleo del CRM para administrar de forma centralizada las empresas/personas con relación comercial: alta, edición, baja lógica, búsqueda, filtros, etiquetas, historial, línea de tiempo unificada, prevención de duplicados por CUIT dentro de la organización, fusión de duplicados, exportar/importar, con auditoría completa y aislamiento estricto entre organizaciones."

**Nota de terminología**: Esta especificación posee la entidad `Customer` (llamada
"Cliente" en el input original) del bounded context **CRM** (ver
[SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)), extrayendo y
reemplazando el detalle que antes vivía de forma simplificada en la User Story 1 de
[specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md)
(ver nota de deprecación en esa spec). No redefine `Contact` — eso pertenece a
[specs/009-contacts/spec.md](../009-contacts/spec.md) — ni `Organization`, `User`,
`Role`/`Permission` — definidos en
[specs/005-organizations-multi-tenant](../005-organizations-multi-tenant/spec.md),
[specs/006-users](../006-users/spec.md) y
[specs/007-roles-permissions](../007-roles-permissions/spec.md) respectivamente. Los
roles mencionados en el input ("Gerente Comercial", "Vendedor") se mapean a los roles
canónicos de spec 007 (Gerente, Ventas).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alta y edición de Customers (Priority: P1)

Como Vendedor o Gerente de una Organization, quiero crear y editar Customers con sus
datos de identificación, fiscales, de contacto y ubicación, para tener toda la
información comercial centralizada en un único lugar.

**Why this priority**: Es el valor central del módulo: sin poder crear/editar Customers
no existe CRM.

**Independent Test**: Puede probarse creando un Customer con sus datos principales,
editándolo, e intentando crear un duplicado con el mismo CUIT en la misma Organization
para verificar que el sistema lo impide.

**Acceptance Scenarios**:

1. **Given** una Organization activa, **When** un Vendedor crea un Customer con nombre,
   razón social y datos fiscales, **Then** el Customer queda creado y visible en el
   listado de esa Organization.
2. **Given** un Customer existente, **When** se edita cualquiera de sus datos, **Then**
   los cambios quedan guardados y el historial conserva el valor anterior.
3. **Given** un Customer con un CUIT/NIF ya registrado en una Organization, **When** se
   intenta crear otro Customer con el mismo CUIT en esa misma Organization, **Then** el
   sistema lo impide (RN-003).
4. **Given** dos Organizations distintas, **When** cada una registra un Customer con el
   mismo CUIT, **Then** el sistema lo permite: la unicidad es por Organization, no
   global (RN-002).
5. **Given** los datos obligatorios de un Customer incompletos, **When** se intenta
   guardar, **Then** el sistema rechaza el guardado indicando los campos faltantes.

---

### User Story 2 - Búsqueda y filtros de Customers (Priority: P2)

Como usuario comercial, quiero buscar y filtrar Customers por nombre, CUIT, email,
teléfono, ciudad, etiqueta o responsable, para encontrar rápidamente al Customer que
necesito entre muchos.

**Why this priority**: Sin búsqueda/filtros efectivos, un volumen mediano de Customers
ya creados (US1) se vuelve inmanejable en la práctica diaria.

**Independent Test**: Con varios Customers ya cargados, puede probarse buscando por
distintos atributos (nombre, CUIT, ciudad, etiqueta) y verificando que los resultados
son correctos y rápidos, sin depender de otras historias.

**Acceptance Scenarios**:

1. **Given** varios Customers cargados, **When** se busca por nombre, razón social,
   CUIT, email, teléfono o etiqueta, **Then** el sistema devuelve los Customers que
   coinciden en menos de 300 ms.
2. **Given** varios Customers cargados, **When** se filtra por estado, responsable,
   ciudad, provincia, país, fecha o categoría, **Then** el listado se reduce solo a los
   que cumplen esos filtros.
3. **Given** un Customer con múltiples etiquetas, **When** se filtra por una de ellas,
   **Then** ese Customer aparece en los resultados.

---

### User Story 3 - Baja lógica, archivado y restauración (Priority: P3)

Como Administrador de una Organization, quiero archivar (baja lógica) y restaurar
Customers, para dejar de operar con ellos sin perder su historial ni su información.

**Why this priority**: Es necesario para mantener el CRM ordenado con el tiempo, pero un
CRM ya es funcional operando solo con Customers activos (US1/US2).

**Independent Test**: Puede probarse archivando un Customer, verificando que no puede
recibir nuevas Oportunidades sin autorización explícita, y luego restaurándolo para
confirmar que recupera su estado y datos previos.

**Acceptance Scenarios**:

1. **Given** un Customer activo, **When** un Administrador lo archiva, **Then** pasa a
   estado `Archivado` sin perder ningún dato ni historial (RN-004, RF-011).
2. **Given** un Customer `Archivado`, **When** se intenta crear una nueva Oportunidad
   para él sin autorización explícita, **Then** el sistema lo impide (RN-008).
3. **Given** un Customer `Archivado`, **When** un Administrador lo restaura, **Then**
   vuelve a estado `Activo` con todos sus datos intactos.
4. **Given** cualquier intento de eliminación física de un Customer, **When** ocurre,
   **Then** el sistema lo rechaza: solo existe baja lógica (RN-004, RF-011).

---

### User Story 4 - Línea de tiempo unificada de un Customer (Priority: P4)

Como usuario comercial, quiero ver una línea de tiempo unificada de todo lo que pasó con
un Customer (creación, modificaciones, llamadas, reuniones, emails, tareas,
oportunidades, cotizaciones, facturas, documentos, comentarios), para entender de un
vistazo el historial completo de la relación comercial.

**Why this priority**: Aporta valor una vez que ya existen Customers y eventos
asociados (US1-US3, y las specs que aportan Activities/Opportunities/Documentos); no
bloquea la gestión básica de Customers.

**Independent Test**: Con un Customer que tuvo varias modificaciones y al menos un
evento asociado (por ejemplo, una Activity), puede probarse consultando su línea de
tiempo y verificando que todos los eventos aparecen en orden cronológico.

**Acceptance Scenarios**:

1. **Given** un Customer con historial de creación, modificaciones y eventos
   asociados, **When** se consulta su línea de tiempo, **Then** todos los eventos
   aparecen ordenados cronológicamente con su tipo y fecha.
2. **Given** un Customer sin eventos asociados más allá de su creación, **When** se
   consulta su línea de tiempo, **Then** se muestra únicamente el evento de creación,
   sin errores.

---

### User Story 5 - Fusionar duplicados, exportar e importar (Priority: P5)

Como Administrador de una Organization, quiero fusionar Customers duplicados y
exportar/importar Customers en lote, para sanear y migrar datos comerciales existentes.

**Why this priority**: Es una operación de mantenimiento/migración de datos, útil pero
no bloqueante frente a las capacidades ya cubiertas por US1-US4.

**Independent Test**: Puede probarse creando dos Customers duplicados manualmente,
fusionándolos, y verificando que el resultado conserva el historial combinado de ambos;
por separado, exportar un lote de Customers e importarlo en otra Organization de prueba.

**Acceptance Scenarios**:

1. **Given** dos Customers identificados como duplicados, **When** un Administrador los
   fusiona, **Then** el sistema conserva un único Customer con el historial combinado de
   ambos, y el duplicado descartado deja de ser accesible.
2. **Given** un conjunto de Customers de una Organization, **When** un Administrador los
   exporta, **Then** obtiene un archivo con sus datos principales.
3. **Given** un archivo de Customers válido, **When** un Administrador lo importa,
   **Then** los Customers se crean respetando las mismas reglas de validación y
   unicidad que el alta manual (US1).

---

### Edge Cases

- ¿Qué pasa si se intenta fusionar un Customer archivado con uno activo? El sistema
  MUST permitirlo, conservando el estado más permisivo (activo) salvo indicación
  explícita en contrario.
- ¿Qué ocurre si una importación masiva incluye un CUIT ya existente en la
  Organization? El sistema MUST rechazar (o marcar como duplicado a revisar, según
  configuración) ese registro sin interrumpir el resto de la importación.
- ¿Qué pasa si dos usuarios editan el mismo Customer al mismo tiempo? El sistema MUST
  conservar el último cambio guardado sin corromper el registro, informando al segundo
  usuario que los datos se actualizaron (consistente con spec 001).
- ¿Qué sucede si se busca un Customer por un dato que no existe en ningún registro? El
  sistema MUST devolver una lista vacía en menos de 300 ms, no un error.
- ¿Qué pasa si un Customer archivado tiene Oportunidades abiertas al momento de
  archivarse? El sistema MUST conservarlas visibles en modo solo lectura, sin
  eliminarlas ni cerrarlas automáticamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear Customers manualmente con sus datos de
  identificación, fiscales, de contacto y ubicación.
- **FR-002**: El sistema MUST validar los campos obligatorios de un Customer antes de
  guardar.
- **FR-003**: El sistema MUST impedir Customers duplicados dentro de la misma
  Organization según reglas configurables (por defecto, CUIT/NIF duplicado).
- **FR-004**: El sistema MUST permitir editar cualquier dato de un Customer,
  conservando el valor anterior en su historial.
- **FR-005**: El sistema MUST mantener un historial completo de modificaciones de cada
  Customer.
- **FR-006**: El sistema MUST permitir buscar Customers por nombre, razón social,
  CUIT/NIF, email, teléfono o etiquetas.
- **FR-007**: El sistema MUST permitir filtrar Customers por estado, responsable
  comercial, ciudad, provincia, país, fecha y categoría.
- **FR-008**: El sistema MUST soportar un número ilimitado de etiquetas por Customer.
- **FR-009**: El sistema MUST soportar campos personalizados adicionales a los campos
  estándar de un Customer.
- **FR-010**: El sistema MUST permitir dar de baja lógica a un Customer (archivar) sin
  eliminarlo físicamente ni perder su historial.
- **FR-011**: El sistema MUST impedir crear nuevas Oportunidades para un Customer
  archivado, salvo autorización explícita.
- **FR-012**: El sistema MUST mostrar una línea de tiempo unificada por Customer con
  todos los eventos relacionados (creación, modificaciones, actividades, oportunidades,
  documentos, comentarios, y los que aporten otras specs).
- **FR-013**: El sistema MUST permitir fusionar dos o más Customers duplicados
  conservando el historial combinado.
- **FR-014**: El sistema MUST permitir exportar e importar Customers en lote,
  respetando las mismas reglas de validación y unicidad que el alta manual.
- **FR-015**: El sistema MUST registrar en el Audit Log la creación, edición, cambio de
  estado, archivado, restauración, fusión, importación y exportación de Customers.
- **FR-016**: El sistema MUST garantizar que los Customers de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Customer**: Persona física o jurídica con la que la Organization mantiene o
  mantuvo una relación comercial (ver [Domain Model](../../docs/domain-model.md));
  entidad núcleo del CRM que integra Contacts, Opportunities, Activities, Documentos,
  Cotizaciones y Facturas. Atributos principales: identificación (nombre, razón social,
  nombre comercial, tipo), fiscales (CUIT/NIF, condición fiscal), contacto (email,
  teléfono, sitio web), ubicación (país, provincia, ciudad, dirección) y comerciales
  (responsable, fuente, categoría, etiquetas, prioridad).
- **CustomerStatus**: Estado del Customer: `Activo`, `Inactivo`, `Suspendido`,
  `Archivado` (baja lógica).
- **Tag**: Etiqueta libre asociable a uno o más Customers, usada para clasificar y
  filtrar.
- **Timeline Entry**: Evento cronológico asociado a un Customer (creación, modificación,
  llamada, reunión, email, tarea, oportunidad, documento, comentario), agregado desde
  distintos módulos.
- **Audit Log**: Registro inmutable de creación/edición/cambio de estado/archivado/
  restauración/fusión/importación/exportación de Customers, con usuario, Organization,
  fecha, valores anteriores y nuevos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Las búsquedas de Customers devuelven resultados en menos de 300 ms en el
  95% de los casos.
- **SC-002**: El sistema soporta al menos 1 millón de Customers por Organization sin
  degradar el tiempo de búsqueda definido en SC-001.
- **SC-003**: El 100% de las acciones de creación, edición, archivado, restauración,
  fusión, importación y exportación quedan registradas en el Audit Log.
- **SC-004**: El 0% de los Customers archivados pierde datos o historial respecto a su
  estado antes de archivarse.
- **SC-005**: El 100% de los intentos de crear un Customer duplicado (mismo CUIT en la
  misma Organization) son rechazados.
- **SC-006**: Un usuario puede crear un Customer nuevo con sus datos principales en
  menos de 2 minutos.

## Assumptions

- La regla de unicidad por defecto es el CUIT/NIF dentro de la misma Organization
  (RN-002, RN-003); Organizations distintas pueden tener Customers con el mismo
  CUIT/NIF sin conflicto.
- Los actores "Gerente Comercial" y "Vendedor" del input se mapean a los roles
  canónicos "Gerente" y "Ventas" del catálogo de
  [specs/007-roles-permissions/spec.md](../007-roles-permissions/spec.md); esta spec no
  define roles nuevos.
- "Archivado" (baja lógica) es reversible; no existe eliminación física de un Customer
  en ninguna fase de esta spec.
- La fusión de Customers duplicados (US5) es una operación manual iniciada por un
  Administrador; la detección automática/sugerida de duplicados queda fuera de alcance
  de esta fase (se limita a impedir duplicados exactos por CUIT al crear).
- El formato de exportación/importación (CSV, Excel, u otro) se decide en la fase de
  planificación técnica; esta spec solo exige que el resultado respete las mismas
  reglas de validación y unicidad que el alta manual.
- Los módulos de Facturación, Cotizaciones e Inventario (fases futuras del roadmap)
  consumirán la entidad Customer definida acá sin duplicar su modelo.
