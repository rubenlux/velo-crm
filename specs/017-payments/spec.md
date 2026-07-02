# Feature Specification: Gestión de Pagos

**Feature Branch**: `017-payments`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-017 — Gestión de Pagos. Registrar, administrar y controlar pagos recibidos de Customers, conciliándolos con las Facturas emitidas: un Payment puede aplicarse a una o varias Invoices, pagos parciales con actualización automática de saldo/estado de Invoice, métodos de pago configurables, comprobantes adjuntos, reembolsos, anulación, conciliación (importe facturado/pagado/pendiente), indicadores de cobranza (total cobrado/pendiente/reembolsado, pagos por método, tiempo promedio de cobro, índice de cobranza), con auditoría completa y aislamiento entre organizaciones. No incluye integraciones bancarias, conciliación automática, contabilidad general ni tesorería."

**Nota de terminología**: Esta especificación posee la entidad `Payment` del bounded
context **Sales**, **extrayéndola** de
[specs/016-invoicing/spec.md](../016-invoicing/spec.md) (ver nota de deprecación
parcial en esa spec). La razón del cambio: un Payment real puede aplicarse a **varias**
Invoices a la vez, y una Invoice puede recibir **varios** Payments — es una relación
muchos-a-muchos que amerita que Payment sea una entidad de primer nivel con su propio
ciclo de vida (Pendiente → Confirmado → Aplicado, con Reembolso/Anulación posibles),
igual que ya se decidió separar Customer/Contact (008/009) o Lead/Opportunity
(010/011). Depende de `Customer` (spec 008) e `Invoice` (spec 016, cuyo `InvoiceStatus`
sigue siendo propiedad de esa spec: 017 solo dispara el recálculo de saldo/estado de la
Invoice, no redefine sus estados).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar un pago y aplicarlo a una o varias Facturas (Priority: P1) 🎯

Como usuario de Finanzas, quiero registrar un pago recibido de un Customer y aplicarlo a
una o varias Facturas pendientes, para reflejar con precisión qué se cobró y sobre qué
comprobantes.

**Why this priority**: Es el valor central del módulo: sin poder registrar y aplicar un
pago no hay nada que confirmar, reembolsar ni conciliar en las historias siguientes.

**Independent Test**: Puede probarse registrando un Payment para un Customer con una
Invoice pendiente (spec 016), aplicándolo, y verificando que el saldo de esa Invoice se
actualiza; por separado, aplicando un único Payment a dos Invoices distintas del mismo
Customer.

**Acceptance Scenarios**:

1. **Given** un Customer con una o más Invoices pendientes (spec 016), **When** un
   usuario de Finanzas registra un Payment con importe, moneda, método y fecha,
   **Then** el Payment queda creado en estado `Pendiente`.
2. **Given** un Payment registrado, **When** se aplica a una Invoice pendiente,
   **Then** el saldo pendiente de esa Invoice se recalcula y el Payment pasa a
   `Aplicado` (si cubre el importe pendiente) o `Parcial` (si no lo cubre).
3. **Given** un Payment con importe suficiente, **When** se aplica a varias Invoices del
   mismo Customer, **Then** el sistema distribuye el importe entre ellas y cada Invoice
   actualiza su saldo de forma independiente.
4. **Given** una Invoice, **When** recibe varios Payments a lo largo del tiempo,
   **Then** cada uno queda registrado y el saldo pendiente refleja la suma acumulada
   aplicada.

---

### User Story 2 - Pagos parciales y actualización automática de Invoice (Priority: P2)

Como usuario de Finanzas, quiero que un pago parcial actualice automáticamente el saldo
y el estado de la Factura afectada, para no tener que recalcular manualmente cuánto
queda pendiente.

**Why this priority**: Es la continuación directa de US1: sin este comportamiento
automático, el módulo requeriría reconciliación manual constante.

**Independent Test**: Con una Invoice pendiente, puede probarse aplicando un Payment
parcial y verificando que el estado de la Invoice pasa a `Pagada Parcialmente` (spec
016), y luego aplicando el resto para verificar que pasa a `Pagada`.

**Acceptance Scenarios**:

1. **Given** una Invoice con saldo pendiente, **When** se aplica un Payment que cubre
   parte del saldo, **Then** el saldo pendiente de la Invoice se reduce en esa
   proporción y su estado pasa a `Pagada Parcialmente` (RN-005, RN-006 — estado
   propiedad de spec 016).
2. **Given** una Invoice con saldo pendiente reducido a cero por la suma de sus
   Payments aplicados, **When** se consulta su estado, **Then** es `Pagada`.

---

### User Story 3 - Confirmación y comprobantes de pago (Priority: P3)

Como usuario de Finanzas, quiero confirmar un pago y adjuntar su comprobante, para
dejar evidencia formal de que el dinero efectivamente ingresó.

**Why this priority**: Refuerza la confiabilidad de los pagos ya registrados (US1/US2);
un pago sin confirmar ya puede aplicarse a una Invoice, pero la confirmación agrega una
capa de control.

