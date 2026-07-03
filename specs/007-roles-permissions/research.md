# Research: Roles & Permissions (RBAC)

No quedaron marcadores `NEEDS CLARIFICATION` en el Technical Context. Este documento
resuelve las decisiones técnicas concretas necesarias para implementar los requisitos
funcionales de [spec.md](spec.md) — en particular, cómo introducir RBAC sin reabrir el
modelo de roles ya implementado y testeado en specs 005/006.

## 1. RBAC se construye encima de `Membership.role`, no lo reemplaza

- **Decision**: `Membership.role: MembershipRole` (spec 005, campo único) se mantiene
  exactamente como está — sigue siendo el "rol base" de una Membership, y todo el
  código de specs 005/006 que lo lee (`TenantContextGuard`, los chequeos
  `actorRole !== 'Propietario'` de `OrganizationsController`/`UsersController`) queda
  sin tocar. Esta spec agrega una tabla nueva, `RoleAssignment`, para roles
  *adicionales* (Acceptance Scenario 2 de US1: "un segundo rol"). Los permisos
  efectivos de un User = permisos del rol base (`Membership.role`) ∪ permisos de cada
  `RoleAssignment`.
- **Rationale**: Reemplazar `Membership.role` por un modelo muchos-a-muchos
  significaría reescribir cada chequeo de autorización de specs 005/006 (ya
  implementadas, testeadas con 82 tests pasando, y en git history) sin que ningún
  Acceptance Scenario de esta spec lo exija — todos los escenarios de spec.md hablan de
  *agregar* capacidades (roles adicionales, roles personalizados, permisos efectivos),
  no de reemplazar el mecanismo existente. Migrar retroactivamente specs ya estables
  para "prolijidad" viola Principio VIII (Simplicity Wins) y el criterio de no tocar
  código sin una razón funcional.
- **Alternatives considered**: Migrar `Membership.role` a una relación
  `Membership ↔ Role` muchos-a-muchos desde el inicio (rechazada: alto riesgo sobre
  código estable sin beneficio funcional adicional — ningún FR de esta spec pide
  eliminar el concepto de "rol base"); mantener los roles adicionales solo en memoria
  de aplicación sin persistir (rechazada: viola FR-003 "aplicando el cambio de
  inmediato" de forma durable y FR-014 de auditoría, que requieren un registro
  persistente).

## 2. Los roles por defecto son filas compartidas (globales), no una copia por Organization

- **Decision**: `Role.organizationId` es nullable. `null` = rol por defecto,
  compartido por toda la plataforma (una sola fila por nombre, no una copia por
  Organization); un valor concreto = rol personalizado, exclusivo de esa Organization.
  Los 8 roles por defecto que no sean "Propietario" (Administrador, Gerente, Ventas,
  Soporte, Contabilidad, Inventario, RRHH, Lector — ver research.md #3 sobre por qué
  Propietario es un caso aparte) se siembran de forma **idempotente** (`upsert` por
  nombre) al bootear la aplicación (`DefaultRolesSeeder`), no vía una migración de
  datos de una sola vez — así sobreviven a `resetDatabase()` en tests sin necesitar un
  paso de seed manual separado. `resetDatabase()` solo borra roles personalizados
  (`Role.deleteMany({ where: { organizationId: { not: null } } })`), preservando los
  8 roles por defecto entre tests.
- **Rationale**: Los roles por defecto tienen el mismo conjunto de permisos en toda la
  plataforma (FR-001 los define una sola vez); crear 8 filas idénticas por cada
  Organization sería duplicación pura sin ningún beneficio (ninguna Organization puede
  editar un rol por defecto — FR-007). Sembrarlos vía código en vez de una migración
  SQL de datos los mantiene reproducibles en cualquier entorno (incluida la base de
  test, que se resetea constantemente) sin pasos manuales adicionales.
