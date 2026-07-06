# Implementation Plan — Velo CRM / Business OS

Plan maestro de fases del roadmap (ver [docs/product-vision.md](product-vision.md)) y
arquitectura técnica de referencia para todo el proyecto. Los planes técnicos por
feature (`specs/<feature>/plan.md`, generados por `/speckit-plan`) deben ser
consistentes con la arquitectura técnica definida acá salvo justificación explícita.

Ver [docs/roadmap-tasks.md](roadmap-tasks.md) para el backlog macro por fase (compañero
de este plan); el desglose ejecutable por historia de usuario vive en
`specs/<feature>/tasks.md`.

## Phase 0 — Project Foundation

- Repository
- Constitution
- Product Vision
- Domain Model
- Development standards
- CI/CD
- Docker
- Monorepo structure

**Deliverable**: Project skeleton ready.

---

## Phase 1 — Platform Core

Modules:

- Authentication ✅ **implementado** (2026-07-02) — ver estado abajo
- Organizations ✅ **implementado** (2026-07-02) — ver estado abajo
- Users ✅ **implementado** (2026-07-02) — ver estado abajo
- Roles ✅ **implementado** (2026-07-03) — ver estado abajo
- Permissions ✅ **implementado** (2026-07-03) — ver estado abajo
- Audit Log ✅ **implementado** (spec 005, extendido en spec 007)

**Deliverable**: Secure multi-tenant platform.

Mapea a [specs/004-authentication-identity/spec.md](../specs/004-authentication-identity/spec.md),
[specs/005-organizations-multi-tenant/spec.md](../specs/005-organizations-multi-tenant/spec.md),
[specs/006-users/spec.md](../specs/006-users/spec.md) y
[specs/007-roles-permissions/spec.md](../specs/007-roles-permissions/spec.md).

### Estado de implementación — Authentication (spec 004)

Las 5 historias de usuario están implementadas y testeadas (`backend/src/modules/identity/`,
`frontend/src/features/auth/`): registro/login/logout/verificación de email,
recuperación y cambio de contraseña, login con Google/Microsoft, gestión de sesiones y
dispositivos, y MFA por TOTP con códigos de recuperación. 35 tests (contract +
integration + E2E) pasando contra una base Postgres real. El endpoint de aceptación de
invitaciones (FR-018), antes diferido por depender de `Organization`/`Membership`, ya
está implementado — ver spec 005 abajo. El login social no se probó contra
Google/Microsoft reales (requiere credenciales OAuth que este entorno no tiene) — la
lógica de creación/vinculación de cuenta sí está testeada con perfiles simulados.

CSRF no aplica a esta superficie: los access/refresh tokens viajan por header
`Authorization: Bearer` y body JSON, nunca por cookies de navegador, así que no hay
estado ambiental que un sitio de terceros pueda explotar. Reevaluar si en el futuro se
migra a cookies de sesión. Los tests de integración/E2E (`backend/tests/`) comparten una
única base Postgres real y llaman `resetDatabase()` entre casos, por eso
`backend/jest.config.js` fija `maxWorkers: 1` — correrlos en paralelo trunca tablas que
otro worker está usando a mitad de test.

### Estado de implementación — Organizations (spec 005)

Las 5 historias de usuario están implementadas y testeadas
(`backend/src/modules/organizations/`, `frontend/src/features/organizations/`): crear y
configurar una Organization (con Membership Propietario automática), branding/
impuestos/módulos habilitados según plan, invitaciones (cerrando el FR-018 diferido de
spec 004), cambio de plan con validación de límites, y suspensión/reactivación
administrativa. 31 tests nuevos (contract + integration + E2E) pasando contra la misma
base Postgres real, para un total de 67 tests en el backend.

Aislamiento multi-tenant: cada request a un recurso de Organization exige el header
`X-Organization-Id`, validado por `TenantContextGuard` contra la Membership activa del
User — ver `specs/005-organizations-multi-tenant/research.md` #1. Se agregó un chequeo
adicional contra ataques de "confused deputy" (header validado para una Organization,
`:id` de la URL apuntando a otra). Se encontró y corrigió durante la implementación un
problema real: `AcceptInvitationUseCase` no verificaba que el email del User autenticado
coincidiera con el email invitado, lo que permitía que cualquiera con el token de
invitación se uniera con el rol invitado — ahora se valida y, si no coincide, la
invitación permanece válida para su destinatario real (queda cubierto por test de
regresión).

