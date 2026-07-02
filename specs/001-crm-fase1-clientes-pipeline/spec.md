# Feature Specification: CRM Fase 1 — Dashboard Comercial

**Feature Branch**: `001-crm-fase1-clientes-pipeline`
**Created**: 2026-07-01
**Status**: Draft (parcialmente superseded — ver nota de deprecación)
**Input**: User description: "Fase 1 del roadmap de Velo CRM (docs/product-vision.md): un CRM completo multi-tenant para PyMEs de servicios, comercios, agencias, software, estudios profesionales y constructoras. Incluye gestión de Empresas (tenants), Usuarios, Roles, Permisos, Clientes, Prospectos, Contactos, Pipeline de ventas, Actividades y Dashboard. Cada empresa opera de forma aislada (multi-tenant), con auditoría y permisos por rol. El objetivo es que una PyME pueda gestionar su relación con clientes y su pipeline comercial completo sin salir de Velo CRM, sentando las bases (usuarios, permisos, auditoría) que compartirán las fases futuras (Agenda, Facturación, Inventario, RRHH, Automatizaciones, Marketplace)."

**Nota de terminología**: Esta especificación usa el lenguaje ubicuo definido en
[SPEC-002 — Domain Model](../../docs/domain-model.md) (`Organization`, `User`,
`Membership`, `Role`, `Permission`, `Customer`, `Lead`, `Contact`, `Opportunity`,
`Activity`, `Audit Log`).

**Nota de deprecación (2026-07-01, cuarta actualización)**: Esta spec fue la primera
formulación de la Fase 1 del CRM y originalmente cubría Organization/Users/Roles/
Customers/Contacts/Leads/Opportunities/Activities/Dashboard en un solo documento. A
medida que el proyecto avanzó, ese alcance se dividió en specs propias por entidad.
Esta spec ya **NO** es dueña de:

- `Organization` (creación, plan, branding) → [specs/005-organizations-multi-tenant](../005-organizations-multi-tenant/spec.md)
- Autenticación/sesiones de `User` → [specs/004-authentication-identity](../004-authentication-identity/spec.md)
- Perfil y ciclo de vida de `User` → [specs/006-users](../006-users/spec.md)
- `Role`/`Permission` (RBAC) → [specs/007-roles-permissions](../007-roles-permissions/spec.md)
- `Customer` → [specs/008-customers](../008-customers/spec.md)
- `Contact` → [specs/009-contacts](../009-contacts/spec.md)
- `Lead` (captura, calificación, conversión) → [specs/010-leads](../010-leads/spec.md)
- `Opportunity`/pipeline (etapas, valor ponderado, KPIs, forecast) → [specs/011-opportunities](../011-opportunities/spec.md)
- `Activity` (registro, adjuntos, comentarios, timeline) → [specs/012-activities](../012-activities/spec.md)

Esta spec conserva únicamente lo que todavía no tiene una spec propia: el **Dashboard**
comercial, que agrega y resume datos de todas las specs anteriores. Las Historias de
Usuario 1 (Leads), 2 (Opportunities/pipeline), 3 (Activities) y 4 (Users/Roles/
Permissions) originales se reemplazaron por referencias a esas specs; no se eliminan del
historial de git para preservar la trazabilidad de la decisión. Dado que ya no queda
ninguna capacidad propia además del Dashboard, evaluar en el futuro si esta spec debería
renombrarse/fusionarse directamente en una eventual spec de Dashboard/Reporting (ver
Fase 8, Reporting, en [docs/implementation-plan.md](../../docs/implementation-plan.md)).

## Clarifications

### Session 2026-07-01

- Q: ¿Cuál es el primer release de Velo CRM? → A: Solo CRM (esta feature, hoy dividida
  en 001/008/009/010/011/012); el resto de las fases del roadmap (Facturación,
  Inventario, RRHH, etc.) no forman parte del MVP.
- Q: ¿Qué queda explícitamente fuera de alcance del MVP? → A: Contabilidad, Nómina,
  Manufactura, Marketplace, API Pública y AI Agents (ver
  [docs/clarifications-mvp.md](../../docs/clarifications-mvp.md)).
- Q: ¿Un User puede pertenecer a varias Organizations con Roles distintos en cada una? →
  A: Sí, vía una Membership independiente por Organization (ver spec 005/007).
- Q: ¿La IA puede definir o ejecutar reglas de negocio críticas en este MVP? → A: No; la
  IA (Fase 6 del roadmap) queda fuera de alcance y, cuando exista, solo asistirá sin
  reemplazar reglas de negocio deterministas (Constitución, Principio IX).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Superseded: Captura, calificación y conversión de Leads

> **Esta historia fue reemplazada.** Ahora vive en
> [specs/010-leads/spec.md](../010-leads/spec.md). Se conserva este encabezado
> únicamente para trazabilidad histórica; no agregar nuevos requisitos acá.