- **Alternatives considered**: Materializar 8 filas por Organization al crearla
  (rechazada: multiplica filas sin necesidad — actualizar un permiso por defecto
  requeriría un `UPDATE` masivo en vez de una sola fila); no persistir los roles por
  defecto en absoluto y resolverlos 100% en código (rechazada: `RoleAssignment`
  necesita una fila `Role` real para poder referenciar "el User tiene también el rol
  Contabilidad además de su rol base" de forma uniforme, sin un tipo discriminado
  default-vs-personalizado en la tabla puente).

## 3. "Propietario" no es una fila de `Role`; es un bypass total en código

- **Decision**: FR-005 ("Propietario tiene acceso total") se implementa como un
  chequeo temprano en el cálculo de permisos efectivos y en el `PermissionsGuard`:
  si `membership.role === 'Propietario'`, el chequeo pasa sin consultar ninguna tabla
  de permisos. No existe una fila `Role` para "Propietario" ni falta hacerla — ese
  valor sigue viviendo exclusivamente en `Membership.role` (ver research.md #1).
- **Rationale**: Enumerar "todos los permisos existentes" en una fila requeriría
  mantenerla sincronizada cada vez que el catálogo de Permissions crezca (cualquier
  spec futura que agregue un recurso tendría que recordar agregarlo también a la fila
  de Propietario). Un bypass en código es correcto por construcción y no puede
  desincronizarse.
- **Alternatives considered**: Fila `Role` con un flag `isWildcard: true` en vez de un
  bypass hardcodeado por nombre (rechazada por ahora: agrega una rama de
  configuración más sin un caso de uso que la necesite — "acceso total" es
  exclusivamente para Propietario según FR-005, no un concepto general todavía).

## 4. Prevención de escalamiento de privilegios (FR-013, SC-003)

- **Decision**: `AssignRoleUseCase` calcula los permisos efectivos del *actor* (quien
  asigna) y los del *rol a asignar*; si el rol a asignar incluye algún permiso que el
  actor no posee, se rechaza con `PrivilegeEscalationError` — salvo que el actor sea
  Propietario (bypass de research.md #3, que por definición nunca escala de más).
- **Rationale**: Es la lectura literal del edge case de spec.md ("ningún User puede
  asignarse a sí mismo [o a otro] un rol con permisos que no puede otorgar a otros") y
  de FR-013. Comparar conjuntos de permisos (no solo nombres de rol) es necesario
  porque un rol personalizado podría llamarse distinto pero otorgar permisos que el
  actor tampoco posee.
- **Alternatives considered**: Restringir la asignación de roles únicamente a
  Propietario/Administrador sin comparar permisos (rechazada: no es lo que pide FR-013
  — un Administrador con permisos limitados por un rol personalizado igual podría
  otorgar permisos que él mismo no tiene si solo se mirara el nombre del rol actor).

## 5. El catálogo de Permissions se declara por adelantado para recursos que aún no
   tienen código (CRM, specs 008-013)

- **Decision**: `permission-catalog.ts` incluye permisos ya exigibles hoy
  (`organization.manage`, `user.manage`, `role.manage`) y también permisos de
  recursos de CRM que todavía son solo spec (`customer.read/create/update/delete`,
  `lead.*`, `opportunity.*`, etc.), cada uno etiquetado con el módulo al que
  pertenece (`crm`, `facturacion`, etc., alineado con
  `Organization.enabledModules` de spec 005) para que FR-010 (disponibilidad según
  módulos habilitados) sea verificable ya mismo aunque esos endpoints no existan
  todavía. Ningún endpoint de esta spec **hace cumplir** permisos sobre recursos que
  no existen — el catálogo declara el permiso, pero no hay ningún controller que lo
  chequee hasta que la spec de ese recurso se implemente.
- **Rationale**: El catálogo de Roles por defecto (FR-001) está nombrado
  explícitamente en función de dominios de negocio que todavía no tienen código
  (Ventas → Leads/Opportunities, Contabilidad → Invoicing, Inventario → Inventory,
  RRHH → recursos humanos). Sin declarar sus permisos típicos, "Ventas" y
  "Contabilidad" serían roles vacíos hasta que se implementen specs 010-017,
  contradiciendo el Acceptance Scenario 1 de US1 ("el rol Ventas puede
  `lead.create`"). Declarar el permiso en el catálogo es una decisión de datos, no de
  código ejecutable — no genera endpoints falsos ni funcionalidad simulada.
- **Alternatives considered**: Limitar el catálogo inicial solo a los recursos ya
  implementados (organization/user/role) y dejar que cada spec futura agregue sus
  propios permisos al catálogo (rechazada: el propio Acceptance Scenario 1 de spec.md
  usa `lead.create`/`opportunity.update` como ejemplos concretos de lo que el rol
  Ventas debe poder hacer — omitirlos haría que ese escenario no se pueda probar
  literalmente tal como está escrito).

## 6. Permisos directos a un User, además de los otorgados por sus Roles

- **Decision**: Se agrega una tabla `MembershipPermission` (membershipId, permission,
  grantedByUserId, createdAt) para representar permisos otorgados directamente a una
  Membership, por encima de los que le dan sus Roles — exactamente lo que dice la
  sección "Otros supuestos" de spec.md ("Los permisos personalizados... se implementan
  como Permissions adicionales otorgados directamente a un User por encima de sus
  Roles, no como un Role nuevo por cada combinación"). Los permisos efectivos pasan a
  ser: permisos del rol base ∪ permisos de cada `RoleAssignment` ∪ `MembershipPermission`
  directos.
- **Rationale**: Es un requisito explícito (no una interpretación) documentado en las
  Assumptions de spec.md, y es la única forma de que el Acceptance Scenario 2 de US2
  ("Given un User con un permiso personalizado adicional a sus roles... ese permiso
  adicional aparece reflejado") sea verificable — sin esta tabla, "permiso adicional"
  no tendría dónde persistirse fuera de un Role.
- **Alternatives considered**: Modelar cada combinación de permisos extra como un Role
  personalizado de un solo uso (rechazada explícitamente por la propia Assumption de
  spec.md, que dice "no como un Role nuevo por cada combinación").

## 7. Retro-adopción parcial de `PermissionsGuard` sobre código ya existente

- **Decision**: Los endpoints de administración de ciclo de vida de Users
  (`POST/DELETE /organizations/:id/members/:userId/...`, spec 006) se migran de su
  chequeo hardcodeado (`actorRole in ['Propietario', 'Administrador']`) a
  `@RequirePermission('user.manage')`, ya que el rol por defecto Administrador incluye
  ese permiso — el comportamiento observable no cambia (mismos tests de spec 006 deben
  seguir pasando sin modificarse) y sirve como demostración end-to-end real del
  sistema. El resto de los chequeos de rol de `OrganizationsController` (spec 005:
  actualizar organización, branding, impuestos, módulos, plan, invitaciones) **no** se
  tocan en esta spec — quedan como una migración opcional futura, fuera de alcance
  acá.
- **Rationale**: Retro-adoptar *todo* el código de specs 005/006 sería una reescritura
  grande sin un requisito funcional que la exija (ver research.md #1). Retro-adoptar
  *un* endpoint representativo prueba que `PermissionsGuard` funciona de punta a punta
  contra código real (no solo contra los endpoints nuevos de esta spec, que podrían
  "funcionar" solo porque los escribió la misma persona que escribió el guard) y deja
  un ejemplo claro para que specs futuras (008 en adelante) lo usen desde el día uno.
- **Alternatives considered**: No retro-adoptar ningún endpoint existente (rechazada:
  dejaría `PermissionsGuard` sin ninguna prueba de integración real fuera de los
  endpoints de `roles` mismos, más débil como demostración); retro-adoptar todos los
  endpoints de `OrganizationsController` también (rechazada por alcance — no lo pide
  ningún FR de esta spec, y multiplica el riesgo de regresión sobre código estable).