**Hardening post-revisión**: `AuthGuard` pasó a ser un guard global
(`APP_GUARD` en `AppModule`, deny-by-default) con un decorator `@Public()` para las
rutas que no lo requieren; `TenantContextGuard` se aplica a nivel de clase en
`OrganizationsController` (no por método) con `@SkipTenantContext()` para las 3
excepciones reales. Esto cierra el riesgo de que un endpoint nuevo quede sin protección
por simple olvido — antes cada guard era opt-in por método. También se reforzó
`OrganizationInvitationRepository` para filtrar `organizationId` en la query misma
(`WHERE`/`updateMany` de Prisma), no solo en una comparación posterior del use case —
defensa en profundidad, no una vulnerabilidad explotable hoy. Ver la nota "Post-revisión"
en `specs/005-organizations-multi-tenant/tasks.md`.

Se introdujo el primer `AuditLog` persistido y consultable de la plataforma
(`GET /organizations/:id/audit-log`), a diferencia del logger de solo-consola usado como
seam temporal en `identity` (spec 004) — migrar `identity` a este mismo mecanismo queda
fuera de alcance de esta fase. El catálogo de planes (`Free`/`Pro`/`Enterprise`, límites
de usuarios y módulos) se modela como configuración estática en código
(`backend/src/modules/organizations/infrastructure/plan-catalog.ts`), no como tabla en
base de datos. La suspensión/reactivación de Organizations (acción administrativa de
plataforma) se protege con un allowlist de emails vía `PLATFORM_ADMIN_EMAILS`, no con un
sistema de roles de plataforma completo (fuera de alcance de esta spec).

### Estado de implementación — Users (spec 006)

Las 4 historias de usuario están implementadas y testeadas
(`backend/src/modules/users/`, `frontend/src/features/users/`): editar perfil y
preferencias, listar/"cambiar" entre Organizations propias, administrar el ciclo de
vida de Users de una Organization (desactivar/reactivar/eliminar con el invariante de
"nunca sin administrador"), e historial de accesos de solo lectura. 19 tests nuevos
(contract + integration + E2E) pasando contra la misma base Postgres real, para un
total de 82 tests en el backend.

`User` sigue siendo una única tabla (propiedad de `identity` a nivel de schema): las
columnas de perfil/estado se agregaron ahí y el `UserRepository` de `identity` se
extendió y se exportó para que `users` lo consuma, en vez de crear un segundo
repositorio sobre la misma tabla — ver `specs/006-users/research.md` #1. `AuditLog`
(spec 005) pasó a aceptar `organizationId` nulo para eventos de cuenta no atados a
ninguna Organization (por ejemplo, que un User edite su propio nombre) — ver
research.md #7. El invariante de "nunca sin administrador" (`FR-008`), preparado pero
sin usar desde spec 005, se ejercita por primera vez acá al desactivar/eliminar un
User. `TenantContextGuard` (spec 005) se extendió para rechazar también si
`User.status` no es `Active`, cerrando el requisito de que un User suspendido/
inactivo/eliminado no pueda acceder a datos de ninguna Organization aunque sus
credenciales de login sigan siendo válidas (`FR-012`).

### Estado de implementación — Roles & Permissions (spec 007)

Las 4 historias de usuario están implementadas y testeadas
(`backend/src/modules/roles/`, `frontend/src/features/roles/`): asignar/revocar Roles
adicionales y Permissions directos a un User con efecto inmediato, consultar permisos
efectivos propios o ajenos, crear/editar/eliminar Roles personalizados (con herencia
opcional de un Role por defecto), y filtrar el catálogo de Permissions ofrecido según
los módulos habilitados de la Organization. 16 tests nuevos (integration + E2E) pasando
contra la misma base Postgres real, para un total de 98 tests en el backend.

