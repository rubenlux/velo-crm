# Feature Specification: Gestión de Proveedores

**Feature Branch**: `021-suppliers`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-021 — Gestión de Proveedores. Administrar empresas/personas que suministran Products o servicios a la Organization: alta/edición/baja lógica, contactos, información fiscal (CUIT/NIF único por Organization), condiciones comerciales (condición de pago, moneda, lista de precios, tiempo promedio de entrega), productos suministrados, evaluación periódica (calidad/precio/entrega/atención/cumplimiento, 1-5 estrellas), documentación (contratos, certificados, listas de precios), búsqueda/filtros, importación/exportación, indicadores, con auditoría completa y aislamiento entre organizaciones. No incluye órdenes de compra, pagos, contabilidad, licitaciones ni contratos electrónicos."

**Nota de terminología**: Esta especificación posee la entidad `Supplier` del bounded
context **Inventory** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)
y [docs/domain-model.md](../../docs/domain-model.md), que ya anticipaban `Supplier` bajo
ese contexto). Depende de `Product` (spec 018, para asociar productos suministrados);
no redefine `Contact` (spec 009 — los contactos de un Supplier siguen el mismo concepto,
pero como personas vinculadas al Supplier, no a un Customer) ni `StockMovement` (spec
020: el tipo "Compra" de un movimiento de inventario referenciará a un Supplier en una
futura spec de Compras, que esta feature no define).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y editar Proveedores (Priority: P1) 🎯

Como usuario de Compras, quiero crear y editar Proveedores con sus datos generales,
fiscales, de contacto y ubicación, para tener toda la información centralizada en un
único lugar.

**Why this priority**: Es el valor central del módulo: sin poder crear/editar
Proveedores no hay nada que asociar a productos, evaluar ni documentar en las historias
siguientes.

**Independent Test**: Puede probarse creando un Supplier con sus datos principales,
editándolo, e intentando crear un duplicado con el mismo CUIT en la misma Organization
para verificar que el sistema lo impide.

**Acceptance Scenarios**:

1. **Given** una Organization activa, **When** un usuario de Compras crea un Supplier
   con nombre, razón social y datos fiscales, **Then** el Supplier queda creado y
   visible en el listado de esa Organization.
2. **Given** un Supplier existente, **When** se edita cualquiera de sus datos, **Then**
   los cambios quedan guardados y el historial conserva el valor anterior.
3. **Given** un Supplier con un CUIT/NIF ya registrado en una Organization, **When** se
   intenta crear otro Supplier con el mismo CUIT en esa misma Organization, **Then** el
   sistema lo impide (RN-003).
4. **Given** dos Organizations distintas, **When** cada una registra un Supplier con el
   mismo CUIT, **Then** el sistema lo permite: la unicidad es por Organization
   (RN-002).
5. **Given** un Supplier, **When** se le agregan uno o más contactos, **Then** quedan
   asociados y consultables desde su ficha (RF-003).

---

### User Story 2 - Asociar productos suministrados y condiciones comerciales (Priority: P2)

Como usuario de Compras, quiero asociar los productos que suministra cada Proveedor y
registrar sus condiciones comerciales (condición de pago, moneda, tiempo de entrega),
para saber a quién comprarle cada producto y en qué términos.

**Why this priority**: Aporta valor operativo sobre Proveedores ya creados (US1); un
Supplier ya es útil como registro de contacto sin esta historia, pero se vuelve
accionable con esta información.

**Independent Test**: Con un Supplier ya creado, puede probarse asociando uno o más
Products (spec 018) que suministra, y registrando su condición de pago, moneda y tiempo
promedio de entrega.

**Acceptance Scenarios**:

1. **Given** un Supplier y un Product existente (spec 018), **When** se asocia el
   Product al Supplier, **Then** queda listado entre los productos que ese Supplier
   suministra (RN-007: un Supplier puede suministrar múltiples productos).
2. **Given** un Supplier, **When** se registran su condición de pago, moneda, lista de
   precios y tiempo promedio de entrega, **Then** esos datos quedan visibles en su
   ficha para consultarse antes de una compra.
3. **Given** un Product, **When** se consulta qué Suppliers lo suministran, **Then** el
   sistema devuelve todos los Suppliers asociados a ese Product.

---

### User Story 3 - Evaluar Proveedores (Priority: P3)

Como usuario de Compras, quiero registrar evaluaciones periódicas de un Proveedor
(calidad, precio, tiempo de entrega, atención, cumplimiento), para comparar
objetivamente entre proveedores a lo largo del tiempo.

**Why this priority**: Aporta valor de análisis sobre Proveedores ya en uso (US1/US2);
no bloquea la operación básica de compra a un Supplier.