---

### User Story 2 - Superseded: Pipeline de ventas (Opportunities)

> **Esta historia fue reemplazada.** Ahora vive en
> [specs/011-opportunities/spec.md](../011-opportunities/spec.md). Se conserva este
> encabezado únicamente para trazabilidad histórica; no agregar nuevos requisitos acá.

---

### User Story 3 - Superseded: Activities y seguimiento comercial

> **Esta historia fue reemplazada.** Ahora vive en
> [specs/012-activities/spec.md](../012-activities/spec.md). Se conserva este
> encabezado únicamente para trazabilidad histórica; no agregar nuevos requisitos acá.

---

### User Story 4 - Superseded: Administración de Users, Roles y Permissions

> **Esta historia fue reemplazada.** La administración de invitaciones, Membership,
> Roles y Permissions ahora vive en
> [specs/005-organizations-multi-tenant](../005-organizations-multi-tenant/spec.md)
> (invitaciones), [specs/006-users](../006-users/spec.md) (ciclo de vida del User) y
> [specs/007-roles-permissions](../007-roles-permissions/spec.md) (RBAC completo). Se
> conserva este encabezado únicamente para trazabilidad histórica; no agregar nuevos
> requisitos acá.

---

### User Story 5 - Dashboard comercial (Priority: P1) 🎯

Como usuario comercial o administrador, quiero ver un panel con los indicadores clave de
mi actividad comercial (Customers, Opportunities abiertas, Activities pendientes), para
entender de un vistazo cómo va el negocio sin tener que recorrer cada módulo.

**Why this priority**: Es la única capacidad propia que le queda a esta spec: agrega en
un solo lugar datos que ya viven en Customers (008), Leads (010), Opportunities (011) y
Activities (012).

**Independent Test**: Con datos ya cargados de Customers (spec 008), Opportunities
(spec 011) y Activities (spec 012), puede probarse accediendo al dashboard y verificando
que los indicadores coinciden con los datos reales de esa Organization.

**Acceptance Scenarios**:

1. **Given** una Organization con Customers y Opportunities cargadas, **When** el usuario
   entra al dashboard, **Then** ve el total de Customers, Leads y Opportunities abiertas
   por etapa.
2. **Given** Activities pendientes y vencidas, **When** el usuario entra al dashboard,
   **Then** ve un resumen de sus Activities pendientes y vencidas del día.
3. **Given** dos Organizations distintas, **When** cada una consulta su dashboard,
   **Then** cada una ve únicamente sus propios indicadores.

---

### Edge Cases

- ¿Qué pasa si el dashboard se consulta antes de que exista ningún dato cargado en la
  Organization? El sistema MUST mostrar el panel con valores en cero, no un error.
- ¿Qué pasa si alguna de las specs de las que el dashboard agrega datos (008/010/011/
  012) no está disponible o falla? El sistema MUST degradar mostrando el resto de los
  indicadores disponibles, no bloquear todo el panel por una sola fuente de datos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST proveer un dashboard por Organization con el total de
  Customers (spec 008), Leads (spec 010), Opportunities abiertas por etapa (spec 011) y
  Activities pendientes/vencidas (spec 012).
- **FR-002**: El sistema MUST reflejar en el dashboard los cambios de Customers,
  Opportunities y Activities dentro de los tiempos definidos en Success Criteria.

> Requisitos de Organization, autenticación, perfil de User y RBAC se movieron a specs
> 004-007; los de Customer/Contact a specs 008-009; los de Lead a spec 010; los de
> Opportunity/pipeline a spec 011; los de Activity a spec 012. No se duplican acá.

### Key Entities

Esta spec no define entidades propias: el Dashboard es una vista agregada de solo
lectura sobre `Customer` (008), `Lead` (010), `Opportunity` (011) y `Activity` (012).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El dashboard de una Organization refleja cambios en Customers,
  Opportunities o Activities en menos de 5 segundos después de realizados.
- **SC-002**: Una PyME con hasta 5 Users puede gestionar todo su ciclo comercial (alta de
  Lead → Opportunity → cierre) y verlo reflejado en el dashboard, combinando esta spec
  con 008/009/010/011/012.

## Assumptions

- El dashboard de esta fase muestra métricas agregadas propias del CRM (Customers,
  pipeline, Activities); no incluye reportes financieros, que corresponden a fases
  futuras (Facturación) ni un motor de Reporting genérico (Fase 8 del roadmap).
- Quedan explícitamente fuera de alcance de este MVP: Contabilidad, Nómina,
  Manufactura, Marketplace, API Pública y AI Agents. Estas capacidades corresponden a
  fases posteriores del roadmap (ver [docs/product-vision.md](../../docs/product-vision.md)).
