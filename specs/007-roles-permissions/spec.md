# Feature Specification: Roles & Permissions (RBAC)

**Feature Branch**: `007-roles-permissions`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-007 — Roles & Permissions. Sistema RBAC (Role-Based Access Control) para controlar el acceso a todos los recursos de VELO: roles por defecto (Propietario, Administrador, Gerente, Ventas, Soporte, Contabilidad, Inventario, RRHH, Lector), permisos en formato recurso.acción, asignación de roles/permisos, herencia de permisos, permisos por organización, roles y permisos personalizados, visualización de permisos efectivos, con la regla de que ninguna acción se ejecuta sin autorización, los permisos se aplican de inmediato, no existe escalamiento de privilegios y toda acción queda auditada."

**Nota de terminología**: Esta especificación posee las entidades `Role` y `Permission`
del bounded context **Identity** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)),
y formaliza el catálogo de Roles por defecto de toda la plataforma. Las specs
001, 005 y 006 usaron nombres de Role simplificados antes de que existiera este catálogo
formal (ver "Reconciliación de catálogo de Roles" en Assumptions); a partir de esta
spec, el catálogo canónico de Roles por defecto es el definido acá. Esta feature no
redefine `Membership` (ver [specs/005-organizations-multi-tenant/spec.md](../005-organizations-multi-tenant/spec.md))
ni el estado de ciclo de vida del `User` (ver [specs/006-users/spec.md](../006-users/spec.md));
consume ambos para determinar y aplicar permisos efectivos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Asignar roles y ver el efecto inmediato en los permisos (Priority: P1)

Como Administrador de una Organization, quiero asignar uno o más roles a un User dentro
de mi Organization, para controlar de inmediato qué puede hacer dentro de la
plataforma.

**Why this priority**: Es el valor central del RBAC: sin poder asignar roles y ver que
los permisos se aplican, ninguna otra capacidad (roles personalizados, permisos por
organización, vista de permisos efectivos) tiene sentido.

**Independent Test**: Puede probarse asignando el rol "Ventas" a un User, verificando que
puede leer/crear Leads y Opportunities pero no puede, por ejemplo, eliminar Users, y que
al quitarle ese rol pierde esos permisos de inmediato.

**Acceptance Scenarios**:

1. **Given** un User con una Membership en una Organization, **When** el Administrador le
   asigna el rol "Ventas", **Then** el User puede ejecutar de inmediato las acciones
   permitidas por ese rol (por ejemplo, `lead.create`, `opportunity.update`).
2. **Given** un User con un rol asignado, **When** el Administrador le asigna un segundo
   rol, **Then** el User obtiene la unión (acumulación) de los permisos de ambos roles.
3. **Given** un User con un rol asignado, **When** el Administrador le revoca ese rol,
   **Then** el User pierde de inmediato las acciones que solo ese rol permitía.
4. **Given** un User sin el permiso requerido para una acción, **When** intenta
   ejecutarla (incluso manipulando la solicitud directamente), **Then** el sistema la
   deniega y la registra en el Audit Log.

---

### User Story 2 - Ver mis permisos efectivos (Priority: P2)

Como User de VELO, quiero ver qué acciones puedo realizar según mis roles asignados,
para entender de antemano qué puedo y qué no puedo hacer en la plataforma.

**Why this priority**: Reduce fricción y tickets de soporte una vez que ya existe
asignación de roles (US1); no bloquea el funcionamiento del control de acceso en sí.

**Independent Test**: Puede probarse consultando, para un User con un rol conocido, la
lista de permisos efectivos y verificando que coincide exactamente con los permisos de
ese rol (más cualquier permiso personalizado adicional).

**Acceptance Scenarios**:

1. **Given** un User con uno o más roles asignados, **When** consulta sus permisos
   efectivos, **Then** ve la lista completa y acumulada de acciones permitidas
   (`recurso.acción`).
2. **Given** un User con un permiso personalizado adicional a sus roles, **When**
   consulta sus permisos efectivos, **Then** ese permiso adicional aparece reflejado.
3. **Given** un Administrador, **When** consulta los permisos efectivos de otro User de
   su Organization, **Then** puede verlos para fines de soporte/auditoría.

---

### User Story 3 - Crear y editar roles personalizados (Priority: P3)

Como Administrador de una Organization, quiero crear y editar roles personalizados con
un conjunto específico de permisos, para adaptar el control de acceso a la estructura
particular de mi empresa cuando los roles por defecto no alcanzan.

**Why this priority**: Aporta flexibilidad sobre un sistema RBAC ya funcional con los
roles por defecto (US1/US2); una Organization pequeña puede operar solo con los roles
por defecto sin necesitar esta historia.