**Independent Test**: Con un Supplier ya creado, puede probarse registrando una
evaluación con calificación de 1 a 5 estrellas en varios aspectos, y verificando que la
calificación general del Supplier se actualiza.

**Acceptance Scenarios**:

1. **Given** un Supplier, **When** un usuario registra una evaluación con calificación
   de calidad, precio, tiempo de entrega, atención y cumplimiento (escala 1 a 5),
   **Then** la evaluación queda asociada al Supplier con fecha y usuario.
2. **Given** varias evaluaciones registradas para un Supplier, **When** se consulta su
   calificación general, **Then** el sistema la calcula a partir del histórico de
   evaluaciones.

---

### User Story 4 - Documentación del Proveedor (Priority: P4)

Como usuario de Compras, quiero adjuntar documentos (contratos, certificados, listas de
precios, documentación fiscal) a un Proveedor, para tener toda su documentación
respaldatoria centralizada.

**Why this priority**: Enriquece el registro ya existente (US1); no es necesaria para
el funcionamiento básico del módulo.

**Independent Test**: Con un Supplier ya creado, puede probarse adjuntando un contrato y
un certificado, verificando que ambos quedan disponibles desde su ficha.

**Acceptance Scenarios**:

1. **Given** un Supplier, **When** un usuario adjunta un documento (contrato,
   certificado, lista de precios u otro), **Then** queda disponible mientras exista el
   Supplier.

---

### User Story 5 - Archivado, búsqueda e indicadores (Priority: P5)

Como Administrador, quiero archivar Proveedores que ya no operan, buscarlos por
distintos atributos, e importar/exportar el listado, y ver indicadores globales, para
mantener el catálogo de Proveedores ordenado y con visibilidad agregada.

**Why this priority**: Aporta mantenimiento y eficiencia operativa sobre Proveedores ya
existentes (US1-US4); no bloquea el uso básico del módulo.

**Independent Test**: Puede probarse archivando un Supplier, verificando que no puede
usarse en nuevas compras, restaurándolo, buscando por distintos atributos, y
consultando los indicadores globales.

**Acceptance Scenarios**:

1. **Given** un Supplier activo, **When** un Administrador lo archiva, **Then** pasa a
   estado `Archivado` sin eliminarse físicamente (RN-005) y no puede utilizarse en
   nuevas compras (RN-004).
2. **Given** un Supplier `Archivado`, **When** un Administrador lo restaura, **Then**
   vuelve a estado `Activo`.
3. **Given** varios Suppliers cargados, **When** se busca por nombre, CUIT, ciudad,
   responsable, estado, producto o etiquetas, **Then** el sistema devuelve los que
   coinciden.
4. **Given** el conjunto de Suppliers de una Organization, **When** se consultan los
   indicadores, **Then** el sistema muestra correctamente el total, activos, inactivos,
   productos por proveedor, tiempo promedio de entrega y calificación promedio.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente un Supplier? El sistema MUST impedirlo
  (RN-005); solo existe `Archivado` como baja lógica.
- ¿Qué ocurre si se intenta usar un Supplier `Archivado` en una nueva compra (ver
  [specs/022-purchases/spec.md](../022-purchases/spec.md))? El sistema MUST impedirlo
  (RN-004); las compras ya realizadas antes del archivado no se ven afectadas.
- ¿Qué pasa si dos usuarios editan el mismo Supplier al mismo tiempo? El sistema MUST
  conservar el último cambio guardado sin corromper el registro, informando al segundo
  usuario que los datos se actualizaron.
- ¿Qué sucede si se intenta importar un archivo con un CUIT duplicado respecto a un
  Supplier ya existente en la Organization? El sistema MUST rechazar (o marcar como
  duplicado a revisar) ese registro sin interrumpir el resto de la importación.
- ¿Qué pasa si se desasocia un Product de un Supplier que ya tuvo compras registradas
  con él (ver [specs/022-purchases/spec.md](../022-purchases/spec.md))? El sistema MUST
  conservar el historial de esas compras intacto, afectando solo las asociaciones
  futuras.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear Suppliers manualmente con datos generales,
  fiscales, de contacto y de ubicación.
- **FR-002**: El sistema MUST exigir un CUIT/NIF único por Supplier dentro de la misma
  Organization.
- **FR-003**: El sistema MUST permitir registrar múltiples contactos asociados a un
  Supplier.
- **FR-004**: El sistema MUST permitir asociar uno o más Products (spec 018) que un
  Supplier suministra.
- **FR-005**: El sistema MUST permitir registrar condiciones comerciales de un Supplier
  (condición de pago, moneda, lista de precios, tiempo promedio de entrega).
