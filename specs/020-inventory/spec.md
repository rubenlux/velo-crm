# Feature Specification: Gestión de Inventario

**Feature Branch**: `020-inventory`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-020 — Gestión de Inventario. Controlar en tiempo real las existencias de Products físicos, movimientos de stock, múltiples Depósitos y valorización: entradas, salidas, ajustes manuales, transferencias entre depósitos (generan movimiento de salida + entrada), stock reservado/disponible/mínimo/máximo, Kardex (historial cronológico por producto), alertas (stock bajo, agotado, negativo, sin movimiento), búsqueda, indicadores (valor total, sin stock, bajo mínimo, rotación), con auditoría completa y aislamiento entre organizaciones. No incluye producción, manufactura, picking, logística ni gestión de envíos."

**Nota de terminología**: Esta especificación posee la entidad `Inventory`/`StockMovement`
del bounded context **Inventory** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)
y [docs/domain-model.md](../../docs/domain-model.md), que ya anticipaban `Inventory`
bajo ese contexto, relacionada como `Product └── Inventory`). Resuelve la dependencia
hacia adelante que había dejado abierta [specs/018-products/spec.md](../018-products/spec.md)
("el control de existencias físicas... pertenece a una spec futura de Inventario").
Depende de `Product` (spec 018, que define si un producto controla stock y sus
umbrales) y `Category` (spec 019, opcional para indicadores por categoría). Solo
controla stock de Products físicos con control de stock habilitado (spec 018, FR-006/
FR-007): servicios y productos sin control de stock habilitado quedan fuera del alcance
de esta spec.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar entradas y salidas de stock (Priority: P1) 🎯

Como Responsable de Inventario, quiero registrar entradas y salidas de stock de un
Product en un Depósito, para que el stock disponible refleje la realidad física en
todo momento.

**Why this priority**: Es el valor central del módulo: sin poder registrar entradas y
salidas no hay stock confiable que consultar, transferir ni auditar en las historias
siguientes.

**Independent Test**: Puede probarse registrando una entrada de stock para un Product
con control de stock habilitado (spec 018) en un Depósito, verificando que el stock
actual aumenta; luego registrando una salida y verificando que disminuye.

**Acceptance Scenarios**:

1. **Given** un Product con control de stock habilitado (spec 018), **When** se
   registra una entrada en un Depósito con cantidad y motivo, **Then** el stock actual
   de ese Product en ese Depósito aumenta en esa cantidad (RN-001).
2. **Given** un Product con stock disponible, **When** se registra una salida,
   **Then** el stock actual disminuye, y el sistema deniega la operación si el stock
   resultante fuera negativo, salvo autorización especial (RN-002).
3. **Given** un movimiento de entrada o salida, **When** se registra, **Then** debe
   incluir un motivo y el usuario responsable (RN-004, RN-005).
4. **Given** un Product o servicio sin control de stock habilitado (spec 018), **When**
   se intenta registrar un movimiento de inventario para él, **Then** el sistema lo
   impide.

---

### User Story 2 - Transferencias entre Depósitos (Priority: P2)

Como Responsable de Inventario, quiero transferir stock de un Depósito a otro, para
redistribuir mercadería entre sucursales o ubicaciones sin perder trazabilidad.

**Why this priority**: Aporta valor de coordinación multi-depósito sobre el control de
stock ya existente (US1); una Organization con un único Depósito no necesita esta
historia.

**Independent Test**: Con stock disponible en un Depósito de origen, puede probarse
transfiriendo una cantidad a otro Depósito y verificando que se generan ambos
movimientos (salida en origen, entrada en destino) de forma atómica.

**Acceptance Scenarios**:

1. **Given** un Product con stock disponible en un Depósito de origen, **When** se
   transfiere una cantidad a un Depósito de destino, **Then** el sistema genera un
   movimiento de salida en el origen y uno de entrada en el destino (RN-003).
2. **Given** una transferencia, **When** el stock disponible en el origen es
   insuficiente, **Then** el sistema la rechaza sin generar ningún movimiento parcial.
3. **Given** una transferencia completada, **When** se consulta el Kardex de cada
   Depósito involucrado, **Then** ambos movimientos aparecen vinculados entre sí.

---

### User Story 3 - Ajustes manuales, reservas y liberación de stock (Priority: P3)

Como Responsable de Inventario, quiero ajustar manualmente el stock tras un conteo
físico, y reservar/liberar stock para operaciones comerciales en curso, para mantener el
inventario preciso y evitar vender lo que ya está comprometido.

**Why this priority**: Cubre correcciones y compromisos sobre un stock ya controlado
por US1/US2; no bloquea el registro básico de movimientos.

**Independent Test**: Puede probarse registrando un ajuste positivo o negativo tras un
conteo físico; por separado, reservando una cantidad de stock para una operación y
verificando que ese stock reservado deja de estar disponible para nuevas ventas.

**Acceptance Scenarios**:

1. **Given** una diferencia detectada en un conteo físico, **When** se registra un
   ajuste (positivo o negativo) con motivo, **Then** el stock actual se corrige y el
   ajuste queda auditado (RN-007).
