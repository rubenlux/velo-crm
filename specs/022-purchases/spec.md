# Feature Specification: Gestión de Compras

**Feature Branch**: `022-purchases`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-022 — Gestión de Compras. Administrar el ciclo completo de adquisición desde la solicitud de compra hasta la recepción de mercadería: solicitud → aprobación → orden de compra → envío al proveedor → recepción parcial o total → actualización automática de inventario → compra finalizada; líneas de producto/servicio con cálculo automático de subtotal/impuestos/descuentos/total, cancelación, búsqueda, indicadores (compras pendientes/aprobadas/recepcionadas/canceladas, tiempo promedio de entrega, proveedores más utilizados, monto total comprado), con auditoría completa y aislamiento entre organizaciones. No incluye pagos a proveedores, contabilidad, comercio exterior ni licitaciones."

**Nota de terminología**: Esta especificación posee la entidad `Purchase` del bounded
context **Inventory** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)
y [docs/domain-model.md](../../docs/domain-model.md), que ya anticipaban `Purchase` bajo
ese contexto). Resuelve la dependencia hacia adelante que habían dejado abiertas
[specs/020-inventory/spec.md](../020-inventory/spec.md) (el tipo de `StockMovement`
"Compra") y [specs/021-suppliers/spec.md](../021-suppliers/spec.md) ("Órdenes de compra"
mencionadas como fuera de alcance). Depende de `Supplier` (spec 021) y `Product` (spec
018); genera un `StockMovement` de tipo `Compra` en spec 020 al confirmar una recepción,
sin redefinir el modelo de Inventory. No incluye Pagos a Proveedores (una spec futura,
análoga a `Payment` de spec 017 pero para egresos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear solicitud de compra con cálculo automático (Priority: P1) 🎯

Como usuario de Compras, quiero crear una solicitud de compra a un Proveedor con líneas
de producto o servicio, con sus totales calculados automáticamente, para iniciar el
proceso de abastecimiento de forma ordenada.

**Why this priority**: Es el valor central del módulo: sin poder crear una solicitud
correctamente calculada no hay nada que aprobar, enviar ni recepcionar en las historias
siguientes.

**Independent Test**: Puede probarse creando una solicitud de compra para un Supplier
existente (spec 021) con líneas de producto (spec 018), verificando que el sistema
calcula subtotal, impuestos, descuentos y total automáticamente.

**Acceptance Scenarios**:

1. **Given** un Supplier existente, **When** un usuario de Compras crea una solicitud
   con líneas de producto/servicio, cantidad y precio unitario, **Then** el sistema le
   asigna un número correlativo, calcula subtotal/impuestos/descuentos/total, y la deja
   en estado `Borrador`.
2. **Given** una solicitud en `Borrador`, **When** el usuario la envía a aprobación,
   **Then** pasa a estado `Pendiente de aprobación`.
3. **Given** una solicitud en `Borrador` o `Pendiente de aprobación`, **When** se edita,
   **Then** los cambios se guardan y los totales se recalculan.

---

### User Story 2 - Aprobar o rechazar una solicitud de compra (Priority: P2)

Como Administrador o responsable de Compras, quiero aprobar o rechazar una solicitud de
compra, para controlar qué adquisiciones efectivamente se concretan.

**Why this priority**: Convierte una solicitud armada (US1) en un compromiso real de
compra; sin esta historia, cualquier solicitud se ejecutaría sin control.

**Independent Test**: Con una solicitud `Pendiente de aprobación`, puede probarse
aprobándola y verificando que se genera la Orden de Compra; por separado,
rechazándola y verificando que no avanza al envío al Proveedor.

**Acceptance Scenarios**:

1. **Given** una solicitud `Pendiente de aprobación`, **When** un responsable la
   aprueba, **Then** pasa a estado `Aprobada` y el sistema genera la Orden de Compra
   correspondiente (RN-003).
2. **Given** una solicitud `Pendiente de aprobación`, **When** un responsable la
   rechaza, **Then** la solicitud queda registrada como rechazada, conservando su
   historial, sin generar Orden de Compra.
3. **Given** una solicitud `Aprobada`, **When** se intenta modificar sus líneas,
   **Then** el sistema exige una nueva solicitud o una revisión formal, no una edición
   directa de la orden ya aprobada.

---

### User Story 3 - Enviar al Proveedor y registrar la recepción (Priority: P3)

Como usuario de Compras o Inventario, quiero enviar la Orden de Compra al Proveedor y
registrar la recepción de la mercadería (parcial o total), para que el inventario se
actualice automáticamente a medida que llega la mercadería.

**Why this priority**: Es el punto de mayor valor de negocio del módulo: conecta la
compra aprobada (US1/US2) con el inventario real (spec 020).

**Independent Test**: Con una Orden de Compra `Aprobada`, puede probarse marcándola como
`Enviada`, registrando una recepción parcial y verificando que el inventario (spec 020)
se actualiza solo con lo recibido; luego registrando el resto para verificar que pasa a
`Recepcionada`.

**Acceptance Scenarios**:

1. **Given** una Orden de Compra `Aprobada`, **When** se marca como enviada al
   Proveedor, **Then** pasa a estado `Enviada`.
2. **Given** una Orden de Compra `Enviada`, **When** se registra la recepción de parte
   de las cantidades solicitadas, **Then** pasa a estado `Recepción parcial`, se genera
   un `StockMovement` de tipo `Compra` (spec 020) por lo recibido, y las cantidades
   pendientes quedan visibles (RN-004, RN-005).
3. **Given** una Orden de Compra en `Recepción parcial`, **When** se recibe el resto de
   las cantidades pendientes, **Then** pasa a estado `Recepcionada` y se genera el
   `StockMovement` correspondiente al remanente.
4. **Given** una recepción, **When** se registra, **Then** incluye fecha, usuario
   responsable, productos y cantidades recibidas, cantidades pendientes y
   observaciones.

---

### User Story 4 - Cancelar y archivar una compra (Priority: P4)

Como usuario de Compras, quiero cancelar una solicitud u Orden de Compra que ya no se
va a concretar, para mantener el proceso de abastecimiento ordenado sin perder
trazabilidad.

**Why this priority**: Cubre el cierre de compras que no llegan a recepcionarse
(US1-US3); no bloquea el flujo normal de compra y recepción.

**Independent Test**: Con una compra en cualquier estado previo a `Recepcionada`, puede
probarse cancelándola y verificando que conserva su historial completo sin poder
recepcionarse luego.

**Acceptance Scenarios**:

1. **Given** una compra en cualquier estado previo a `Recepcionada`, **When** un
   usuario la cancela, **Then** pasa a estado `Cancelada` conservando su historial
   completo (RN-006), sin eliminarse físicamente (RN-007).
2. **Given** una compra `Cancelada`, **When** se intenta registrar una recepción sobre
   ella, **Then** el sistema lo impide.

---

### User Story 5 - Búsqueda, exportación e indicadores (Priority: P5)

Como Administrador, quiero buscar compras por distintos atributos, exportarlas, y ver
indicadores globales (compras pendientes/aprobadas/recepcionadas/canceladas, tiempo
promedio de entrega, proveedores más utilizados, monto total comprado), para entender
el estado del abastecimiento de la Organization.

**Why this priority**: Aporta valor analítico sobre compras ya existentes (US1-US4); no
bloquea la operación básica de compra y recepción.

**Independent Test**: Con varias compras en distintos estados, puede probarse buscando
por distintos atributos, exportando un conjunto de compras, y consultando los
indicadores globales.

**Acceptance Scenarios**:

1. **Given** varias compras cargadas, **When** se busca por número, Supplier,
   responsable, estado, fecha, producto o total, **Then** el sistema devuelve las que
   coinciden.
2. **Given** un conjunto de compras, **When** un Administrador las exporta, **Then**
   obtiene un archivo con sus datos principales.
3. **Given** el conjunto de compras de una Organization, **When** se consultan los
   indicadores, **Then** el sistema muestra correctamente el total, pendientes,
   aprobadas, recepcionadas, canceladas, tiempo promedio de entrega, Suppliers más
   utilizados, productos más comprados y monto total comprado.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente una compra? El sistema MUST impedirlo
  (RN-007); solo existen `Cancelada`/`Archivada` como baja lógica.
- ¿Qué ocurre si se registra una recepción por una cantidad mayor a la solicitada en la
  Orden de Compra? El sistema MUST rechazar el excedente o exigir una revisión de la
  orden antes de aceptar la recepción, sin generar stock de más de forma silenciosa.
- ¿Qué pasa si se intenta cancelar una compra que ya tiene recepciones parciales
  registradas? El sistema MUST permitirlo, conservando en Inventory (spec 020) el stock
  ya recibido y registrando la cancelación solo sobre las cantidades pendientes.
- ¿Qué sucede si el Supplier de una compra se archiva (spec 021) mientras la compra
  sigue en curso? El sistema MUST permitir continuar y recepcionar la compra ya
  aprobada, aunque el Supplier ya no esté disponible para nuevas compras.
- ¿Qué pasa si dos usuarios registran recepciones sobre la misma compra al mismo
  tiempo? El sistema MUST aplicar ambas recepciones de forma consistente sobre las
  cantidades pendientes, sin perder ninguno de los dos registros ni exceder lo
  solicitado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear solicitudes de compra asociadas a un
  Supplier (spec 021).
- **FR-002**: El sistema MUST permitir agregar líneas de producto o servicio (spec
  018) con cantidad y precio unitario a una compra.
- **FR-003**: El sistema MUST calcular automáticamente subtotal, descuentos, impuestos
  y total de la compra a partir de sus líneas.
- **FR-004**: El sistema MUST permitir aprobar o rechazar una solicitud de compra
  `Pendiente de aprobación`.
- **FR-005**: El sistema MUST generar automáticamente una Orden de Compra al aprobar
  una solicitud (RN-003).
- **FR-006**: El sistema MUST permitir marcar una Orden de Compra como enviada al
  Supplier.
- **FR-007**: El sistema MUST permitir registrar recepciones parciales o totales,
  manteniendo la compra abierta hasta completar todas las cantidades (RN-005).
- **FR-008**: El sistema MUST generar automáticamente un `StockMovement` de tipo
  `Compra` en [specs/020-inventory/spec.md](../020-inventory/spec.md) por cada
  recepción confirmada (RN-004).
- **FR-009**: El sistema MUST permitir cancelar una compra en cualquier estado previo a
  `Recepcionada`, conservando su historial completo.
- **FR-010**: El sistema MUST permitir adjuntar documentos a una compra.
- **FR-011**: El sistema MUST permitir buscar y filtrar compras por número, Supplier,
  responsable, estado, fecha, producto o total.
- **FR-012**: El sistema MUST permitir exportar compras.
- **FR-013**: El sistema MUST calcular indicadores: total de compras, pendientes,
  aprobadas, recepcionadas, canceladas, tiempo promedio de entrega, Suppliers más
  utilizados, productos más comprados y monto total comprado.
- **FR-014**: El sistema MUST impedir la eliminación física de una compra; solo
  `Cancelada`/`Archivada` existen como baja lógica.
- **FR-015**: El sistema MUST registrar en el Audit Log la creación, aprobación,
  rechazo, envío, recepción parcial, recepción total, cancelación, archivado y
  modificación de compras.
- **FR-016**: El sistema MUST garantizar que las compras de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Purchase**: Proceso mediante el cual la Organization adquiere Products o servicios
  de un Supplier (ver [Domain Model](../../docs/domain-model.md)); comienza como
  solicitud y finaliza con la recepción. Atributos: información general (número,
  Supplier, responsable, estado), comercial (moneda, condición de pago, fecha
  estimada, fecha de recepción) y adicional (observaciones, documentos, adjuntos).
- **PurchaseLine**: Línea de una Purchase (producto o servicio, cantidad, precio
  unitario, descuento, impuesto, subtotal); referencia un `Product` del catálogo (spec
  018).
- **PurchaseStatus**: Estado de la Purchase: `Borrador`, `Pendiente de aprobación`,
  `Aprobada`, `Enviada`, `Recepción parcial`, `Recepcionada`, `Cancelada`, `Archivada`.
- **PurchaseReceipt**: Recepción de mercadería asociada a una Purchase, con fecha,
  usuario responsable, productos y cantidades recibidas, cantidades pendientes y
  observaciones; dispara la generación de un `StockMovement` (spec 020).
- **Audit Log**: Registro inmutable de creación/aprobación/rechazo/envío/recepción
  parcial/recepción total/cancelación/archivado/modificación de compras.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede crear una solicitud de compra con al menos 3 líneas y
  ver su total calculado correctamente en menos de 3 minutos.
- **SC-002**: El 100% de las aprobaciones generan correctamente una Orden de Compra.
- **SC-003**: El 100% de las recepciones (parciales o totales) generan un
  `StockMovement` de tipo `Compra` consistente con las cantidades recibidas.
- **SC-004**: El 100% de las compras `Recepcionada` reflejan que sus cantidades
  pendientes llegaron a cero.
- **SC-005**: El 100% de las acciones de creación, aprobación, rechazo, envío,
  recepción y cancelación quedan registradas en el Audit Log.
- **SC-006**: El 0% de las compras enviadas puede eliminarse físicamente.
- **SC-007**: Las búsquedas de compras devuelven resultados en menos de 300 ms en el
  95% de los casos.

## Assumptions

- La actualización de inventario (FR-008) se realiza generando un `StockMovement` de
  tipo `Compra` por cada recepción; el "documento origen" de ese movimiento (ver spec
  020) referencia la Purchase correspondiente.
- El excedente de una recepción por encima de lo solicitado (edge case) se resuelve
  rechazando el excedente o exigiendo una revisión de la Orden de Compra; el mecanismo
  exacto se define en la fase de planificación técnica.
- Las aprobaciones (US2) usan el sistema de Roles/Permissions ya definido en
  [specs/007-roles-permissions/spec.md](../007-roles-permissions/spec.md) (por
  ejemplo, un Permission específico `purchase.approve`), sin definir un mecanismo de
  aprobación nuevo acá.
- Pagos a Proveedores, contabilidad, comercio exterior, gestión de importaciones,
  licitaciones, automatización mediante IA e integraciones con ERPs externos quedan
  explícitamente fuera de alcance de esta fase, según el input; los Pagos a Proveedores
  se definirán en una spec futura análoga a `Payment` (spec 017) pero para egresos.
