# Feature Specification: Gestión de Categorías

**Feature Branch**: `019-categories`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-019 — Gestión de Categorías. Organizar, clasificar y estructurar el catálogo de Products mediante una jerarquía flexible de categorías/subcategorías multinivel: orden de visualización, color/icono/imagen, archivado (una categoría archivada no puede asignarse a nuevos productos, pero los productos ya categorizados conservan su categoría histórica en documentos emitidos), sin ciclos en la jerarquía, fusión de categorías duplicadas, búsqueda, indicadores (total, activas, archivadas, productos por categoría, sin productos), con auditoría completa y aislamiento entre organizaciones. No incluye gestión de productos, inventario, comercio electrónico ni menús públicos."

**Nota de terminología**: Esta especificación posee la entidad `Category` del bounded
context **Inventory**, **extrayéndola** de
[specs/018-products/spec.md](../018-products/spec.md) (ver nota de deprecación parcial
en esa spec), donde vivía de forma simplificada como un campo plano de clasificación.
La razón del cambio: una Category real forma una **jerarquía multinivel** (categoría
padre/subcategorías, sin ciclos) con su propio ciclo de vida (activa/inactiva/
archivada, reordenamiento, fusión) — suficiente complejidad propia para ser una entidad
de primer nivel, igual que ya se decidió para Customer/Contact (008/009) o Payment/
Invoice (017/016). Depende de `Product` (spec 018): una Category clasifica Products,
pero no los redefine.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear categorías y subcategorías jerárquicas (Priority: P1) 🎯

Como usuario de Inventario o Administrador, quiero crear categorías y subcategorías en
una jerarquía de múltiples niveles, para organizar el catálogo de Products de mi
Organization.

**Why this priority**: Es el valor central del módulo: sin poder crear categorías
jerárquicas no hay nada que reordenar, fusionar ni asignar a Products.

**Independent Test**: Puede probarse creando una categoría raíz (por ejemplo,
"Electrónica") y una subcategoría dentro de ella (por ejemplo, "Computadoras"),
verificando que la jerarquía se refleja correctamente, sin depender de Products ni de
otras historias.

**Acceptance Scenarios**:

1. **Given** una Organization, **When** un usuario crea una categoría con nombre y
   descripción, **Then** queda creada en estado `Activa` como categoría raíz (sin
   categoría padre).
2. **Given** una categoría existente, **When** un usuario crea una subcategoría dentro
   de ella, **Then** la subcategoría queda vinculada como hija, con su nivel calculado
   correctamente.
3. **Given** una categoría, **When** se intenta asignarle como padre a una de sus
   propias subcategorías (directa o indirectamente), **Then** el sistema lo rechaza
   (RN-007: no pueden existir ciclos).
4. **Given** una categoría, **When** se le asigna color, ícono e imagen, **Then** esos
   atributos quedan visibles junto con la categoría.

---

### User Story 2 - Reordenar la jerarquía de categorías (Priority: P2)

Como usuario de Inventario, quiero cambiar el orden de visualización de las categorías y
mover subcategorías entre categorías padre, para mantener el catálogo organizado a
medida que crece.

**Why this priority**: Aporta valor de mantenimiento sobre categorías ya creadas (US1);
un catálogo pequeño ya es utilizable sin reordenar.

**Independent Test**: Con varias categorías y subcategorías creadas, puede probarse
cambiando su orden de visualización y moviendo una subcategoría a otra categoría padre,
verificando que la jerarquía se actualiza correctamente sin generar ciclos.

**Acceptance Scenarios**:

1. **Given** varias categorías del mismo nivel, **When** un usuario cambia su orden de
   visualización, **Then** el nuevo orden se refleja al consultar el catálogo.
2. **Given** una subcategoría, **When** se reasigna a otra categoría padre válida,
   **Then** su nivel y jerarquía se recalculan correctamente.
3. **Given** una categoría con subcategorías, **When** se intenta moverla para que
   quede debajo de una de sus propias subcategorías, **Then** el sistema lo rechaza
   (RN-007).

---

### User Story 3 - Archivar y restaurar categorías (Priority: P3)

