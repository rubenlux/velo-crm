# Feature Specification: CRM Fase 1 (Superseded)

**Feature Branch**: `001-crm-fase1-clientes-pipeline`
**Created**: 2026-07-01
**Status**: Superseded — conservada únicamente por trazabilidad histórica
**Input**: User description: "Fase 1 del roadmap de Velo CRM (docs/product-vision.md): un CRM completo multi-tenant para PyMEs de servicios, comercios, agencias, software, estudios profesionales y constructoras. Incluye gestión de Empresas (tenants), Usuarios, Roles, Permisos, Clientes, Prospectos, Contactos, Pipeline de ventas, Actividades y Dashboard. Cada empresa opera de forma aislada (multi-tenant), con auditoría y permisos por rol. El objetivo es que una PyME pueda gestionar su relación con clientes y su pipeline comercial completo sin salir de Velo CRM, sentando las bases (usuarios, permisos, auditoría) que compartirán las fases futuras (Agenda, Facturación, Inventario, RRHH, Automatizaciones, Marketplace)."

**Nota de terminología**: Esta especificación usó el lenguaje ubicuo definido en
[SPEC-002 — Domain Model](../../docs/domain-model.md) (`Organization`, `User`,
`Membership`, `Role`, `Permission`, `Customer`, `Lead`, `Contact`, `Opportunity`,
`Activity`, `Audit Log`).

**Nota de deprecación final (2026-07-01)**: Esta spec fue la primera formulación de la
Fase 1 del CRM y originalmente cubría Organization/Users/Roles/Customers/Contacts/
Leads/Opportunities/Activities/Dashboard en un solo documento. A medida que el
proyecto avanzó, todo su alcance se fue dividiendo en specs propias por entidad, hasta
que su última capacidad propia (el Dashboard comercial) quedó absorbida por
[specs/026-reporting-analytics/spec.md](../026-reporting-analytics/spec.md). Esta spec
**ya no es dueña de ninguna capacidad**; se conserva completa en el repositorio solo
para trazabilidad histórica de cómo evolucionó el alcance del proyecto. El mapa
completo de a dónde se movió cada parte:

- `Organization` (creación, plan, branding) → [specs/005-organizations-multi-tenant](../005-organizations-multi-tenant/spec.md)
- Autenticación/sesiones de `User` → [specs/004-authentication-identity](../004-authentication-identity/spec.md)
- Perfil y ciclo de vida de `User` → [specs/006-users](../006-users/spec.md)
- `Role`/`Permission` (RBAC) → [specs/007-roles-permissions](../007-roles-permissions/spec.md)
- `Customer` → [specs/008-customers](../008-customers/spec.md)
- `Contact` → [specs/009-contacts](../009-contacts/spec.md)
- `Lead` (captura, calificación, conversión) → [specs/010-leads](../010-leads/spec.md)
- `Opportunity`/pipeline (etapas, valor ponderado, KPIs, forecast) → [specs/011-opportunities](../011-opportunities/spec.md)
- `Activity` (registro, adjuntos, comentarios, timeline) → [specs/012-activities](../012-activities/spec.md)
- Dashboard comercial → [specs/026-reporting-analytics](../026-reporting-analytics/spec.md)

**No agregar nuevos requisitos a esta spec.** Cualquier trabajo nuevo debe dirigirse a
la spec que corresponda según el mapa anterior.

## Clarifications (histórico)

### Session 2026-07-01

- Q: ¿Cuál es el primer release de Velo CRM? → A: Solo CRM (esta feature, hoy dividida
  en specs 004-026); el resto de las fases del roadmap (RRHH, Marketplace, etc.) no
  forman parte del MVP.
- Q: ¿Qué queda explícitamente fuera de alcance del MVP? → A: Contabilidad, Nómina,
  Manufactura, Marketplace, API Pública y AI Agents (ver
  [docs/clarifications-mvp.md](../../docs/clarifications-mvp.md)).
- Q: ¿Un User puede pertenecer a varias Organizations con Roles distintos en cada una? →
  A: Sí, vía una Membership independiente por Organization (ver spec 005/007).
- Q: ¿La IA puede definir o ejecutar reglas de negocio críticas en este MVP? → A: No; la
  IA (Fase 6/7 del roadmap) queda fuera de alcance y, cuando exista, solo asistirá sin
  reemplazar reglas de negocio deterministas (Constitución, Principio IX; ver también
  [specs/025-workflows/spec.md](../025-workflows/spec.md) para el mecanismo
  determinista de automatización).

Estas clarificaciones siguen siendo válidas como decisiones de producto, pero ya no
viven "en" esta spec: el alcance del MVP se refleja hoy en el conjunto de specs
004-026, no en este documento.

## User Scenarios & Testing *(histórico — todas las historias fueron reemplazadas)*

### User Story 1 - Superseded: Captura, calificación y conversión de Leads

> Ahora vive en [specs/010-leads/spec.md](../010-leads/spec.md).

### User Story 2 - Superseded: Pipeline de ventas (Opportunities)

> Ahora vive en [specs/011-opportunities/spec.md](../011-opportunities/spec.md).

### User Story 3 - Superseded: Activities y seguimiento comercial

> Ahora vive en [specs/012-activities/spec.md](../012-activities/spec.md).

### User Story 4 - Superseded: Administración de Users, Roles y Permissions

> Ahora vive en [specs/005-organizations-multi-tenant](../005-organizations-multi-tenant/spec.md)
> (invitaciones), [specs/006-users](../006-users/spec.md) (ciclo de vida del User) y
> [specs/007-roles-permissions](../007-roles-permissions/spec.md) (RBAC completo).

### User Story 5 - Superseded: Dashboard comercial

> Ahora vive en [specs/026-reporting-analytics/spec.md](../026-reporting-analytics/spec.md)
> (Dashboard Comercial, uno de los cinco dashboards predefinidos de esa feature).

## Requirements, Key Entities, Success Criteria (histórico)

Todos los requisitos funcionales, entidades y criterios de éxito originales de esta
spec fueron migrados a las specs listadas en la nota de deprecación final. No quedan
requisitos activos en este documento.

## Assumptions (histórico)

- Quedan explícitamente fuera de alcance del MVP original: Contabilidad, Nómina,
  Manufactura, Marketplace, API Pública y AI Agents. Estas capacidades corresponden a
  fases posteriores del roadmap (ver [docs/product-vision.md](../../docs/product-vision.md)),
  varias de las cuales ya tienen spec propia (015-026).
