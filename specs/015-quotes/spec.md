# Feature Specification: Gestión de Cotizaciones (Presupuestos)

**Feature Branch**: `015-quotes`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-015 — Gestión de Cotizaciones (Presupuestos). Crear, administrar, enviar y hacer seguimiento de propuestas comerciales para Customers: numeración automática, líneas de producto/servicio con cantidades/descuentos/impuestos, cálculo automático de subtotal/total, versionado con historial completo, envío, registro de aceptación/rechazo, duplicación, conversión de una Cotización aceptada en Factura conservando todos sus datos, con auditoría completa y aislamiento entre organizaciones. No incluye facturación electrónica, firma digital, integraciones fiscales/contables ni automatizaciones con IA."

**Nota de terminología**: Esta especificación posee la entidad `Quote` del bounded
context **Sales** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)).
Depende de `Customer` (spec 008), `Contact` (spec 009, opcional) y `Opportunity` (spec
011, opcional); referencia `Product`/servicios del catálogo (bounded context Inventory,
ver [docs/implementation-plan.md](../../docs/implementation-plan.md) § Phase 4 —
Inventory/Catalog), cuya spec dedicada todavía no existe: esta feature consume esa
entidad como dependencia futura y no la redefine (ver Assumptions). Genera `Invoice`
(bounded context Sales) al convertirse; el ciclo de vida completo de Invoice (estados,
pagos, notas de crédito/débito, anulación) se define en
[specs/016-invoicing/spec.md](../016-invoicing/spec.md) — esta feature solo especifica
qué datos conserva la conversión (FR-013).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y editar Cotizaciones con cálculo automático (Priority: P1) 🎯

Como Vendedor, quiero crear una Cotización para un Customer con líneas de producto o
servicio, aplicar descuentos e impuestos, y ver el subtotal y total calculados
automáticamente, para generar propuestas comerciales precisas sin cálculos manuales.

**Why this priority**: Es el valor central del módulo: sin poder crear una Cotización
con cálculo correcto no hay nada que enviar, versionar ni convertir en las historias
siguientes.

**Independent Test**: Puede probarse creando una Cotización para un Customer existente
(spec 008), agregando líneas con cantidad y precio, aplicando un descuento y un
impuesto, y verificando que el subtotal y total se calculan correctamente sin
intervención manual.

**Acceptance Scenarios**:

1. **Given** un Customer existente, **When** un Vendedor crea una Cotización, **Then**
   el sistema le asigna un número correlativo automático y la deja en estado
   `Borrador`.
2. **Given** una Cotización en `Borrador`, **When** el Vendedor agrega líneas de
   producto o servicio con cantidad y precio unitario, **Then** el subtotal de cada
   línea se calcula automáticamente.
3. **Given** una Cotización con líneas cargadas, **When** se aplica un descuento por
   línea o global, y un impuesto, **Then** el sistema recalcula subtotal, descuentos,
   impuestos y total de forma automática y consistente.
4. **Given** una Cotización, **When** se edita mientras está en `Borrador` o
   `Pendiente`, **Then** los cambios se guardan y los totales se recalculan.
5. **Given** una Cotización `Aceptada`, **When** se intenta editarla, **Then** el
   sistema lo impide (RN-003).

---

### User Story 2 - Envío y seguimiento de estado (Priority: P2)

Como Vendedor, quiero enviar una Cotización a mi Customer y registrar si fue vista,
aceptada o rechazada, para saber en qué punto está cada propuesta comercial.

**Why this priority**: Convierte una Cotización ya armada (US1) en una herramienta de
seguimiento comercial activo; sin esta historia, una Cotización sería solo un documento
estático.

**Independent Test**: Con una Cotización ya creada, puede probarse enviándola,
marcándola como vista, y luego registrando su aceptación o rechazo, verificando la
transición de estados en cada paso.

**Acceptance Scenarios**:

1. **Given** una Cotización en `Borrador` o `Pendiente`, **When** el Vendedor la envía,
   **Then** pasa a estado `Enviada`.
2. **Given** una Cotización `Enviada`, **When** el Customer la visualiza (o el sistema
   lo detecta), **Then** pasa a estado `Vista`.
3. **Given** una Cotización `Enviada` o `Vista`, **When** se registra su aceptación,
   **Then** pasa a estado `Aceptada` y queda protegida contra edición (RN-003).
4. **Given** una Cotización `Enviada` o `Vista`, **When** se registra su rechazo,
   **Then** pasa a estado `Rechazada` conservando su historial completo.
5. **Given** una Cotización con fecha de vencimiento superada sin respuesta, **When** se
   consulta su estado, **Then** el sistema la muestra como `Vencida`.

---

### User Story 3 - Versionado y duplicación (Priority: P3)