Como Administrador, quiero archivar una categoría que ya no se usa y restaurarla si
vuelve a necesitarse, para mantener el catálogo ordenado sin romper productos ya
clasificados.

**Why this priority**: Es necesario para el mantenimiento del catálogo con el tiempo,
pero no bloquea el uso básico de categorías activas (US1/US2).

**Independent Test**: Puede probarse archivando una categoría, verificando que no puede
asignarse a un nuevo Product, y luego restaurándola para confirmar que vuelve a estar
disponible.

**Acceptance Scenarios**:

1. **Given** una categoría activa, **When** un Administrador la archiva, **Then** pasa a
   estado `Archivada` sin eliminarse físicamente (RN-005).
2. **Given** una categoría `Archivada`, **When** se intenta asignarla a un nuevo
   Product, **Then** el sistema lo impide (RN-004).
3. **Given** un Product ya categorizado antes del archivado, **When** se consulta un
   documento ya emitido con ese Product (por ejemplo, una Quote), **Then** sigue
   mostrando la categoría histórica sin verse afectado (RN-008).
4. **Given** una categoría `Archivada`, **When** un Administrador la restaura, **Then**
   vuelve a estado `Activa` y puede asignarse nuevamente.

---

### User Story 4 - Fusionar categorías duplicadas (Priority: P4)

Como Administrador, quiero fusionar dos categorías duplicadas, para sanear el catálogo
cuando se crearon por error de forma redundante.

**Why this priority**: Es una operación de mantenimiento de datos, útil pero no
bloqueante frente a las capacidades ya cubiertas por US1-US3.

**Independent Test**: Puede probarse creando dos categorías equivalentes, fusionándolas,
y verificando que los Products de ambas quedan bajo la categoría resultante.

**Acceptance Scenarios**:

1. **Given** dos categorías identificadas como duplicadas, **When** un Administrador
   las fusiona, **Then** los Products de la categoría descartada quedan reasignados a
   la categoría resultante, y la descartada deja de estar disponible para asignar.
2. **Given** una fusión de categorías con subcategorías, **When** ocurre, **Then** las
   subcategorías de la categoría descartada quedan reasignadas bajo la categoría
   resultante, sin generar ciclos.

---

### User Story 5 - Búsqueda e indicadores del catálogo de categorías (Priority: P5)

Como Administrador, quiero buscar categorías y ver indicadores (total, activas,
archivadas, productos por categoría, categorías sin productos), para entender cómo está
organizado mi catálogo.

**Why this priority**: Aporta valor analítico y de mantenimiento sobre categorías ya
existentes (US1-US4); no bloquea la operación comercial diaria.

**Independent Test**: Con varias categorías y Products asignados, puede probarse
buscando por distintos atributos y consultando los indicadores del catálogo de
categorías.

**Acceptance Scenarios**:

1. **Given** varias categorías cargadas, **When** se busca por nombre, estado, color,
   nivel o categoría padre, **Then** el sistema devuelve las que coinciden.
2. **Given** un catálogo de categorías con Products asignados, **When** se consultan
   los indicadores, **Then** el sistema muestra correctamente el total de categorías,
   activas, archivadas, productos por categoría y categorías sin productos.

---

### Edge Cases

- ¿Qué pasa si se intenta eliminar físicamente una categoría? El sistema MUST
  impedirlo (RN-005); solo existe `Archivada` como baja lógica.
- ¿Qué ocurre si se intenta asignar más de una categoría padre a una misma categoría?
  El sistema MUST impedirlo (RN-002: una categoría padre única).
- ¿Qué pasa si se fusionan dos categorías donde una es ancestro de la otra en la
  jerarquía? El sistema MUST rechazarlo o resolverlo de forma que no se generen ciclos
  ni referencias circulares.
- ¿Qué sucede si dos usuarios editan la jerarquía (mueven categorías) al mismo tiempo?
  El sistema MUST validar la ausencia de ciclos en cada cambio individual, rechazando
  cualquier movimiento que genere uno, sin importar el orden de las operaciones
  concurrentes.
- ¿Qué pasa si se archiva una categoría que tiene subcategorías activas? El sistema
  MUST permitirlo, pero las subcategorías activas siguen disponibles para asignar
  independientemente del estado de su categoría padre, salvo que también se archiven
  explícitamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear categorías con nombre, descripción y
  estado.
