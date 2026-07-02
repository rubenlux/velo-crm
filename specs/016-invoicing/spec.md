# Feature Specification: Gestión de Facturación

**Feature Branch**: `016-invoicing`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-016 — Gestión de Facturación. Generar, administrar y controlar facturas emitidas por la organización, desde la conversión de una Cotización aceptada hasta el registro de pagos: emisión manual o desde Quote, numeración automática, cálculo automático de subtotal/impuestos/descuentos/total, pagos parciales y totales con actualización automática de saldo/estado, notas de crédito y débito, anulación, duplicación, exportación en PDF, con auditoría completa y aislamiento entre organizaciones. No incluye facturación electrónica, integración con organismos fiscales, contabilidad general ni conciliación bancaria."

**Nota de terminología**: Esta especificación posee la entidad `Invoice` del bounded
context **Sales** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)),
resolviendo la dependencia hacia adelante que había dejado abierta
[specs/015-quotes/spec.md](../015-quotes/spec.md) (FR-013 de esa spec: "convertir una
Quote Aceptada en una Invoice"). Depende de `Customer` (spec 008) y, opcionalmente, de
`Quote` (spec 015) y `Opportunity` (spec 011). Introduce `Payment`, `CreditNote` y
`DebitNote` como entidades propias de este módulo. No redefine facturación electrónica
ni integración fiscal, explícitamente fuera de alcance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y emitir Facturas con cálculo automático (Priority: P1) 🎯

Como usuario de Finanzas o Comercial autorizado, quiero crear una Factura manualmente o
generarla desde una Cotización aceptada, con sus totales calculados automáticamente,
para emitir comprobantes precisos sin recalcular a mano.

**Why this priority**: Es el valor central del módulo: sin poder crear y emitir una
Factura correctamente calculada no hay nada que pagar, anular ni notar en las historias
siguientes.

**Independent Test**: Puede probarse creando una Factura manual con líneas de producto/
servicio y verificando su cálculo; por separado, convirtiendo una Quote `Aceptada`
(spec 015) en Factura y verificando que conserva sus datos económicos.

**Acceptance Scenarios**:

1. **Given** un Customer existente, **When** un usuario autorizado crea una Factura
   manualmente con líneas de producto/servicio, **Then** el sistema le asigna un número
   correlativo automático, calcula subtotal/impuestos/descuentos/total, y la deja en
   estado `Borrador`.
2. **Given** una Quote `Aceptada` (spec 015), **When** se genera una Factura desde ella,
   **Then** la Factura conserva Customer, productos, cantidades, precios, descuentos,
   impuestos y observaciones de la Quote de origen.
3. **Given** una Factura en `Borrador`, **When** el usuario la emite, **Then** pasa a
   estado `Emitida` y luego a `Pendiente de Pago`, y ya no puede eliminarse físicamente
   (RN-003).
4. **Given** una Factura `Pagada`, **When** se intenta modificarla, **Then** el sistema
   lo impide (RN-005).

---

### User Story 2 - Registrar pagos y actualizar saldo (Priority: P2)

Como usuario de Finanzas, quiero registrar pagos totales o parciales sobre una Factura,
para llevar control de cuánto se cobró y cuánto queda pendiente.

**Why this priority**: Es el segundo pilar del módulo: convierte una Factura emitida
(US1) en una herramienta de control de cobranza real.

**Independent Test**: Con una Factura `Pendiente de Pago`, puede probarse registrando un
pago parcial y verificando que el saldo pendiente se actualiza y el estado pasa a
`Pagada Parcialmente`; luego registrando el pago restante y verificando que pasa a
`Pagada`.

**Acceptance Scenarios**:

1. **Given** una Factura `Pendiente de Pago`, **When** se registra un pago con fecha,
   importe, método y referencia, **Then** el saldo pendiente se recalcula
   automáticamente (RN-008).
2. **Given** una Factura con un pago parcial registrado, **When** el saldo pendiente es
   mayor a cero, **Then** el estado de la Factura es `Pagada Parcialmente`.
3. **Given** una Factura, **When** la suma de sus pagos iguala su total, **Then** el
   estado cambia automáticamente a `Pagada` (RF-008).
4. **Given** una Factura con fecha de vencimiento superada sin pago completo, **When**
   se consulta su estado, **Then** el sistema la muestra como `Vencida`.
5. **Given** una Organization, **When** un Administrador configura sus métodos de pago
   disponibles, **Then** esos métodos quedan disponibles al registrar un pago.

---

### User Story 3 - Notas de crédito/débito y anulación (Priority: P3)

Como usuario de Finanzas, quiero emitir notas de crédito o débito sobre una Factura, o
anularla completamente, para corregir errores o ajustar montos sin perder la
trazabilidad del comprobante original.

**Why this priority**: Cubre casos de corrección sobre Facturas ya emitidas (US1/US2);
no bloquea el flujo normal de emisión y cobro.

**Independent Test**: Con una Factura emitida, puede probarse emitiendo una nota de
crédito parcial, verificando que el saldo de la Factura se ajusta; por separado,
anulando una Factura y verificando que conserva su historial completo.

**Acceptance Scenarios**:

1. **Given** una Factura emitida, **When** se emite una nota de crédito asociada,
   **Then** el saldo/monto adeudado de la Factura se ajusta en consecuencia.
2. **Given** una Factura emitida, **When** se emite una nota de débito asociada,
   **Then** el monto adeudado aumenta en consecuencia.
3. **Given** una Factura, **When** un usuario autorizado la anula, **Then** pasa a
   estado `Anulada` conservando todo su historial (RN-004), sin eliminarse físicamente.
4. **Given** una Factura con pagos ya registrados, **When** se intenta anularla, **Then**
   el sistema exige resolver primero esos pagos (por ejemplo, mediante nota de crédito)
   antes de completar la anulación.

---

### User Story 4 - Duplicación, exportación y búsqueda (Priority: P4)

Como usuario de Finanzas o Comercial, quiero duplicar una Factura como punto de partida
para otra, exportarla en PDF, y buscarla por distintos atributos, para operar
eficientemente con el volumen de facturación de la organización.

**Why this priority**: Aporta eficiencia operativa sobre Facturas ya existentes
(US1-US3); no bloquea el ciclo de vida esencial de una Factura individual.

**Independent Test**: Con una Factura ya emitida, puede probarse duplicándola,
exportándola en PDF, y buscando facturas por distintos atributos.

**Acceptance Scenarios**:

1. **Given** una Factura, **When** un usuario la duplica, **Then** se crea una nueva
   Factura en `Borrador` con los mismos datos y un nuevo número.
2. **Given** una Factura, **When** un usuario la exporta, **Then** obtiene un documento
   PDF con todos sus datos.
3. **Given** varias Facturas cargadas, **When** se busca por número, Customer, estado,
   fecha, responsable, total, moneda o método de pago, **Then** el sistema devuelve las
   que coinciden.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente una Factura emitida? El sistema MUST
  impedirlo (RN-003); solo existe `Anulada` como baja lógica.
- ¿Qué ocurre si se registra un pago mayor al saldo pendiente de una Factura? El
  sistema MUST rechazarlo o exigir registrar el excedente como un concepto separado
  (por ejemplo, a favor del Customer), sin permitir que el saldo quede negativo de forma
  silenciosa.
- ¿Qué pasa si se intenta generar una Factura desde una Quote que no está `Aceptada`? El
  sistema MUST impedirlo (consistente con FR-014 de spec 015).
- ¿Qué sucede si se intenta anular una Factura que ya tiene notas de crédito/débito
  emitidas? El sistema MUST permitirlo, conservando el historial completo de la Factura
  y de sus notas asociadas.
- ¿Qué pasa si dos usuarios registran pagos sobre la misma Factura al mismo tiempo? El
  sistema MUST aplicar ambos pagos de forma consistente sobre el saldo, sin perder
  ninguno de los dos registros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear Facturas manualmente asociadas a un
  Customer.
- **FR-002**: El sistema MUST permitir generar una Factura a partir de una Quote
  `Aceptada` (spec 015), conservando sus datos económicos.
- **FR-003**: El sistema MUST asignar automáticamente un número correlativo a cada
  Factura.
- **FR-004**: El sistema MUST permitir agregar líneas de producto o servicio a una
  Factura.
- **FR-005**: El sistema MUST calcular automáticamente subtotal, descuentos, impuestos
  y total de la Factura a partir de sus líneas.
- **FR-006**: El sistema MUST permitir registrar uno o varios pagos (parciales o
  totales) sobre una Factura, con fecha, importe, método y referencia.
- **FR-007**: El sistema MUST actualizar automáticamente el saldo pendiente de una
  Factura al registrar un pago.
- **FR-008**: El sistema MUST actualizar automáticamente el estado de la Factura según
  su saldo pendiente y fecha de vencimiento (`Pendiente de Pago`, `Pagada
  Parcialmente`, `Pagada`, `Vencida`).
- **FR-009**: El sistema MUST permitir emitir notas de crédito asociadas a una Factura,
  ajustando su saldo/monto adeudado.
- **FR-010**: El sistema MUST permitir emitir notas de débito asociadas a una Factura,
  ajustando su saldo/monto adeudado.
- **FR-011**: El sistema MUST permitir anular una Factura, conservando su historial
  completo sin eliminarla físicamente.
- **FR-012**: El sistema MUST impedir modificar una Factura en estado `Pagada`.
- **FR-013**: El sistema MUST permitir duplicar una Factura existente.
- **FR-014**: El sistema MUST permitir exportar una Factura en formato PDF.
- **FR-015**: El sistema MUST soportar métodos de pago configurables por Organization,
  con un catálogo por defecto (Efectivo, Transferencia Bancaria, Tarjeta de Crédito,
  Tarjeta de Débito, Cheque, Mercado Pago, PayPal, Otro).
- **FR-016**: El sistema MUST permitir buscar Facturas por número, Customer, estado,
  fecha, responsable, total, moneda o método de pago.
- **FR-017**: El sistema MUST registrar en el Audit Log la creación, modificación,
  emisión, pago, pago parcial, anulación, notas de crédito/débito y exportación de
  Facturas.
- **FR-018**: El sistema MUST garantizar que las Facturas de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Invoice**: Comprobante comercial emitido por la Organization hacia un Customer (ver
  [Domain Model](../../docs/domain-model.md)); puede originarse de una Quote (spec 015)
  o crearse manualmente. Atributos: información general (número, tipo de comprobante,
  Customer, responsable, estado), fechas (emisión, vencimiento, pago), comercial
  (moneda, lista de precios, condición de pago, descuento, impuestos, subtotal, total) y
  adicional (observaciones, referencia, orden de compra, Quote asociada).
- **InvoiceLine**: Línea de una Invoice (producto o servicio, cantidad, precio unitario,
  descuento, impuesto, subtotal); referencia un `Product` del catálogo (bounded context
  Inventory, spec futura), igual que `QuoteLine` en spec 015.
- **InvoiceStatus**: Estado de la Invoice: `Borrador`, `Emitida`, `Pendiente de Pago`,
  `Pagada`, `Pagada Parcialmente`, `Vencida`, `Anulada`.
- **Payment**: Pago registrado sobre una Invoice, con fecha, importe, método,
  referencia y observaciones.
- **PaymentMethod**: Método de pago, configurable por Organization.
- **CreditNote / DebitNote**: Notas de ajuste asociadas a una Invoice que incrementan o
  reducen su saldo/monto adeudado, conservando el historial de la Invoice original.
- **Audit Log**: Registro inmutable de creación/modificación/emisión/pago/pago parcial/
  anulación/notas de crédito-débito/exportación de Facturas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario autorizado puede generar una Factura desde una Quote aceptada
  en menos de 1 minuto, conservando el 100% de sus datos económicos.
- **SC-002**: El 100% de los cálculos de subtotal/descuentos/impuestos/total son
  consistentes con las líneas cargadas, verificable por recomputación independiente.
- **SC-003**: El saldo pendiente de una Factura se actualiza correctamente en el 100%
  de los registros de pago, parciales o totales.
- **SC-004**: El 100% de las Facturas `Pagada` rechazan cualquier intento de
  modificación directa.
- **SC-005**: El 100% de las acciones de creación, emisión, pago, anulación y notas de
  crédito/débito quedan registradas en el Audit Log.
- **SC-006**: El 0% de las Facturas emitidas puede eliminarse físicamente.
- **SC-007**: Las búsquedas de Facturas devuelven resultados en menos de 300 ms en el
  95% de los casos.

## Assumptions

- El catálogo de `Product`/servicios (líneas de Factura) pertenece al bounded context
  Inventory (Fase 4 del roadmap), igual que en spec 015; esta spec asume la misma
  dependencia futura documentada ahí.
- Un pago que excede el saldo pendiente de una Factura (edge case) se resuelve
  rechazando el registro o derivándolo a un concepto a favor del Customer; el mecanismo
  exacto se define en la fase de planificación técnica.
- Las notas de crédito y débito se modelan como ajustes asociados a una Invoice
  existente en esta fase, no como comprobantes fiscales independientes con su propia
  numeración oficial (eso pertenece a la fase de Facturación electrónica, fuera de
  alcance).
- La exportación en PDF (FR-014) genera un documento de representación de la Factura
  para uso comercial; no constituye un comprobante fiscalmente válido mientras no exista
  la integración de Facturación electrónica (explícitamente fuera de alcance).
- Facturación electrónica, integración con organismos fiscales (por ejemplo, AFIP),
  contabilidad general y conciliación bancaria automática quedan explícitamente fuera de
  alcance de esta fase, según el input.