- **FR-006**: El sistema MUST permitir adjuntar documentos (contratos, certificados,
  listas de precios, documentación fiscal, archivos adicionales) a un Supplier.
- **FR-007**: El sistema MUST permitir registrar evaluaciones periódicas de un Supplier
  en calidad, precio, tiempo de entrega, atención y cumplimiento, en escala de 1 a 5.
- **FR-008**: El sistema MUST calcular una calificación general del Supplier a partir
  de su historial de evaluaciones.
- **FR-009**: El sistema MUST permitir buscar y filtrar Suppliers por nombre, CUIT,
  ciudad, responsable, estado, producto o etiquetas.
- **FR-010**: El sistema MUST permitir archivar un Supplier (baja lógica) y restaurarlo
  posteriormente.
- **FR-011**: El sistema MUST impedir utilizar un Supplier `Archivado` en nuevas
  operaciones de compra.
- **FR-012**: El sistema MUST permitir importar y exportar Suppliers en lote,
  respetando las mismas reglas de validación y unicidad que el alta manual.
- **FR-013**: El sistema MUST calcular indicadores: total de Suppliers, activos,
  inactivos, productos por proveedor, tiempo promedio de entrega y calificación
  promedio.
- **FR-014**: El sistema MUST registrar en el Audit Log la creación, modificación,
  archivado, restauración, cambio de estado, evaluaciones, documentos, importación y
  exportación de Suppliers.
- **FR-015**: El sistema MUST garantizar que los Suppliers de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Supplier**: Empresa o persona que suministra Products o servicios a la
  Organization (ver [Domain Model](../../docs/domain-model.md)); atributos:
  identificación (nombre, razón social, nombre comercial, estado), fiscales (CUIT/NIF,
  condición fiscal, número de IVA), contacto (email, teléfono, sitio web), ubicación
  (país, provincia, ciudad, dirección, código postal), comercial (responsable interno,
  condición de pago, moneda, lista de precios, tiempo promedio de entrega) y adicional
  (observaciones, etiquetas, fecha de alta).
- **SupplierStatus**: Estado del Supplier: `Activo`, `Inactivo`, `Suspendido`,
  `Archivado`.
- **SupplierContact**: Persona de contacto asociada a un Supplier (mismo concepto que
  `Contact` de spec 009, aplicado a Suppliers en vez de Customers).
- **SupplierProduct**: Relación entre un Supplier y un Product (spec 018) que
  suministra.
- **SupplierEvaluation**: Evaluación periódica de un Supplier (calidad, precio, tiempo
  de entrega, atención, cumplimiento; escala 1-5), con fecha y usuario.
- **Audit Log**: Registro inmutable de creación/modificación/archivado/restauración/
  cambio de estado/evaluaciones/documentos/importación/exportación de Suppliers.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede crear un Supplier con sus datos principales en menos de
  2 minutos.
- **SC-002**: El 100% de los intentos de crear un CUIT duplicado dentro de la misma
  Organization son rechazados.
- **SC-003**: El 100% de los Suppliers `Archivado` son rechazados al intentar usarlos
  en una nueva operación de compra.
- **SC-004**: El 100% de las acciones de creación, modificación, archivado, evaluación
  y documentación quedan registradas en el Audit Log.
- **SC-005**: Las búsquedas de Suppliers devuelven resultados en menos de 300 ms en el
  95% de los casos.
- **SC-006**: La calificación general de un Supplier refleja el promedio de sus
  evaluaciones con 100% de exactitud, verificable por recomputación independiente.

## Assumptions

- La regla de unicidad por defecto es el CUIT/NIF dentro de la misma Organization
  (RN-002, RN-003), mismo criterio ya usado para Customer en spec 008.
- Los contactos de un Supplier (`SupplierContact`) se modelan como un concepto análogo
  a `Contact` (spec 009) pero propio de este módulo, ya que un Contact de spec 009 está
  vinculado a un Customer, no a un Supplier; no se fuerza una entidad compartida entre
  ambos.
- La calificación general (FR-008) se calcula como un promedio simple de las
  evaluaciones registradas en esta fase; ponderaciones más sofisticadas (por
  antigüedad, por peso de cada aspecto) quedan fuera de alcance.
- Órdenes de compra se definen en
  [specs/022-purchases/spec.md](../022-purchases/spec.md), que consume `Supplier` sin
  redefinirlo. Pagos a proveedores, contabilidad, licitaciones, firma electrónica de
  contratos, integraciones con ERPs externos e IA para evaluación automática quedan
  explícitamente fuera de alcance de esta fase, según el input.