2. **Given** un Product con stock disponible, **When** se reserva una cantidad para una
   operación comercial, **Then** ese stock reservado se resta del stock disponible sin
   afectar el stock actual (RN-008).
3. **Given** stock reservado, **When** se libera la reserva (por ejemplo, al cancelarse
   la operación que la originó), **Then** vuelve a estar disponible para nuevas ventas.
4. **Given** stock reservado, **When** se intenta usarlo para una nueva venta sin
   liberarlo primero, **Then** el sistema lo impide (RN-008).

---

### User Story 4 - Kardex y alertas de stock (Priority: P4)

Como Responsable de Inventario, quiero ver el historial cronológico completo (Kardex) de
cada Product y recibir alertas cuando el stock esté bajo, agotado o sin movimiento, para
anticipar quiebres de stock y detectar productos obsoletos.

**Why this priority**: Aporta visibilidad y prevención sobre movimientos ya registrados
(US1-US3); no bloquea el registro básico de stock.

**Independent Test**: Con varios movimientos registrados para un Product, puede
probarse consultando su Kardex y verificando el orden cronológico con stock anterior/
posterior de cada movimiento; por separado, configurando un stock mínimo y verificando
que se genera una alerta al quedar por debajo de ese umbral.

**Acceptance Scenarios**:

1. **Given** varios movimientos registrados para un Product en un Depósito, **When** se
   consulta su Kardex, **Then** se muestran en orden cronológico con fecha, tipo,
   documento origen, cantidad, stock anterior, stock posterior y usuario.
2. **Given** un Product con stock mínimo configurado (spec 018), **When** su stock cae
   por debajo de ese umbral, **Then** el sistema genera una alerta de stock bajo.
3. **Given** un Product, **When** su stock llega a cero o se detecta un valor negativo,
   **Then** el sistema genera la alerta correspondiente (agotado / stock negativo).
4. **Given** un Product sin movimientos durante un período configurable, **When** se
   supera ese período, **Then** el sistema genera una alerta de "sin movimiento".

---

### User Story 5 - Búsqueda, indicadores y exportación (Priority: P5)

Como Administrador, quiero buscar movimientos de inventario, ver indicadores globales
(valor total, productos sin stock, bajo mínimo, rotación) y exportar movimientos, para
entender la salud del inventario y auditar externamente si hace falta.

**Why this priority**: Aporta valor analítico y de reporting sobre movimientos ya
existentes (US1-US4); no bloquea la operación diaria de inventario.

**Independent Test**: Con varios movimientos y Products cargados, puede probarse
buscando por distintos atributos, consultando los indicadores globales, y exportando un
conjunto de movimientos.

**Acceptance Scenarios**:

1. **Given** varios movimientos cargados, **When** se busca por Product, SKU, Depósito,
   Categoría, estado, fecha o tipo de movimiento, **Then** el sistema devuelve los que
   coinciden en menos de 300 ms.
2. **Given** el inventario de una Organization, **When** se consultan los indicadores,
   **Then** el sistema muestra correctamente el valor total del inventario, productos
   sin stock, bajo stock mínimo, con mayor rotación, sin movimiento y los movimientos
   diarios por tipo (entradas, salidas, ajustes, transferencias).
3. **Given** un conjunto de movimientos, **When** un Administrador los exporta,
   **Then** obtiene un archivo con sus datos principales.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar un movimiento de inventario ya registrado? El
  sistema MUST impedirlo (RN-006): los movimientos son inmutables una vez creados; una
  corrección se realiza con un nuevo movimiento de ajuste.
- ¿Qué ocurre si dos usuarios registran movimientos sobre el mismo Product/Depósito al
  mismo tiempo? El sistema MUST aplicar ambos movimientos de forma consistente sobre el
  stock, sin perder ninguno de los dos registros ni permitir condiciones de carrera que
  dejen el stock inconsistente.
- ¿Qué pasa si se intenta transferir stock hacia el mismo Depósito de origen? El
  sistema MUST rechazarlo por no representar un movimiento real.
- ¿Qué sucede si se intenta vender stock reservado por otra operación? El sistema MUST
  impedirlo, consistente con RN-008 (US3, Acceptance Scenario 4).
- ¿Qué pasa si se archiva un Product (spec 018) que todavía tiene stock existente? El
  sistema MUST conservar el stock y su Kardex visibles en modo solo lectura, sin
  eliminarlos, igual que el resto de los datos del Product archivado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir registrar entradas de stock para un Product con
  control de stock habilitado, en un Depósito, con cantidad y motivo.
- **FR-002**: El sistema MUST permitir registrar salidas de stock, denegando la
  operación si el stock resultante fuera negativo, salvo autorización especial
  (RN-002).
- **FR-003**: El sistema MUST permitir registrar ajustes manuales (positivos o
  negativos) con motivo.
- **FR-004**: El sistema MUST permitir transferir stock entre Depósitos, generando un
  movimiento de salida en el origen y uno de entrada en el destino de forma atómica
  (RN-003).