RBAC se construyó **encima** de `Membership.role` (spec 005), no reemplazándolo: el rol
base sigue viviendo ahí sin cambios, y esta feature agrega dos tablas nuevas
(`RoleAssignment`, `MembershipPermission`) para roles/permisos *adicionales* — ver
`specs/007-roles-permissions/research.md` #1. Los 8 roles por defecto (todos salvo
Propietario) son filas compartidas (`Role.organizationId = null`), sembradas de forma
idempotente al bootear (`DefaultRolesSeeder`, upsert por nombre) para sobrevivir a
`resetDatabase()` en tests sin un paso de seed manual — research.md #2.
"Propietario" no tiene fila `Role`: es un bypass total en código
(`EffectivePermissionsService`/`PermissionsGuard`), evitando tener que mantener
sincronizada una fila con "todos los permisos existentes" cada vez que el catálogo
crece — research.md #3.

Prevención de escalamiento de privilegios (`FR-013`): `AssignRoleUseCase` y
`GrantDirectPermissionUseCase` comparan el conjunto de permisos del Role/Permission a
otorgar contra los permisos efectivos del propio actor, rechazando con
`PrivilegeEscalationError` si excede lo que el actor mismo posee (salvo Propietario).
Como demostración end-to-end real (no solo contra los endpoints nuevos de esta spec),
se retro-adoptó el `OrganizationMembersController` de spec 006
(deactivate/reactivate/delete) de su chequeo hardcodeado `actorRole in
['Propietario','Administrador']` a `@RequirePermission('user.manage')` — el rol por
defecto Administrador incluye ese permiso, así que los 82 tests preexistentes de specs
004-006 siguen pasando sin modificarse. `PermissionsGuard` se aplica por método (no a
nivel de clase) en `RolesController` porque `effective-permissions` tiene una regla
condicional que un guard de clase no puede expresar: un User siempre puede consultar
los suyos propios, pero consultar los de otro exige `role.manage`.

El catálogo de Permissions (`backend/src/modules/roles/infrastructure/
permission-catalog.ts`) es un dato estático en código, no una tabla — incluye permisos
de recursos de CRM que todavía son solo spec (`lead.create`, `opportunity.update`,
etc.) para que los roles por defecto (Ventas, Contabilidad, Inventario...) no queden
vacíos hasta que esas specs (008+) se implementen; ningún endpoint de esta spec hace
cumplir permisos sobre recursos que no existen todavía — research.md #5. Un Role
personalizado solo puede heredar (`inheritsFromRoleId`) de un Role **por defecto**,
nunca de otro personalizado, lo que además garantiza por construcción que no pueda
formarse un ciclo de herencia.

---

## Phase 2 — CRM

Modules:

- Customers ✅ **implementado** (2026-07-03) — ver estado abajo
- Contacts ✅ **implementado** (2026-07-03) — ver estado abajo
- Leads ✅ **implementado** (2026-07-04) — ver estado abajo
- Opportunities ✅ **implementado** (2026-07-04) — ver estado abajo
- Activities ✅ **implementado** (2026-07-05) — ver estado abajo
- Tasks
- Dashboard

**Deliverable**: Complete CRM.

Mapea a [specs/001-crm-fase1-clientes-pipeline/spec.md](../specs/001-crm-fase1-clientes-pipeline/spec.md)
(superseded) y, por entidad, a
[specs/008-customers/spec.md](../specs/008-customers/spec.md),
[specs/009-contacts/spec.md](../specs/009-contacts/spec.md),
[specs/010-leads/spec.md](../specs/010-leads/spec.md),
[specs/011-opportunities/spec.md](../specs/011-opportunities/spec.md) y
[specs/012-activities/spec.md](../specs/012-activities/spec.md).

### Estado de implementación — Customers (spec 008)

Las 5 historias de usuario están implementadas y testeadas
(`backend/src/modules/customers/`): alta/edición con prevención de duplicados por
CUIT/NIF por Organization, búsqueda/filtros (índices `pg_trgm`/GIN para <300ms a
escala), baja lógica (archivado)/restauración, línea de tiempo unificada, y fusión de
duplicados + exportar/importar en CSV. 19 tests nuevos (integration + E2E) pasando
contra la misma base Postgres real, para un total de 117 tests en el backend.

