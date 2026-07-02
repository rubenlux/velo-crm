# Feature Specification: Reportes, Dashboards y Analítica

**Feature Branch**: `026-reporting-analytics`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-026 — Reportes, Dashboards y Analítica. Consolidar información de todos los módulos de VELO mediante dashboards interactivos (Ejecutivo, Comercial, Financiero, Inventario, Compras), KPIs, reportes personalizados con filtros/agrupación/orden, visualizaciones (tabla, tarjetas KPI, barras, líneas, áreas, torta, donut, embudo comercial), exportación (PDF/Excel/CSV), favoritos, plantillas y programación de generación automática, con auditoría completa, permisos y aislamiento entre organizaciones. No incluye Business Intelligence avanzado, Data Warehouse, Machine Learning, predicciones mediante IA ni cubos OLAP."

**Nota de terminología**: Esta especificación posee las entidades `Dashboard` y
`Report` del bounded context **Platform** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md),
que ya anticipaba `Reporting` en ese contexto). **Reemplaza y absorbe por completo** el
Dashboard comercial que quedó como única capacidad propia de
[specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md)
(ver nota de deprecación final en esa spec, que queda enteramente superseded a partir
de esta feature). Consume datos de todas las specs 008-025 como fuente de lectura,
sin modificarlas ni redefinirlas — este módulo es de solo lectura sobre el resto del
sistema.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar dashboards predefinidos (Priority: P1) 🎯

Como Usuario, Gerente o Administrador, quiero ver dashboards predefinidos (Ejecutivo,
Comercial, Financiero, Inventario, Compras) con los indicadores clave de mi área, para
entender de un vistazo cómo va el negocio sin recorrer cada módulo por separado.

**Why this priority**: Es el valor central del módulo y reemplaza directamente al
Dashboard comercial que hoy vive en spec 001; sin dashboards no hay nada que
personalizar (US2), exportar (US3) ni programar (US4).

**Independent Test**: Con datos ya cargados en Customers (008), Opportunities (011),
Invoices (016) e Inventory (020), puede probarse abriendo el Dashboard Ejecutivo y el
Dashboard Comercial y verificando que los indicadores coinciden con los datos reales de
la Organization.

**Acceptance Scenarios**:

1. **Given** una Organization con datos cargados, **When** un usuario abre el
   Dashboard Ejecutivo, **Then** ve ventas del mes, facturación, cobros, clientes
   nuevos, oportunidades y stock crítico.
2. **Given** una Organization, **When** un usuario comercial abre el Dashboard
   Comercial, **Then** ve el pipeline, conversión de Leads, rendimiento por vendedor y
   oportunidades abiertas/ganadas/perdidas (equivalente y superset del Dashboard
   original de spec 001).
3. **Given** una Organization, **When** un usuario de Finanzas abre el Dashboard
   Financiero, **Then** ve facturación, pagos recibidos, facturas vencidas, cobranza e
   ingresos.
4. **Given** una Organization, **When** un usuario de Inventario abre el Dashboard
   Inventario, **Then** ve stock disponible, stock crítico, productos sin movimiento,
   productos más vendidos y valor del inventario.
5. **Given** una Organization, **When** un usuario de Compras abre el Dashboard
   Compras, **Then** ve compras del período, proveedores, órdenes abiertas y
   recepciones pendientes.
6. **Given** dos Organizations distintas, **When** cada una consulta cualquier
   dashboard, **Then** cada una ve únicamente sus propios datos (RN-002).
7. **Given** un Usuario sin permisos sobre cierta información (por ejemplo, datos
   financieros), **When** abre un dashboard que la incluye, **Then** el sistema oculta
   o restringe esa sección según sus permisos (RN-001).

---

### User Story 2 - Crear y guardar reportes personalizados (Priority: P2)

Como Usuario, quiero crear un reporte personalizado con filtros, agrupación y orden
sobre los datos de mi Organization, y guardarlo para reutilizarlo, para responder
preguntas específicas que los dashboards predefinidos no cubren.

**Why this priority**: Aporta flexibilidad de análisis sobre datos ya visibles en los
dashboards (US1); una Organization puede operar solo con dashboards predefinidos sin
esta historia.

