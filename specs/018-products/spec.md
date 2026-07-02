# Feature Specification: Gestión de Productos y Servicios

**Feature Branch**: `018-products`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-018 — Gestión de Productos y Servicios. Administrar el catálogo comercial de la organización (productos físicos, servicios, productos digitales, suscripciones, combos, personalizados): identificación (código interno, SKU único por Organization, código de barras), datos comerciales (precio de costo/venta, moneda, impuestos, descuento permitido), clasificación (categoría, subcategoría, marca, etiquetas), control de stock opcional para productos físicos (nunca para servicios), imágenes/archivos adjuntos, archivado (los productos archivados no pueden usarse en nuevas Cotizaciones/Facturas), búsqueda/filtros, importación/exportación, indicadores de catálogo, con auditoría completa y aislamiento entre organizaciones. No incluye inventario, producción, fabricación ni comercio electrónico."

**Nota de terminología**: Esta especificación posee la entidad `Product` del bounded
context **Inventory** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)
y [docs/domain-model.md](../../docs/domain-model.md), que ya listaban `Product` bajo ese
contexto). Resuelve la dependencia hacia adelante que habían dejado abierta
[specs/015-quotes/spec.md](../015-quotes/spec.md) (`QuoteLine` referencia un Product) y
[specs/016-invoicing/spec.md](../016-invoicing/spec.md) (`InvoiceLine` referencia un
Product). No incluye el control de existencias físicas (`Inventory`, entidad separada
también anticipada en el Domain Model) ni Compras/Proveedores — esas capacidades se
definen en [specs/020-inventory/spec.md](../020-inventory/spec.md), que consume este
catálogo sin redefinirlo.