- **FR-002**: El sistema MUST permitir crear subcategorías vinculadas a una categoría
  padre, formando una jerarquía de múltiples niveles.
- **FR-003**: El sistema MUST impedir que una categoría tenga más de una categoría
  padre (RN-002).
- **FR-004**: El sistema MUST impedir la creación de ciclos en la jerarquía de
  categorías (RN-007).
- **FR-005**: El sistema MUST permitir modificar el orden de visualización de las
  categorías dentro de un mismo nivel.
- **FR-006**: El sistema MUST permitir reasignar una subcategoría a otra categoría
  padre válida, recalculando su nivel.
- **FR-007**: El sistema MUST permitir asignar color, ícono e imagen a una categoría.
- **FR-008**: El sistema MUST permitir archivar una categoría (baja lógica) y
  restaurarla posteriormente.
- **FR-009**: El sistema MUST impedir asignar una categoría `Archivada` a un nuevo
  Product.
- **FR-010**: El sistema MUST conservar la categoría histórica de un Product en
  documentos ya emitidos, sin verse afectada por el archivado posterior de esa
  categoría (RN-008).
- **FR-011**: El sistema MUST permitir fusionar dos categorías, reasignando los
  Products y subcategorías de la categoría descartada a la resultante.
- **FR-012**: El sistema MUST permitir buscar categorías por nombre, estado, color,
  nivel o categoría padre.
- **FR-013**: El sistema MUST calcular indicadores del catálogo de categorías: total,
  activas, archivadas, productos por categoría y categorías sin productos.
- **FR-014**: El sistema MUST registrar en el Audit Log la creación, modificación,
  cambio de jerarquía, reordenamiento, archivado, restauración y fusión de categorías.
- **FR-015**: El sistema MUST garantizar que las categorías de una Organization nunca
  sean visibles ni modificables desde otra Organization.

### Key Entities

- **Category**: Clasificación lógica jerárquica usada para organizar `Product` (ver
  [specs/018-products/spec.md](../018-products/spec.md)); entidad de primer nivel con
  su propio ciclo de vida, no un campo plano de Product. Atributos: información
  general (nombre, descripción, estado), organización (categoría padre, orden, nivel) y
  apariencia (color, ícono, imagen).
- **CategoryStatus**: Estado de la Category: `Activa`, `Inactiva`, `Archivada`.
- **CategoryHierarchy**: Relación padre-hijo entre Categories, validada para no
  contener ciclos (RN-007).
- **Audit Log**: Registro inmutable de creación/modificación/cambio de jerarquía/
  reordenamiento/archivado/restauración/fusión de categorías.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede crear una categoría o subcategoría en menos de 1 minuto.
- **SC-002**: El 100% de los intentos de crear un ciclo en la jerarquía (directo o a
  través de varios niveles) son rechazados.
- **SC-003**: El 100% de las categorías `Archivada` son rechazadas al intentar
  asignarlas a un nuevo Product.
- **SC-004**: El 100% de los Products ya categorizados en documentos emitidos
  conservan su categoría histórica tras el archivado de esa categoría.
- **SC-005**: El 100% de las acciones de creación, reordenamiento, archivado,
  restauración y fusión quedan registradas en el Audit Log.
- **SC-006**: Las búsquedas de categorías devuelven resultados en menos de 300 ms en el
  95% de los casos.

## Assumptions

- El campo `Category` que spec 018 (Products) mencionaba como clasificación plana pasa
  a referenciar esta entidad jerárquica; spec 018 se actualiza para reflejar la
  extracción (ver su nota de deprecación).
- "Categorías con mayor volumen de ventas" (indicador marcado como "futuro" en el
  input) requiere datos históricos de ventas (Invoice/Payment) y queda fuera de alcance
  de esta fase.
- El catálogo público, el comercio electrónico, el SEO de categorías, la clasificación
  automática mediante IA y la traducción automática quedan explícitamente fuera de
  alcance de esta fase, según el input.
- La fusión de categorías (US4) es una operación manual iniciada por un Administrador;
  la detección automática/sugerida de categorías duplicadas queda fuera de alcance de
  esta fase.