**Independent Test**: Puede probarse creando un reporte (por ejemplo, "facturas
vencidas por cliente"), aplicando filtros de fecha y estado, guardándolo, y
verificando que se puede volver a ejecutar con los mismos parámetros.

**Acceptance Scenarios**:

1. **Given** una Organization, **When** un Usuario crea un reporte eligiendo una
   fuente de datos (por ejemplo, Invoices, spec 016) y aplica filtros, agrupación y
   orden, **Then** el reporte muestra los resultados correspondientes.
2. **Given** un reporte configurado, **When** el Usuario lo guarda, **Then** queda
   disponible como plantilla reutilizable (RN-004) para volver a ejecutarlo.
3. **Given** un reporte guardado, **When** se edita, **Then** los cambios se guardan
   sin afectar ejecuciones anteriores ya exportadas.

---

### User Story 3 - Exportar reportes (Priority: P3)

Como Usuario, quiero exportar un reporte o dashboard en PDF, Excel o CSV, para
compartir la información fuera de VELO o analizarla en otra herramienta.

**Why this priority**: Aporta valor de distribución sobre reportes/dashboards ya
disponibles (US1/US2); no bloquea la consulta dentro de la plataforma.

**Independent Test**: Con un reporte ya generado, puede probarse exportándolo en cada
uno de los tres formatos y verificando que el contenido exportado coincide con lo
mostrado en pantalla, respetando los permisos del usuario.

**Acceptance Scenarios**:

1. **Given** un reporte o dashboard, **When** un Usuario lo exporta en PDF, Excel o
   CSV, **Then** obtiene un archivo con los datos que tiene permiso de ver (RN-001), y
   la exportación queda registrada (RN-005).
2. **Given** un Usuario sin permisos sobre parte de la información de un reporte,
   **When** lo exporta, **Then** el archivo exportado excluye esa información, igual
   que la vista en pantalla.

---

### User Story 4 - Programar y compartir reportes (Priority: P4)

Como Usuario, quiero programar la generación automática de un reporte (diaria, semanal,
mensual, trimestral o anual) y compartirlo con otros Users de mi Organization, para no
tener que ejecutarlo manualmente cada vez que lo necesito.

**Why this priority**: Aporta automatización y colaboración sobre reportes ya creados
(US2); no bloquea el uso manual de reportes bajo demanda.

**Independent Test**: Con un reporte guardado, puede probarse programando su
generación semanal y verificando que se genera automáticamente en el ciclo esperado;
por separado, compartiéndolo con otro Usuario y verificando que puede accederlo según
sus permisos.

**Acceptance Scenarios**:

1. **Given** un reporte guardado, **When** un Usuario programa su generación (diaria,
   semanal, mensual, trimestral o anual), **Then** el sistema lo genera
   automáticamente según esa periodicidad.
2. **Given** un reporte, **When** un Usuario lo comparte con otro Usuario de su
   Organization, **Then** ese Usuario puede acceder a él respetando sus propios
   permisos, no los del creador.

---

### User Story 5 - Favoritos (Priority: P5)

Como Usuario, quiero marcar dashboards y reportes como favoritos, para acceder
rápidamente a los que uso con más frecuencia.

**Why this priority**: Es una mejora de usabilidad sobre dashboards/reportes ya
existentes (US1-US4); no bloquea ninguna capacidad core.

**Independent Test**: Puede probarse marcando un dashboard y un reporte como favoritos
y verificando que aparecen en un acceso rápido para ese Usuario.

**Acceptance Scenarios**:

1. **Given** un dashboard o reporte, **When** un Usuario lo marca como favorito,
   **Then** aparece en su lista de accesos rápidos personales.

---

### Edge Cases

- ¿Qué pasa si un reporte consulta datos de un módulo que aún no tiene información
  cargada (por ejemplo, una Organization nueva sin Invoices)? El sistema MUST mostrar
  el reporte con valores en cero o vacíos, no un error.
- ¿Qué ocurre si dos Users con distintos permisos ejecutan el mismo reporte
  compartido? El sistema MUST aplicar los permisos de quien lo ejecuta, no los de quien
  lo creó o compartió (consistente con RN-001).
- ¿Qué pasa si se programa un reporte y luego se le revocan permisos al Usuario que lo
  programó sobre parte de los datos? El sistema MUST generar la próxima ejecución
  programada respetando los permisos vigentes al momento de generarse, no los que
  tenía al programarlo.
- ¿Qué sucede si se solicita un reporte sobre un volumen muy grande de datos? El
  sistema MUST completarlo dentro de un tiempo razonable o informar claramente que
  está en proceso, sin bloquear el resto de la aplicación para ese Usuario.
- ¿Qué pasa si se intenta exportar un reporte con datos de otra Organization
  (manipulando parámetros)? El sistema MUST rechazarlo, consistente con RN-002.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST proveer dashboards predefinidos: Ejecutivo, Comercial,
  Financiero, Inventario y Compras, con los indicadores descritos en el input.
- **FR-002**: El sistema MUST calcular los indicadores de cada dashboard a partir de
  datos actualizados de los módulos correspondientes (Customers, Leads, Opportunities,
  Invoices, Payments, Products, Inventory, Suppliers, Purchases).
- **FR-003**: El sistema MUST permitir crear reportes personalizados eligiendo una
  fuente de datos y aplicando filtros, agrupación y orden.
- **FR-004**: El sistema MUST soportar al menos las visualizaciones: tabla, tarjetas
  KPI, barras, líneas, áreas, torta, donut, embudo comercial e indicadores numéricos.
- **FR-005**: El sistema MUST permitir guardar un reporte como plantilla reutilizable
  (RN-004).
- **FR-006**: El sistema MUST permitir exportar reportes y dashboards en PDF, Excel
  (.xlsx) y CSV.
- **FR-007**: El sistema MUST aplicar los permisos del usuario que exporta o consulta
  un reporte, ocultando la información sobre la que no tiene autorización.
- **FR-008**: El sistema MUST permitir programar la generación automática de un
  reporte con periodicidad diaria, semanal, mensual, trimestral o anual.
- **FR-009**: El sistema MUST permitir compartir un reporte con otros Users de la
  misma Organization, aplicando los permisos propios de cada uno al acceder.
- **FR-010**: El sistema MUST permitir marcar dashboards y reportes como favoritos por
  Usuario.
- **FR-011**: El sistema MUST filtrar todos los reportes y dashboards al menos por
  Organization, fecha, usuario, responsable, estado, Customer, Product, categoría,
  vendedor y etiquetas, según corresponda a la fuente de datos.
- **FR-012**: El sistema MUST registrar en el Audit Log la creación, modificación,
  eliminación lógica, ejecución, exportación, programación y compartición de reportes.
- **FR-013**: El sistema MUST garantizar que ningún dashboard o reporte muestre
  información de una Organization distinta a la del usuario que consulta.

### Key Entities

- **Dashboard**: Conjunto de indicadores y visualizaciones diseñado para monitorear un
  área del negocio (ver [Domain Model](../../docs/domain-model.md)); esta fase incluye
  los dashboards Ejecutivo, Comercial, Financiero, Inventario y Compras como
  plantillas predefinidas de solo lectura.
- **Report**: Consulta estructurada y configurable sobre los datos de la Organization,
  con filtros, agrupación, orden y visualización elegidos por el Usuario; puede
  guardarse como plantilla (RN-004).
- **ReportSchedule**: Configuración de generación automática periódica de un Report.
- **Widget**: Elemento visual individual dentro de un Dashboard o Report (tabla,
  tarjeta KPI, gráfico de barras/líneas/áreas/torta/donut, embudo, indicador
  numérico).
- **Favorite**: Marca personal de un Usuario sobre un Dashboard o Report para acceso
  rápido.
- **Audit Log**: Registro inmutable de creación/modificación/eliminación lógica/
  ejecución/exportación/programación/compartición de reportes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los dashboards predefinidos cargan en menos de 2 segundos para un volumen
  estándar de datos.
- **SC-002**: El 100% de los indicadores mostrados reflejan datos actualizados de la
  Organization consultante, sin mezclar datos de otra Organization.
- **SC-003**: El 100% de las exportaciones respetan los permisos del usuario que las
  genera, verificable comparando el archivo exportado contra la vista en pantalla.
- **SC-004**: El 100% de los reportes programados se generan en el ciclo configurado
  (diario/semanal/mensual/trimestral/anual).
- **SC-005**: El 100% de las acciones de creación, ejecución, exportación,
  programación y compartición quedan registradas en el Audit Log.
- **SC-006**: Un Usuario puede crear y guardar un reporte personalizado en menos de
  5 minutos.
- **SC-007**: El sistema soporta reportes sobre al menos 1 millón de registros por
  fuente de datos sin degradar el tiempo de carga más allá de lo definido en SC-001
  para un volumen estándar.

## Assumptions

- Este módulo es de **solo lectura** sobre el resto del sistema: no crea, edita ni
  elimina datos de negocio en las specs 008-025, solo los consulta y los presenta.
- El envío automático de reportes programados por correo electrónico (mencionado como
  "futuras versiones" en el input) queda fuera de alcance de esta fase; se apoyará en
  un canal externo de notificaciones cuando exista (spec 024 solo cubre notificación
  interna en esta fase).
- Los indicadores de cada dashboard predefinido (FR-001) se consideran el conjunto
  mínimo de esta fase; nuevos indicadores o dashboards adicionales podrán agregarse sin
  requerir una reespecificación completa de este módulo.
- Business Intelligence avanzado, Data Warehouse, Machine Learning, predicciones
  mediante IA, integraciones con Power BI/Tableau/Looker y cubos OLAP quedan
  explícitamente fuera de alcance de esta fase, según el input.