**Independent Test**: Con un Payment `Pendiente`, puede probarse confirmándolo y
adjuntando un comprobante (imagen, PDF o recibo), verificando que ambos quedan
asociados.

**Acceptance Scenarios**:

1. **Given** un Payment `Pendiente`, **When** un usuario de Finanzas lo confirma,
   **Then** pasa a estado `Confirmado`.
2. **Given** un Payment, **When** se adjunta un comprobante (imagen, PDF, comprobante
   bancario o recibo), **Then** queda disponible mientras exista el Payment.
3. **Given** una Organization, **When** un Administrador configura sus métodos de pago
   disponibles, **Then** esos métodos quedan disponibles al registrar un Payment.

---

### User Story 4 - Reembolsos y anulación de pagos (Priority: P4)

Como usuario de Finanzas, quiero reembolsar o anular un pago ya registrado, para
corregir errores o devoluciones sin perder la trazabilidad del pago original.

**Why this priority**: Cubre casos de corrección sobre Payments ya aplicados
(US1-US3); no bloquea el flujo normal de cobro.

**Independent Test**: Con un Payment `Aplicado`, puede probarse reembolsándolo y
verificando que el saldo de la Invoice afectada vuelve a aumentar en consecuencia,
conservando el historial completo.

**Acceptance Scenarios**:

1. **Given** un Payment `Aplicado`, **When** un usuario de Finanzas lo reembolsa,
   **Then** pasa a estado `Reembolsado`, y el saldo pendiente de la(s) Invoice(s)
   afectada(s) se ajusta de vuelta en consecuencia (RN-009).
2. **Given** un Payment, **When** se anula antes de aplicarse a ninguna Invoice,
   **Then** pasa a estado `Anulado` sin afectar ninguna Invoice.
3. **Given** un Payment, **When** se intenta eliminarlo físicamente, **Then** el
   sistema lo rechaza (RN-007): solo existen `Reembolsado`/`Anulado` como bajas
   lógicas.

---

### User Story 5 - Conciliación, indicadores y búsqueda (Priority: P5)

Como usuario de Finanzas o Administrador, quiero ver la conciliación de pagos por
Customer y los indicadores globales de cobranza, para entender la salud financiera de
la Organization de un vistazo.

**Why this priority**: Aporta valor analítico sobre Payments ya existentes (US1-US4); no
bloquea el registro y aplicación básica de pagos.

**Independent Test**: Con varios Payments e Invoices cargados, puede probarse
consultando la conciliación de un Customer (importe facturado/pagado/pendiente) y los
indicadores globales (total cobrado, pendiente, reembolsado, pagos por método, tiempo
promedio de cobro, índice de cobranza).

**Acceptance Scenarios**:

1. **Given** un Customer con Invoices y Payments cargados, **When** se consulta su
   conciliación, **Then** el sistema muestra correctamente el importe facturado, pagado,
   saldo pendiente y fecha del último Payment.
2. **Given** el conjunto de Payments de una Organization, **When** se consultan los
   indicadores de cobranza, **Then** el sistema calcula correctamente el total cobrado,
   pendiente, reembolsado, pagos del día/mes, pagos por método, tiempo promedio de
   cobro y el índice de cobranza.
3. **Given** varios Payments cargados, **When** se busca por número, Customer, Invoice,
   estado, método de pago, fecha, responsable, importe o referencia, **Then** el
   sistema devuelve los que coinciden.

---

### Edge Cases

- ¿Qué pasa si un Payment se aplica por un importe mayor a la suma de saldos pendientes
  de las Invoices seleccionadas? El sistema MUST rechazar la aplicación del excedente o
  registrarlo explícitamente como saldo a favor del Customer, sin dejarlo aplicado de
  forma ambigua.
- ¿Qué ocurre si se intenta reembolsar un Payment ya reembolsado? El sistema MUST
  impedirlo.
- ¿Qué pasa si se anula un Payment que ya está `Aplicado` a una o más Invoices? El
  sistema MUST exigir primero reembolsarlo (revirtiendo el saldo de esas Invoices) antes
  de permitir la anulación, o tratar la anulación de un Payment aplicado como un
  reembolso implícito — cualquiera de las dos opciones MUST mantener el saldo de las
  Invoices consistente.
- ¿Qué sucede si dos usuarios aplican el mismo Payment a Invoices distintas al mismo
  tiempo? El sistema MUST garantizar que el importe total aplicado nunca exceda el
  importe del Payment, rechazando la segunda aplicación si ya no queda saldo disponible
  en el Payment.
- ¿Qué pasa si se elimina o archiva el Customer de un Payment ya aplicado? El sistema
  MUST conservar el Payment y su historial de aplicación, igual que el resto de los
  datos del Customer archivado (spec 008).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir registrar Payments manualmente asociados a un
  Customer, con importe, moneda, método, fecha, referencia y número de operación.
- **FR-002**: El sistema MUST permitir aplicar un Payment a una o varias Invoices del
  mismo Customer.
- **FR-003**: El sistema MUST permitir que una Invoice reciba múltiples Payments a lo
  largo del tiempo (RN-004).