- **FR-005**: El sistema MUST soportar múltiples Depósitos por Organization.
- **FR-006**: El sistema MUST permitir reservar y liberar stock, restando/devolviendo
  la cantidad reservada al stock disponible sin afectar el stock actual.
- **FR-007**: El sistema MUST impedir usar stock reservado para nuevas ventas mientras
  no se libere (RN-008).
- **FR-008**: El sistema MUST mantener un Kardex por Product/Depósito con fecha, tipo,
  documento origen, cantidad, stock anterior, stock posterior y usuario responsable de
  cada movimiento.
- **FR-009**: El sistema MUST generar alertas cuando el stock de un Product esté por
  debajo del stock mínimo (spec 018), agotado, en valor negativo, o sin movimiento
  durante un período configurable.
- **FR-010**: El sistema MUST calcular la valorización del inventario (costo promedio,
  último costo, valor total) por Product y a nivel global.
- **FR-011**: El sistema MUST permitir buscar movimientos por Product, SKU, Depósito,
  Categoría, estado, fecha o tipo de movimiento.
- **FR-012**: El sistema MUST calcular indicadores: valor total del inventario,
  productos sin stock, bajo stock mínimo, con mayor rotación, sin movimiento y
  movimientos diarios por tipo.
- **FR-013**: El sistema MUST permitir exportar movimientos de inventario.
- **FR-014**: El sistema MUST impedir la eliminación de movimientos de inventario ya
  registrados (RN-006).
- **FR-015**: El sistema MUST registrar en el Audit Log el ingreso, salida, ajuste,
  transferencia, reserva, liberación y modificación de inventario.
- **FR-016**: El sistema MUST garantizar que el inventario de una Organization nunca
  sea visible ni modificable desde otra Organization.

### Key Entities

- **Inventory**: Existencia de un `Product` (spec 018) en un `Warehouse`/Depósito
  dentro de una Organization (ver [Domain Model](../../docs/domain-model.md));
  atributos: stock actual, stock reservado, stock disponible (calculado), stock mínimo/
  máximo (heredados de spec 018 o configurados por Depósito).
- **StockMovement**: Movimiento inmutable de inventario (entrada, salida, ajuste
  positivo/negativo, transferencia, devolución, rotura, pérdida, inventario inicial,
  otro), con fecha, cantidad, motivo, usuario, documento origen y stock anterior/
  posterior — la unidad mínima del Kardex.
- **Warehouse**: Depósito/ubicación física donde se almacena stock, propio de una
  Organization (por ejemplo, Casa Central, Sucursal Norte, Vehículo).
- **StockReservation**: Reserva de una cantidad de stock para una operación comercial
  en curso, que la resta del stock disponible sin afectar el stock actual.
- **Valuation**: Valorización de un Product en inventario (costo promedio, último
  costo, valor total).
- **Audit Log**: Registro inmutable de ingreso/salida/ajuste/transferencia/reserva/
  liberación/modificación de inventario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un movimiento de entrada o salida se refleja en el stock disponible en
  menos de 5 segundos.
- **SC-002**: El 100% de las transferencias entre Depósitos generan exactamente un
  movimiento de salida y uno de entrada vinculados, sin excepciones.
- **SC-003**: El 100% de los intentos de vender stock reservado por otra operación son
  rechazados.
- **SC-004**: El 100% de los movimientos de inventario quedan registrados de forma
  inmutable en el Kardex y en el Audit Log.
- **SC-005**: El 100% de los Products cuyo stock cae por debajo de su mínimo generan
  una alerta, verificable por consulta directa.
- **SC-006**: Las búsquedas de movimientos devuelven resultados en menos de 300 ms en
  el 95% de los casos.
- **SC-007**: El sistema soporta al menos 1 millón de movimientos por Organization sin
  degradar el tiempo de búsqueda definido en SC-006.

## Assumptions

- El "stock mínimo/máximo" configurado en spec 018 (a nivel Product) es el valor por
  defecto; esta spec puede permitir configuraciones más finas por Depósito si el
  negocio lo requiere, sin que eso sea parte del alcance mínimo de esta fase.
- La "autorización especial" para vender con stock negativo (RN-002) se resuelve con
  el sistema de Roles/Permissions ya definido en
  [specs/007-roles-permissions/spec.md](../007-roles-permissions/spec.md) (por
  ejemplo, un Permission específico `inventory.sell_negative_stock`), sin definir un
  mecanismo de permisos nuevo acá.
- Compras (mencionadas como relación en el input, y ya anticipadas como fuera de
  alcance en spec 018) se definen en
  [specs/022-purchases/spec.md](../022-purchases/spec.md), que consume `StockMovement`
  de tipo "Compra" sin redefinirlo. Proveedores se define en
  [specs/021-suppliers/spec.md](../021-suppliers/spec.md).
- El "documento origen" de un StockMovement (por ejemplo, una Factura o una Compra) es
  una referencia opcional a otra entidad del sistema; esta spec no exige que todo
  movimiento tenga un documento origen (por ejemplo, un ajuste manual no lo tiene).
- Producción, manufactura, picking, logística, gestión de envíos, RFID y
  automatización mediante IA quedan explícitamente fuera de alcance de esta fase, según
  el input.