**Nota de deprecación (2026-07-01)**: `Category` (jerarquía de categorías/
subcategorías, reordenamiento, fusión, prevención de ciclos) se **extrajo** a
[specs/019-categories/spec.md](../019-categories/spec.md), porque una Category real
forma una jerarquía multinivel con su propio ciclo de vida — suficiente complejidad
propia para ser una entidad de primer nivel. Esta spec ya no define esa jerarquía; solo
consume `Category` como clasificación de un `Product` (FR-003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear productos y servicios (Priority: P1) 🎯

Como usuario Comercial o de Inventario, quiero crear productos y servicios con sus
datos de identificación, comerciales y de clasificación, para tener un catálogo
centralizado que puedan usar Cotizaciones y Facturación.

**Why this priority**: Es el valor central del módulo: sin catálogo no hay nada que
cotizar (spec 015) ni facturar (spec 016).

**Independent Test**: Puede probarse creando un producto físico y un servicio, cada uno
con su SKU, precio y categoría, verificando que ambos quedan disponibles en el catálogo
de la Organization sin depender de stock ni de otras historias.

**Acceptance Scenarios**:

1. **Given** una Organization, **When** un usuario crea un producto físico con SKU,
   nombre, precio de costo/venta y categoría, **Then** el producto queda creado en
   estado `Activo`.
2. **Given** una Organization, **When** un usuario crea un servicio (sin control de
   stock posible, RN-007), **Then** el servicio queda creado en el catálogo igual que
   un producto físico, sin opción de habilitar stock.
3. **Given** un SKU ya usado en una Organization, **When** se intenta crear otro
   producto con el mismo SKU en esa Organization, **Then** el sistema lo impide
   (RN-002).
4. **Given** dos Organizations distintas, **When** cada una registra un producto con el
   mismo SKU, **Then** el sistema lo permite: la unicidad de SKU es por Organization.
5. **Given** un producto, **When** se le asignan imágenes y archivos (manuales, fichas
   técnicas, certificados), **Then** quedan disponibles desde su ficha.

---

### User Story 2 - Precios, costos y control de stock opcional (Priority: P2)

Como usuario Comercial, quiero definir y actualizar el precio de venta y el costo de un
producto, y decidir si un producto físico controla stock, para mantener el catálogo
económicamente al día.

**Why this priority**: Aporta valor sobre productos ya creados (US1); un catálogo con
precios desactualizados es menos útil, pero el producto ya existe y es utilizable sin
esta historia.

**Independent Test**: Con un producto ya creado, puede probarse cambiando su precio y su
costo, verificando que el cambio queda auditado y que los documentos ya emitidos
(Cotizaciones/Facturas previas) no se ven afectados.

**Acceptance Scenarios**:

1. **Given** un producto, **When** se cambia su precio de venta, **Then** el nuevo
   precio aplica a operaciones futuras, sin modificar Cotizaciones o Facturas ya
   emitidas con el precio anterior (RN-004).
2. **Given** un producto, **When** se cambia su costo, **Then** el cambio queda
   registrado en el Audit Log (RN-005).
3. **Given** un producto físico, **When** un usuario habilita el control de stock,
   **Then** el sistema permite configurar stock mínimo/máximo y unidad de medida
   (RN-008).
4. **Given** un servicio, **When** se intenta habilitar control de stock, **Then** el
   sistema lo impide (RN-007: un servicio nunca controla stock).

---

### User Story 3 - Archivado y restauración de productos (Priority: P3)

Como Administrador, quiero archivar un producto discontinuado y restaurarlo si vuelve a
comercializarse, para mantener el catálogo ordenado sin perder su historial ni romper
documentos previos.

**Why this priority**: Es necesario para el mantenimiento del catálogo con el tiempo,
pero un catálogo ya es funcional operando solo con productos activos (US1/US2).

**Independent Test**: Puede probarse archivando un producto, verificando que no puede
usarse en una nueva Cotización, y luego restaurándolo para confirmar que vuelve a estar
disponible.

**Acceptance Scenarios**:

1. **Given** un producto activo, **When** un Administrador lo archiva, **Then** pasa a
   estado `Archivado` sin eliminarse físicamente (RN-006).
2. **Given** un producto `Archivado`, **When** se intenta agregarlo a una nueva
   Cotización o Factura, **Then** el sistema lo impide (RN-003).
3. **Given** un producto ya usado en Cotizaciones/Facturas emitidas antes de
   archivarse, **When** se consultan esos documentos, **Then** siguen mostrando el
   producto normalmente (no se ven afectados por el archivado, RN-004).
4. **Given** un producto `Archivado`, **When** un Administrador lo restaura, **Then**
   vuelve a estado `Activo` y puede usarse en nuevas operaciones.

---

### User Story 4 - Búsqueda, filtros e importación/exportación (Priority: P4)

Como usuario Comercial, quiero buscar y filtrar productos por distintos atributos, e
importar/exportar el catálogo en lote, para trabajar eficientemente con catálogos
grandes.

**Why this priority**: Aporta eficiencia operativa sobre un catálogo ya existente
(US1-US3); no bloquea el uso básico con pocos productos.

**Independent Test**: Con varios productos cargados, puede probarse buscando y
filtrando por distintos atributos; por separado, exportando el catálogo e
importándolo en otra Organization de prueba.

**Acceptance Scenarios**:

1. **Given** varios productos cargados, **When** se busca por código, SKU, código de
   barras, nombre, categoría, marca, estado o etiquetas, **Then** el sistema devuelve
   los que coinciden.
2. **Given** un catálogo de productos, **When** un Administrador lo exporta, **Then**
   obtiene un archivo con sus datos principales.
3. **Given** un archivo de productos válido, **When** se importa, **Then** los
   productos se crean respetando las mismas reglas de validación y unicidad de SKU que
   el alta manual.

---

### User Story 5 - Indicadores del catálogo (Priority: P5)

Como Administrador, quiero ver indicadores del estado de mi catálogo (total de
productos/servicios, activos, archivados, sin precio, sin categoría), para detectar
datos incompletos o desactualizados.

**Why this priority**: Aporta valor de mantenimiento sobre un catálogo ya poblado
(US1-US4); no bloquea la operación comercial diaria.

**Independent Test**: Con un catálogo con productos completos e incompletos, puede
probarse consultando los indicadores y verificando que reflejan correctamente cuántos
productos están sin precio o sin categoría.

**Acceptance Scenarios**:

1. **Given** un catálogo con productos y servicios, **When** se consultan los
   indicadores, **Then** el sistema muestra correctamente el total de productos/
   servicios, activos, archivados, sin precio y sin categoría.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente un producto? El sistema MUST impedirlo
  (RN-006); solo existe `Archivado` como baja lógica.
- ¿Qué ocurre si un producto se usa en una Cotización mientras está `Activo` y luego se
  archiva antes de que esa Cotización se convierta en Factura? El sistema MUST permitir
  la conversión con los datos ya congelados en la Cotización, sin bloquear por el
  archivado posterior del producto.
- ¿Qué pasa si se intenta importar un archivo con un SKU duplicado respecto a un
  producto ya existente en la Organization? El sistema MUST rechazar (o marcar como
  duplicado a revisar) ese registro sin interrumpir el resto de la importación.
- ¿Qué sucede si dos usuarios editan el mismo producto al mismo tiempo? El sistema MUST
  conservar el último cambio guardado sin corromper el registro, informando al segundo
  usuario que los datos se actualizaron.
- ¿Qué pasa si se intenta habilitar stock en un servicio mediante importación masiva?
  El sistema MUST ignorar ese campo para servicios, consistente con RN-007.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear productos físicos, servicios, productos
  digitales, suscripciones, combos y productos personalizados.
- **FR-002**: El sistema MUST exigir un SKU único por producto dentro de la misma
  Organization.
- **FR-003**: El sistema MUST permitir asignar una Category existente (ver
  [specs/019-categories/spec.md](../019-categories/spec.md)), marca y etiquetas a un
  producto.
- **FR-004**: El sistema MUST permitir asignar múltiples imágenes (incluyendo una
  imagen principal) y múltiples archivos (manuales, fichas técnicas, certificados) a un
  producto.
- **FR-005**: El sistema MUST permitir definir precio de costo, precio de venta,
  moneda, impuestos y descuento permitido por producto.
- **FR-006**: El sistema MUST permitir habilitar y configurar control de stock (stock
  mínimo, stock máximo, unidad de medida) únicamente para productos físicos.
- **FR-007**: El sistema MUST impedir habilitar control de stock en servicios.
- **FR-008**: El sistema MUST conservar el precio/costo registrado en documentos ya
  emitidos (Cotizaciones, Facturas) sin modificarlos retroactivamente ante cambios
  posteriores del catálogo.
- **FR-009**: El sistema MUST permitir archivar un producto (baja lógica) y restaurarlo
  posteriormente.
- **FR-010**: El sistema MUST impedir agregar un producto `Archivado` a una nueva
  Cotización o Factura.
- **FR-011**: El sistema MUST permitir buscar y filtrar productos por código, SKU,
  código de barras, nombre, categoría, marca, estado o etiquetas.
- **FR-012**: El sistema MUST permitir importar y exportar el catálogo en lote,
  respetando las mismas reglas de validación y unicidad que el alta manual.
- **FR-013**: El sistema MUST calcular indicadores de catálogo: total de productos/
  servicios, activos, archivados, sin precio y sin categoría.
- **FR-014**: El sistema MUST registrar en el Audit Log la creación, modificación,
  cambio de precio, cambio de costo, archivado, restauración, importación y
  exportación de productos.
- **FR-015**: El sistema MUST garantizar que los productos de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Product**: Bien físico, digital, servicio, suscripción, combo o producto
  personalizado comercializable por la Organization (ver
  [Domain Model](../../docs/domain-model.md)); fuente única de catálogo para Quote
  (spec 015), Invoice (spec 016) y una futura spec de Inventario. Atributos:
  identificación (código interno, SKU, código de barras, nombre, descripciones),
  comercial (precio de costo/venta, moneda, impuestos, descuento permitido),
  clasificación (categoría, subcategoría, marca, etiquetas), stock (control opcional,
  solo productos físicos: stock mínimo/máximo, unidad de medida) y adicional
  (imágenes, archivos, observaciones).
- **ProductType**: Tipo de Product: Producto físico, Servicio, Producto digital,
  Suscripción, Combo, Personalizado.
- **ProductStatus**: Estado del Product: `Activo`, `Inactivo`, `Descontinuado`,
  `Archivado`.
- **Category**: Ya no se define acá — ver
  [specs/019-categories/spec.md](../019-categories/spec.md); esta spec solo la
  referencia para clasificar un Product.
- **Audit Log**: Registro inmutable de creación/modificación/cambio de precio/cambio de
  costo/archivado/restauración/importación/exportación de productos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede crear un producto o servicio con sus datos principales
  en menos de 2 minutos.
- **SC-002**: El 100% de los intentos de crear un SKU duplicado dentro de la misma
  Organization son rechazados.
- **SC-003**: El 100% de los productos `Archivado` son rechazados al intentar
  agregarlos a una nueva Cotización o Factura.
- **SC-004**: El 100% de los cambios de precio/costo quedan registrados en el Audit
  Log, sin alterar documentos (Cotizaciones/Facturas) ya emitidos.
- **SC-005**: Las búsquedas de productos devuelven resultados en menos de 300 ms en el
  95% de los casos.
- **SC-006**: El sistema soporta al menos 1 millón de productos por Organization sin
  degradar el tiempo de búsqueda definido en SC-005.

## Assumptions

- El control de existencias físicas (cantidades disponibles, movimientos de stock) no
  es parte de esta spec: `Product` solo define si el control de stock está habilitado y
  sus umbrales (mínimo/máximo); el registro de movimientos y existencias reales se
  define en [specs/020-inventory/spec.md](../020-inventory/spec.md), que consume este
  catálogo.
- Compras y Proveedores (mencionados en las Relaciones del input) quedan fuera de
  alcance de spec 020 (Inventory) también; se definirán en una spec futura de Compras.
- Los "productos más vendidos" (indicador marcado como "futuro" en el input) requieren
  datos históricos de ventas (Invoice/Payment) y quedan fuera de alcance de esta fase.
- El formato de importación/exportación (CSV, Excel, u otro) se decide en la fase de
  planificación técnica; esta spec solo exige que el resultado respete las mismas
  reglas de validación y unicidad que el alta manual (mismo criterio que spec 008 para
  Customers).