Como Vendedor, quiero crear una nueva versión de una Cotización existente, o duplicarla
para un nuevo Customer, para iterar sobre una propuesta sin perder el historial de las
versiones anteriores.

**Why this priority**: Facilita la negociación iterativa sobre Cotizaciones ya creadas
(US1/US2); una Cotización única ya es útil sin necesidad de versionarse.

**Independent Test**: Con una Cotización ya enviada, puede probarse creando una nueva
versión con cambios, verificando que la versión anterior sigue disponible íntegra; por
separado, duplicando una Cotización para verificar que se crea una nueva en `Borrador`
con los mismos datos.

**Acceptance Scenarios**:

1. **Given** una Cotización existente, **When** el Vendedor crea una nueva versión
   (con motivo del cambio), **Then** se genera una nueva versión numerada y la anterior
   permanece disponible sin modificarse (RN-005).
2. **Given** una Cotización, **When** el Vendedor la duplica, **Then** se crea una nueva
   Cotización en `Borrador` con los mismos productos, cantidades, precios, descuentos e
   impuestos, con un nuevo número.
3. **Given** una serie de versiones de una Cotización, **When** se consulta su
   historial, **Then** cada versión muestra su número, fecha, usuario y motivo del
   cambio.

---

### User Story 4 - Conversión de Cotización aceptada en Factura (Priority: P4)

Como Vendedor, quiero convertir una Cotización aceptada directamente en una Factura, para
no tener que recargar manualmente los mismos productos, cantidades y precios.

**Why this priority**: Es el punto de mayor valor de negocio del módulo (conecta Ventas
con Facturación), pero depende de que ya exista una Cotización aceptada (US1/US2).

**Independent Test**: Con una Cotización `Aceptada`, puede probarse ejecutando la
conversión y verificando que se genera una Factura con el mismo Customer, productos,
cantidades, precios, descuentos, impuestos y observaciones, y que la Cotización pasa a
estado `Convertida` conservando su historial.

**Acceptance Scenarios**:

1. **Given** una Cotización `Aceptada`, **When** el Vendedor la convierte, **Then** el
   sistema genera una Factura (entidad definida en su propia spec futura de
   Facturación) con el mismo Customer, productos, cantidades, precios, descuentos,
   impuestos y observaciones.
2. **Given** una conversión ya realizada, **When** se consulta la Cotización original,
   **Then** su estado es `Convertida` y conserva su historial completo con un enlace a
   la Factura generada.
3. **Given** una Cotización que no está `Aceptada`, **When** se intenta convertirla en
   Factura, **Then** el sistema lo impide.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente una Cotización? El sistema MUST
  impedirlo (RN-008); solo existen los estados de baja lógica (`Cancelada`,
  `Archivada`).
- ¿Qué ocurre si se intenta convertir en Factura una Cotización ya convertida
  previamente? El sistema MUST impedirlo, evitando generar Facturas duplicadas.
- ¿Qué pasa si cambian los precios del catálogo de Products después de crear una
  Cotización? El sistema MUST conservar los precios registrados en la Cotización en el
  momento de su creación, sin recalcularlos retroactivamente ante cambios del catálogo.
- ¿Qué sucede si dos usuarios editan la misma Cotización al mismo tiempo mientras está
  en `Borrador`? El sistema MUST conservar el último cambio guardado sin corromper el
  registro, informando al segundo usuario que los datos se actualizaron.
- ¿Qué pasa si se cancela una Cotización que ya fue enviada y vista por el Customer? El
  sistema MUST permitirlo, pasando a estado `Cancelada` y conservando su historial
  completo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear Cotizaciones manualmente asociadas a un
  Customer, opcionalmente a un Contact y/o una Opportunity.
- **FR-002**: El sistema MUST asignar automáticamente un número correlativo a cada
  Cotización.
- **FR-003**: El sistema MUST permitir agregar líneas de producto o servicio con
  cantidad, precio unitario, descuento e impuesto por línea.
- **FR-004**: El sistema MUST permitir aplicar descuentos e impuestos globales sobre el
  total de la Cotización, además de los aplicados por línea.
- **FR-005**: El sistema MUST calcular automáticamente subtotal, descuentos, impuestos
  y total de la Cotización a partir de sus líneas.
- **FR-006**: El sistema MUST impedir modificar una Cotización en estado `Aceptada` o
  `Convertida`.
- **FR-007**: El sistema MUST permitir enviar una Cotización, registrando el cambio a
  estado `Enviada`.
- **FR-008**: El sistema MUST permitir registrar cuándo una Cotización fue vista por el
  Customer.
- **FR-009**: El sistema MUST permitir registrar la aceptación o el rechazo de una
  Cotización enviada.
- **FR-010**: El sistema MUST marcar automáticamente como `Vencida` una Cotización cuya
  fecha de vencimiento pasó sin respuesta.