- **FR-004**: El sistema MUST recalcular automáticamente el saldo pendiente de cada
  Invoice afectada al aplicar, reembolsar o anular un Payment.
- **FR-005**: El sistema MUST disparar la actualización de estado de la Invoice
  correspondiente (spec 016: `InvoiceStatus`) cuando su saldo pendiente cambie a cero o
  se reduzca parcialmente.
- **FR-006**: El sistema MUST permitir confirmar un Payment (`Pendiente` →
  `Confirmado`).
- **FR-007**: El sistema MUST permitir adjuntar comprobantes (imagen, PDF, comprobante
  bancario, recibo u otro documento) a un Payment.
- **FR-008**: El sistema MUST soportar métodos de pago configurables por Organization,
  con un catálogo por defecto (Efectivo, Transferencia bancaria, Tarjeta de crédito,
  Tarjeta de débito, Cheque, Mercado Pago, PayPal, Criptomonedas, Otro).
- **FR-009**: El sistema MUST permitir reembolsar un Payment `Aplicado`, revirtiendo el
  saldo de las Invoices afectadas y conservando su historial (RN-009).
- **FR-010**: El sistema MUST permitir anular un Payment sin eliminarlo físicamente
  (RN-007).
- **FR-011**: El sistema MUST proveer una vista de conciliación por Customer con
  importe facturado, pagado, saldo pendiente y fecha del último Payment.
- **FR-012**: El sistema MUST calcular indicadores de cobranza: total cobrado,
  pendiente, reembolsado, pagos del día/mes, pagos por método, tiempo promedio de cobro
  e índice de cobranza.
- **FR-013**: El sistema MUST permitir exportar Payments.
- **FR-014**: El sistema MUST permitir buscar Payments por número, Customer, Invoice,
  estado, método de pago, fecha, responsable, importe o referencia.
- **FR-015**: El sistema MUST registrar en el Audit Log la creación, modificación,
  confirmación, aplicación, reembolso, anulación y exportación de Payments.
- **FR-016**: El sistema MUST garantizar que los Payments de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Payment**: Transacción mediante la cual un Customer cancela total o parcialmente
  una o varias Invoices (ver [Domain Model](../../docs/domain-model.md)); entidad de
  primer nivel, no un sub-objeto de Invoice. Atributos: información general (número,
  Customer, responsable, estado), financiera (importe, moneda, método, fecha,
  referencia, número de operación) y adicional (observaciones, comprobante, adjuntos).
- **PaymentApplication**: Relación muchos-a-muchos entre un Payment y una o varias
  Invoices, con el importe aplicado a cada una.
- **PaymentStatus**: Estado del Payment: `Pendiente`, `Confirmado`, `Aplicado`,
  `Parcial`, `Reembolsado`, `Anulado`.
- **PaymentMethod**: Método de pago, configurable por Organization (movido acá desde
  spec 016, que ya no lo posee).
- **Receipt/Attachment**: Comprobante o documento adjunto a un Payment.
- **Audit Log**: Registro inmutable de creación/modificación/confirmación/aplicación/
  reembolso/anulación/exportación de Payments.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario de Finanzas puede registrar y aplicar un Payment a una Invoice
  en menos de 1 minuto.
- **SC-002**: El 100% de las aplicaciones de Payment a Invoice actualizan correctamente
  el saldo pendiente, verificable por recomputación independiente.
- **SC-003**: El 100% de las Invoices cuyo saldo pendiente llega a cero cambian
  automáticamente a estado `Pagada` (spec 016) en menos de 5 segundos.
- **SC-004**: El 100% de los Payments reembolsados o anulados conservan su historial
  completo, verificable por consulta directa.
- **SC-005**: El 100% de las acciones de creación, confirmación, aplicación, reembolso
  y anulación quedan registradas en el Audit Log.
- **SC-006**: La conciliación de un Customer refleja sus Payments e Invoices reales con
  100% de exactitud, verificable por comparación directa.
- **SC-007**: Las búsquedas de Payments devuelven resultados en menos de 300 ms en el
  95% de los casos.

## Assumptions

- El excedente de un Payment aplicado por un importe mayor al saldo pendiente de las
  Invoices seleccionadas se resuelve rechazando el excedente o registrándolo como saldo
  a favor del Customer; el mecanismo exacto se define en la fase de planificación
  técnica (mismo criterio ya asumido en spec 016 para el caso simétrico).
- `InvoiceStatus` sigue siendo propiedad exclusiva de
  [specs/016-invoicing/spec.md](../016-invoicing/spec.md); esta spec solo dispara su
  recálculo cuando cambia el saldo aplicado, sin redefinir los estados posibles de una
  Invoice.
- Los indicadores de cobranza (FR-012) son cálculos aritméticos sobre datos existentes
  en esta fase; no incluyen predicciones ni modelos de riesgo crediticio.
- Integraciones bancarias, conciliación automática, contabilidad general, caja diaria y
  gestión de tesorería quedan explícitamente fuera de alcance de esta fase, según el
  input.