**Independent Test**: Puede probarse creando un rol personalizado con un subconjunto de
permisos, asignándolo a un User, y verificando que ese User solo puede ejecutar
exactamente esas acciones.

**Acceptance Scenarios**:

1. **Given** una Organization, **When** el Administrador crea un rol personalizado
   eligiendo permisos específicos, **Then** ese rol queda disponible para asignar solo
   dentro de esa Organization.
2. **Given** un rol personalizado existente, **When** el Administrador le agrega o quita
   permisos, **Then** todos los Users que tienen ese rol ven reflejado el cambio de
   inmediato.
3. **Given** un rol personalizado sin Users asignados, **When** el Administrador lo
   elimina, **Then** el rol deja de estar disponible para asignar.
4. **Given** un rol personalizado con Users asignados, **When** el Administrador intenta
   eliminarlo, **Then** el sistema exige primero reasignar o quitar ese rol de esos Users.
5. **Given** un rol por defecto (Propietario, Administrador, etc.), **When** un Administrador
   intenta eliminarlo, **Then** el sistema lo impide: solo los roles personalizados se
   pueden eliminar.

---

### User Story 4 - Configurar permisos habilitados por Organization (Priority: P4)

Como Administrador de una Organization, quiero que los permisos disponibles para
asignar reflejen los módulos habilitados y el plan de mi Organization, para no exponer
permisos de funcionalidad que mi empresa no tiene contratada.

**Why this priority**: Es un refinamiento sobre un RBAC ya funcional (US1-US3);
depende de que existan módulos/planes configurables (ver spec 005) pero no bloquea el
uso básico de roles y permisos.

**Independent Test**: Puede probarse deshabilitando un módulo (por ejemplo, Inventario)
en una Organization y verificando que los permisos de ese módulo (`inventory.*`) dejan
de estar disponibles para asignar en roles nuevos o personalizados.

**Acceptance Scenarios**:

1. **Given** una Organization con un módulo deshabilitado, **When** el Administrador
   intenta asignar un permiso de ese módulo a un rol, **Then** el sistema no lo ofrece
   como opción disponible.
2. **Given** una Organization que habilita un módulo previamente deshabilitado,
   **When** el Administrador configura roles, **Then** los permisos de ese módulo pasan a
   estar disponibles.

---

### Edge Cases

- ¿Qué pasa si se intenta asignar el rol Propietario a más de un User en la misma
  Organization? El sistema MUST permitirlo (puede haber más de un Propietario), pero MUST
  seguir garantizando que la Organization nunca quede con cero Propietarios (regla ya definida
  en spec 005).
- ¿Cómo se comporta el sistema ante un intento de auto-asignación de un rol con más
  privilegios que los propios (escalamiento de privilegios)? El sistema MUST impedirlo:
  ningún User puede asignarse a sí mismo un rol con permisos que no puede otorgar a
  otros.
- ¿Qué pasa si dos roles asignados a un mismo User definen permisos contradictorios
  (por ejemplo, uno otorga y otro no menciona una acción)? El sistema MUST aplicar la
  unión de permisos (acumulativo): si algún rol otorga el permiso, el User lo tiene.
- ¿Qué ocurre si se revoca un permiso mientras un User tiene una operación en curso que
  lo requiere? El sistema MUST validar la autorización en cada acción individual, no
  solo al iniciar sesión, de forma que la revocación tenga efecto inmediato.
- ¿Qué pasa si un rol personalizado hereda de un rol por defecto y luego ese rol por
  defecto cambia? El sistema MUST reflejar el cambio heredado, salvo en los permisos que
  el rol personalizado sobreescribe explícitamente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST proveer un catálogo de roles por defecto por Organization:
  Propietario, Administrador, Gerente, Ventas, Soporte, Contabilidad, Inventario, RRHH, Lector.
- **FR-002**: El sistema MUST representar cada Permission en formato `recurso.acción`
  (por ejemplo `customer.read`, `invoice.create`).
- **FR-003**: El sistema MUST permitir asignar y revocar uno o más Roles a un User
  dentro de una Organization, aplicando el cambio de inmediato.
- **FR-004**: El sistema MUST acumular los permisos cuando un User tiene más de un Role
  asignado (unión, no intersección).
- **FR-005**: El sistema MUST otorgar a un User con Role Propietario acceso total dentro de su
  Organization.
- **FR-006**: El sistema MUST permitir crear, editar y eliminar roles personalizados por
  Organization, cada uno con su propio conjunto de Permissions.