- **FR-011**: El sistema MUST permitir crear una nueva versión de una Cotización,
  conservando todas las versiones anteriores íntegras con número, fecha, usuario y
  motivo del cambio.
- **FR-012**: El sistema MUST permitir duplicar una Cotización existente como punto de
  partida para una nueva.
- **FR-013**: El sistema MUST permitir convertir una Cotización `Aceptada` en una
  Factura, conservando Customer, productos, cantidades, precios, descuentos, impuestos
  y observaciones.
- **FR-014**: El sistema MUST impedir convertir en Factura una Cotización que no esté
  `Aceptada`, o que ya haya sido convertida previamente.
- **FR-015**: El sistema MUST permitir buscar Cotizaciones por número, Customer,
  responsable, estado, fecha, total, moneda u Opportunity asociada.
- **FR-016**: El sistema MUST registrar en el Audit Log la creación, modificación,
  cambio de estado, envío, aceptación, rechazo, duplicación, nueva versión, conversión y
  archivado de Cotizaciones.
- **FR-017**: El sistema MUST garantizar que las Cotizaciones de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Quote**: Propuesta comercial emitida por la Organization para un Customer (ver
  [Domain Model](../../docs/domain-model.md)); paso previo a la Factura. Atributos:
  información general (número, Customer, Contact, Opportunity, responsable, estado),
  comercial (moneda, lista de precios, descuento, impuestos, subtotal, total), vigencia
  (fecha de emisión, fecha de vencimiento) y adicional (observaciones, condiciones
  comerciales, tiempo de entrega, forma de pago, garantías).
- **QuoteLine**: Línea de una Quote (producto o servicio, descripción, cantidad,
  unidad, precio unitario, descuento, impuesto, subtotal); referencia un `Product` del
  catálogo (bounded context Inventory, spec futura).
- **QuoteStatus**: Estado de la Quote: `Borrador`, `Pendiente`, `Enviada`, `Vista`,
  `Aceptada`, `Rechazada`, `Vencida`, `Cancelada`, `Convertida`.
- **QuoteVersion**: Versión histórica e inmutable de una Quote, con número, fecha,
  usuario y motivo del cambio.
- **Invoice**: Entidad generada al convertir una Quote `Aceptada`; su modelo completo
  se define en [specs/016-invoicing/spec.md](../016-invoicing/spec.md) — acá solo se
  especifica qué datos hereda de la Quote (FR-013).
- **Audit Log**: Registro inmutable de creación/modificación/cambio de estado/envío/
  aceptación/rechazo/duplicación/nueva versión/conversión/archivado de Cotizaciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Vendedor puede crear una Cotización con al menos 3 líneas y ver su
  total calculado correctamente en menos de 3 minutos.
- **SC-002**: El 100% de los cálculos de subtotal/descuentos/impuestos/total son
  consistentes con las líneas cargadas, verificable por recomputación independiente.
- **SC-003**: El 100% de las Cotizaciones `Aceptada` rechazan cualquier intento de
  edición directa.
- **SC-004**: El 100% de las conversiones a Factura generan una Factura con los mismos
  datos económicos que la Cotización aceptada, verificable por comparación directa.
- **SC-005**: El 100% de las acciones de creación, envío, aceptación, rechazo,
  duplicación, nueva versión y conversión quedan registradas en el Audit Log.
- **SC-006**: El 0% de las versiones anteriores de una Cotización se pierde o se
  sobrescribe al crear una nueva versión.
- **SC-007**: Las búsquedas de Cotizaciones devuelven resultados en menos de 300 ms en
  el 95% de los casos.

## Assumptions

- El catálogo de `Product`/servicios (líneas de Cotización) pertenece al bounded
  context Inventory (Fase 4 del roadmap); esta spec lo referencia como dependencia
  futura y asume que cada línea puede vincularse a un Product existente o describirse
  libremente mientras esa spec no exista.
- `Invoice` (Facturación) se define en detalle en
  [specs/016-invoicing/spec.md](../016-invoicing/spec.md); esta spec solo especifica
  qué datos de la Quote se copian al convertir (FR-013), sin definir el ciclo de vida
  completo de una Invoice.
- "Vista" (QuoteStatus) se registra cuando el Customer abre la Cotización mediante el
  canal de envío que se defina en la fase de planificación técnica (por ejemplo, un
  enlace único); esta spec no prescribe el mecanismo concreto.
- El vencimiento automático a `Vencida` (FR-010) es un cambio de estado observable, sin
  prescribir si se calcula al consultar o mediante un proceso periódico — eso se decide
  en la fase de planificación técnica.
- Facturación electrónica, firma digital, integraciones fiscales/contables (por
  ejemplo, con AFIP) y automatizaciones con IA quedan explícitamente fuera de alcance de
  esta fase, según el input.