Primer módulo real de la Fase 2, construido enteramente **sobre** el core de
plataforma (specs 004-007) sin tocarlo: reutiliza `TenantContextGuard`/
`AuditLogPublisher` (spec 005) y `PermissionsGuard`/`@RequirePermission('customer.*')`
con los permission keys que spec 007 ya había declarado por adelantado — sin agregar
claves nuevas al catálogo (`specs/008-customers/research.md` #2). El historial de
cambios campo-por-campo vive en una tabla propia (`CustomerHistory`), separada del
`AuditLog` de plataforma; la línea de tiempo de un Customer es una vista calculada que
combina ambas fuentes en el momento de la consulta, no una tabla `TimelineEntry`
persistida (research.md #4-#5) — patrón que specs futuras (Contacts, Activities,
Opportunities, Documentos) deben replicar en vez de introducir una tabla de timeline
compartida.

Concurrencia optimista (columna `version`, incrementada en cada edición) protege
contra ediciones simultáneas del mismo Customer sin locks pesimistas
(research.md #8). La fusión de duplicados no introduce un nuevo valor de
`CustomerStatus`: usa un campo `mergedIntoCustomerId` (auto-relación) y bloquea el
acceso directo al registro descartado con un error dedicado que indica el
sobreviviente (research.md #6) — mismo patrón a seguir por spec 009 (Contacts) para su
propia fusión. `CustomerArchivedGuardService` (FR-011: bloquear nuevas Opportunities
sobre un Customer archivado) es una declaración anticipada sin consumidor real
todavía — spec 011 (Opportunities) la usará al implementarse, mismo patrón que spec
007 declaró permisos de CRM por adelantado.

### Estado de implementación — Contacts (spec 009)

Las 5 historias de usuario están implementadas y testeadas
(`backend/src/modules/contacts/`): alta/edición/archivado de Contacts bajo un Customer
(FK obligatoria, sin excepción), designación de contacto principal por Customer,
búsqueda por nombre/email/teléfono/cargo/empresa/ciudad/etiquetas (incluidos emails y
teléfonos secundarios), línea de tiempo unificada, y transferencia entre Customers +
fusión de duplicados del mismo Customer. 17 tests nuevos (integration + E2E) pasando
contra la misma base Postgres real, para un total de 134 tests en el backend.

Primer módulo de la Fase 2 que depende de **otro** módulo de la misma fase, no solo
del core de plataforma: `Contact.customerId` es una FK `onDelete: Restrict` obligatoria
hacia `Customer` (spec 008) — `ContactsModule` importa `CustomersModule` y consume su
`CustomerRepository` exportado para validar el `customerId` al crear/transferir
(`specs/009-contacts/research.md` #1). Replica varios patrones ya validados en spec
008 sin modificarlos: reutiliza los permission keys `contact.*` de spec 007 sin
agregar ninguno nuevo, historial propio (`ContactHistory`) + timeline calculada (no
persistida) igual que `CustomerHistory`, y fusión vía `mergedIntoContactId` (auto-
relación) sin introducir un nuevo valor de `ContactStatus` — con una restricción
adicional que spec 008 no necesita: solo se puede fusionar Contacts del mismo
Customer (`ContactCustomerMismatchError`).

"A lo sumo un Contact principal por Customer en todo momento" (SC-004) se garantiza en
dos capas: una transacción de aplicación (`ContactRepository.setPrimary`, desmarca el
anterior y marca el nuevo atómicamente) más un índice único parcial de Postgres
(`contacts_customer_primary_unique ON contacts (customer_id) WHERE is_primary = true`)
como defensa en profundidad — Prisma no puede expresar un índice único parcial en
`schema.prisma`, así que se agregó a mano en el `.sql` de la migración
(`specs/009-contacts/research.md` #4). Transferir un Contact a otro Customer fuerza
`isPrimary = false` incondicionalmente, incluso si era el principal del Customer de
origen (research.md #5) — el Customer de origen queda sin principal hasta que se
designe uno nuevo manualmente, tal como pide el edge case de spec.md.

### Estado de implementación — Leads (spec 010)

Las 5 historias de usuario están implementadas y testeadas
(`backend/src/modules/leads/`): alta/calificación/asignación de responsable, notas
ilimitadas + próxima acción + adjuntos (sin el registro de actividades tipo llamada/
reunión/email, diferido a spec 012 — research.md #9), conversión en Customer + Contact
principal + Opportunity en una única operación transaccional, marcar como perdido y
reactivar (restaurando el estado exacto previo a la pérdida), y búsqueda/timeline/
importación en lote. 24 tests nuevos (integration + E2E) pasando contra la misma base
Postgres real, para un total de 160 tests en el backend.

Primer módulo de la Fase 2 con **dos** dependencias de Fase 2 simultáneas: la
conversión (US3) consume `CustomerRepository` (spec 008) y `ContactRepository`
(spec 009) dentro de una única transacción Prisma. Esa misma transacción resuelve el
edge case de conversiones concurrentes: un `updateMany` condicional
(`status IN (Nuevo, Contactado, Calificado, EnNegociacion)`) es el paso que decide la
carrera — verificado con un test que dispara 5 conversiones simultáneas sobre el mismo
Lead y confirma exactamente 1 éxito y un solo Customer/Contact creados
(`specs/010-leads/research.md` #11).

**Excepción documentada de Modular by Design**: la conversión también crea una
`Opportunity`, pero ese módulo es de spec 011 (sin implementar). Se agregó una tabla
`Opportunity` mínima (sin Pipeline configurable, KPIs ni forecast) con sus enums
tomados literalmente de `specs/011-opportunities/spec.md`, escrita únicamente por un
repositorio deliberadamente angosto (`opportunity-stub.repository.ts`, solo `create`)
hasta que spec 011 se implemente y absorba la propiedad de la tabla
(`specs/010-leads/research.md` #10 y plan.md § Complexity Tracking) — decisión
confirmada explícitamente con el usuario antes de implementar, junto con diferir el
registro de actividades (arriba) a spec 012.

Una revisión de seguridad post-implementación encontró y corrigió un bug real antes de
cerrar la spec: `ConvertLeadUseCase` resolvía `linkToExistingCustomerId`/
`linkToExistingContactId` con una consulta sin filtrar por `organizationId`
(`tx.customer.findUniqueOrThrow({ where: { id } })`), permitiendo en teoría vincular la
conversión de un Lead a un Customer/Contact de **otra** Organization. Se corrigió
resolviendo y validando ambos ids con los repositorios ya scoped
(`CustomerRepository.findById`/`ContactRepository.findById`) **antes** de la
transacción, rechazando con 400 si no pertenecen a la Organization del Lead — cubierto
por un test dedicado (`leads-convert-link-cross-org.spec.ts`).

### Estado de implementación — Opportunities (spec 011)

Las 5 historias de usuario están implementadas y testeadas
(`backend/src/modules/opportunities/`): Pipeline y etapas configurables por
Organization (con etapas por defecto creadas perezosamente en el primer uso), alta y
movimiento de Oportunidades en el pipeline con reasignación de responsable, valor
estimado/probabilidad con valor ponderado calculado en el momento de la consulta,
cierre (Ganada/Perdida) con reapertura restaurando exactamente la etapa previa a la
pérdida y archivado/restauración, KPIs y forecast por período agregados en vivo (sin
caché ni tabla materializada), y búsqueda global + línea de tiempo combinando
`OpportunityHistory` con el `AuditLog` de plataforma. 22 tests nuevos (integration +
E2E, incluidos los 3 de la regresión de seguridad de abajo) pasando contra la misma
base Postgres real, para un total de 182 tests en el backend.

**Resuelve, no introduce, una excepción de Modular by Design**: spec 010 (Leads) había
dejado una tabla `Opportunity` mínima (enum `PipelineStage`, sin Pipeline configurable)
como excepción documentada y temporal. Esta spec la reemplaza por los modelos reales
(`Pipeline`, `PipelineStage`, `Opportunity` reformado con `pipelineId`/`stageId`/
`probability`/`estimatedCloseDate`/etc.) y `LeadsModule` pasa a importar
`OpportunitiesModule` en vez de usar el `OpportunityStubRepository` provisional — la
Fase Foundational de esta spec migró `ConvertLeadUseCase` y volvió a correr toda la
suite de Leads antes de tocar cualquier historia nueva, para no dejar spec 010 roto a
mitad de camino (`specs/011-opportunities/research.md` #1, #4).

El Pipeline por defecto (8 etapas: Nueva/Calificada/Descubrimiento/Propuesta/
Negociación/Cierre/Ganada/Perdida) se crea de forma perezosa en el primer uso
(`PipelineRepository.findOrCreateDefault`) en vez de engancharse a la creación de la
Organization — evita que `OrganizationsModule` (core de plataforma) tenga que importar
un módulo de dominio como `OpportunitiesModule`. Una condición de carrera real entre
dos primeras llamadas concurrentes se encontró durante la implementación (no por un
test que fallara) y se corrigió con un índice único parcial de Postgres
(`pipelines_organization_default_unique ON pipelines (organizationId) WHERE
isDefault = true`, agregado a mano en la migración) más un `try/catch` sobre el
`P2002` de Prisma en el repositorio, releyendo la fila ganadora (research.md #3).

Primera spec del proyecto que agrega **permission keys nuevas** más allá de reutilizar
el CRUD que spec 007 ya había declarado: `opportunity.edit_won` (editar una
Oportunidad `Ganada`) y `opportunity.manage_pipeline` (reconfigurar las etapas del
Pipeline) — `Gerente` recibe la primera pero no la segunda, `Ventas` no recibe
ninguna (research.md #6). Una revisión de seguridad post-implementación encontró y
corrigió un bypass real de `opportunity.edit_won` antes de cerrar la spec: `archive →
update (mientras Archivada) → restore` permitía editar el valor/probabilidad de una
Oportunidad efectivamente `Ganada` porque `UpdateOpportunityUseCase` solo miraba
`state === 'Ganada'` literal, y `LoseOpportunityUseCase` movía una Oportunidad
`Ganada` directo a `Perdida` sin exigir el permiso especial. Se corrigió extendiendo
el chequeo a "`Ganada`, o `Archivada` con `stateBeforeArchive = Ganada`", agregando el
mismo chequeo a `lose`, y agregando la guarda de `Archivada` que a `win`/`lose` les
faltaba (paridad con `move-stage`) — cubierto por
`opportunities-won-bypass-guard.spec.ts` (3 tests).

Un segundo fix post-entrega (encontrado 2026-07-05, mientras se investigaba spec 012):
`CreateOpportunityUseCase` nunca llamó a `CustomerArchivedGuardService`, el servicio
que spec 008 había declarado por adelantado exactamente para este propósito (FR-011
de spec 008: sin nuevas Oportunidades sobre un Customer archivado) — se creaba una
Oportunidad igual sobre un Customer archivado. Corregido inyectando ese guard ya
exportado por `CustomersModule` (sin cambios de wiring); cubierto por
`opportunities-archived-customer-guard.spec.ts` (2 tests). Ver
`specs/011-opportunities/research.md` #16 para el detalle y la lección para specs
futuras (verificar explícitamente que un servicio "forward-declared" realmente se
llama, no solo que compila).

### Estado de implementación — Activities (spec 012)

Las 5 historias de usuario están implementadas y testeadas
(`backend/src/modules/activities/`): registro/gestión de Activities (tipo, título,
descripción, fecha/hora, duración, prioridad, participantes) asociadas a uno o más de
{Customer, Contact, Lead, Opportunity} con cancelar/reactivar (mismo patrón que
`Lead.lose`/`reactivate`), resultado sobre una Activity finalizada + próxima
actividad programada heredando la entidad relacionada del origen, adjuntos +
comentarios internos (editables/eliminables solo por su autor, sin excepción para
Propietario), línea de tiempo automática de cada entidad relacionada (resuelta en el
frontend, no en el backend) y búsqueda/filtrado global + línea de tiempo propia de
la Activity. 19 tests nuevos (integration + E2E) pasando contra la misma base
Postgres real, para un total de 203 tests en el backend.

Primera spec de esta Fase que importa **cuatro** módulos de dominio de CRM a la vez
(`CustomersModule`, `ContactsModule`, `LeadsModule`, `OpportunitiesModule`) para
validar las FKs de `Activity` al crear/programar una próxima actividad. La decisión
de diseño más importante de esta spec: para que las Activities de un Customer/
Contact/Lead/Opportunity aparezcan automáticamente en SU línea de tiempo (FR-009),
**no** se modificaron las 4 `Get<Entity>TimelineUseCase` ya enviadas (specs
008-011) — eso habría obligado a esos módulos a importar `ActivitiesModule` de
vuelta, creando el primer ciclo de dependencias del proyecto. En cambio,
`CustomerTimeline.tsx`/`ContactTimeline.tsx`/`LeadTimeline.tsx`/
`OpportunityTimeline.tsx` (ya existentes) llaman además al mismo endpoint de
búsqueda de Activities (`GET .../activities?customerId=X`, etc.) y mergean+ordenan
cronológicamente el resultado, sin ningún cambio de backend en esos 4 módulos
(`specs/012-activities/research.md` #13).

`ActivityType` (catálogo de interacciones configurable por Organization, FR-010)
sigue el patrón de `Role` (spec 007) — filas compartidas (`organizationId = null`)
seedeadas idempotentemente por `DefaultActivityTypesSeeder`, no el patrón de
`Pipeline` (spec 011, tabla real *por Organization* creada perezosamente), porque
un tipo de Activity no necesita configuración propia por Organization desde el
primer uso como sí la necesita una `PipelineStage` (`order`/`isWonStage`/
`isLostStage`). Primera key de permiso nueva desde spec 011:
`activity.manage_types`, mismo criterio que `opportunity.manage_pipeline` (acción
de administración de catálogo compartido, no CRUD normal).

Una revisión de seguridad post-implementación confirmó, sin encontrar bugs nuevos:
aislamiento por `organizationId` en los 5 repositorios nuevos (con re-validación en
cada use case donde el repositorio de comentarios/adjuntos no filtra directamente
por Organization); que el chequeo de autoría de comentarios no tiene ningún bypass,
ni siquiera para Propietario (decisión deliberada de la Clarification, no un
descuido); que `activity.manage_types` está correctamente excluido de
`Gerente`/`Ventas`/`Soporte` en `DEFAULT_ROLE_PERMISSIONS` (mismo gotcha de
`byResource()` ya documentado en spec 011); que la validación de coherencia de
Customer entre entidades relacionadas (FR-002a) usa siempre los repositorios ya
scoped por Organization, nunca una consulta directa sin filtrar; y que no existe
ninguna ruta `DELETE` física sobre `Activity` en ningún estado.

---

## Phase 3 — Sales

Modules: Quotes, Invoices, Payments.

Sales consume el catálogo de productos del contexto Inventory/Catalog (Phase 4); no lo
posee. Un Quote/Invoice referencia Products existentes, pero su creación, precios y
categorización son responsabilidad exclusiva de Inventory.

**Deliverable**: Commercial management.

---

## Phase 4 — Inventory / Catalog

Modules: Products, Categories, Inventory, Suppliers, Purchases.

Products es el dueño del catálogo (artículo o servicio comercializable) consumido tanto
por Sales (Quotes/Invoices) como por el resto de la plataforma; ver
[docs/bounded-contexts.md](bounded-contexts.md) (contexto Inventory) y
[docs/domain-model.md](domain-model.md) (`Product └── Inventory`).

**Deliverable**: Inventory & catalog management.

---

## Phase 5 — Collaboration

Modules: Calendar, Documents, Notifications.

**Deliverable**: Internal collaboration.

---

## Phase 6 — Automation

Modules: Workflows, Triggers, Actions.

**Deliverable**: Business automation.

---

## Phase 7 — Artificial Intelligence

Modules: AI Agents, AI Assistant, Smart Suggestions.

**Deliverable**: AI-assisted platform.

---

## Phase 8 — Platform

Modules: Reporting, Public API, Webhooks, Marketplace, SDK.

**Deliverable**: Complete Business OS ecosystem.

---

## Technical Architecture

### Frontend

- React
- TypeScript
- Vite

### Backend

- NestJS
- TypeScript

### Database

- PostgreSQL
- Prisma

### Storage

- S3 Compatible

### Authentication

- JWT
- Refresh Tokens
- OAuth

### Infrastructure

- Docker
- Docker Compose

### Observability

- Logs
- Metrics
- Health Checks

### Testing

- Unit
- Integration
- E2E

### Deployment

- Cloud Native