- **FR-007**: El sistema MUST impedir eliminar un rol por defecto; solo los roles
  personalizados pueden eliminarse.
- **FR-008**: El sistema MUST impedir eliminar un rol personalizado mientras tenga Users
  asignados.
- **FR-009**: El sistema MUST soportar herencia de permisos entre roles (un rol
  personalizado puede partir de un rol por defecto y sobreescribir u agregar permisos
  específicos).
- **FR-010**: El sistema MUST permitir que los Permissions disponibles para asignar en
  una Organization reflejen los módulos habilitados en su plan (ver spec 005).
- **FR-011**: El sistema MUST permitir consultar los permisos efectivos (acumulados) de
  cualquier User dentro de una Organization.
- **FR-012**: El sistema MUST validar la autorización de cada acción individual en el
  momento de ejecutarla, sin depender únicamente de una validación al iniciar sesión.
- **FR-013**: El sistema MUST impedir que un User asigne a otro (o a sí mismo) un Role o
  Permission que él mismo no posee (sin escalamiento de privilegios).
- **FR-014**: El sistema MUST registrar en el Audit Log la creación, modificación y
  eliminación de roles, y la asignación/revocación de roles a Users.

### Key Entities

- **Role**: Agrupa Permissions dentro de una Organization (ver
  [Domain Model](../../docs/domain-model.md)); puede ser uno de los roles por defecto
  (Propietario, Administrador, Gerente, Ventas, Soporte, Contabilidad, Inventario, RRHH, Lector) o un
  rol personalizado creado por un Administrador.
- **Permission**: Acción autorizada sobre un recurso, en formato `recurso.acción` (ver
  ejemplos en el Input de esta spec).
- **RoleAssignment**: Relación entre un User y uno o más Roles dentro de una
  Organization; se apoya en `Membership` (ver
  [specs/005-organizations-multi-tenant/spec.md](../005-organizations-multi-tenant/spec.md))
  pero permite más de un Role por Membership.
- **Membership**: Ya definida en spec 005; esta feature la consume como el contexto
  (User + Organization) sobre el cual se asignan Roles.
- **Audit Log**: Registro inmutable de creación/modificación/eliminación de roles y de
  asignación/revocación de Roles a Users.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cambio de Role o Permission se refleja en las acciones disponibles de
  un User en menos de 3 segundos.
- **SC-002**: El 100% de los intentos de acción sin el Permission requerido son
  denegados y quedan registrados en el Audit Log.
- **SC-003**: El 100% de los intentos de escalamiento de privilegios (auto-asignación de
  permisos no poseídos) son rechazados.
- **SC-004**: Un Administrador puede consultar los permisos efectivos de cualquier User
  de su Organization en menos de 2 segundos.
- **SC-005**: El 100% de los cambios de roles/permisos (creación, edición, eliminación,
  asignación, revocación) quedan registrados en el Audit Log, verificable mediante
  consulta del log.

## Assumptions

### Reconciliación de catálogo de Roles

- Spec 001 (CRM Fase 1) mencionó los roles "Administrador, Gerente, Ventas" antes de que
  existiera este catálogo formal. A partir de esta spec, el catálogo canónico de Roles
  por defecto es el de FR-001 (Propietario, Administrador, Gerente, Ventas, Soporte, Contabilidad,
  Inventario, RRHH, Lector); para el alcance de spec 001 (CRM), los roles relevantes son
  Propietario, Administrador, Gerente y Ventas — Soporte, Contabilidad, Inventario y RRHH quedan
  disponibles en el catálogo pero sin permisos de módulos que aún no existen (Facturación,
  Inventario, RRHH).
- Spec 005 ya usa "Propietario" como rol especial asignado automáticamente al creador de una
  Organization; esta spec no lo redefine, solo lo incorpora al catálogo general de Roles.
- El rol "Lector" (nuevo en esta spec) es de solo lectura sobre los recursos habilitados
  de la Organization; se agrega al catálogo por defecto pero no estaba mencionado en
  specs anteriores.

### Otros supuestos

- Los permisos personalizados (RF-007 del input) se implementan como Permissions
  adicionales otorgados directamente a un User por encima de sus Roles, no como un Role
  nuevo por cada combinación.
- La validación de autorización ocurre siempre del lado del sistema (nunca confiando
  únicamente en el cliente), sin que esta spec prescriba una tecnología concreta para
  ello (eso corresponde al plan técnico).
- Los permisos de un módulo deshabilitado (FR-010) se ocultan para asignar en roles
  nuevos, pero un Role que ya los tenía asignados los conserva de forma inactiva hasta
  que el módulo se reactive (no se eliminan permisos silenciosamente).
