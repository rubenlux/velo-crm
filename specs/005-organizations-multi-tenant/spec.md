# Feature Specification: Organizations (Multi-Tenant)

**Feature Branch**: `005-organizations-multi-tenant`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-005 — Organizations (Multi-Tenant). Permitir que múltiples empresas utilicen VELO de forma completamente aislada, cada una como un Tenant independiente: crear/editar/suspender/reactivar organización, el creador se convierte en Propietario automáticamente, invitar usuarios, configurar branding/moneda/impuestos/módulos habilitados/plan, con aislamiento estricto de datos entre organizaciones y auditoría de creación, actualización, suspensión, cambio de plan e invitaciones."

**Nota de terminología**: Esta especificación posee la entidad `Organization` dentro del
bounded context **Organization** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md)),
incluyendo su ciclo de vida y configuración (`Settings`, `Plan`). Formaliza una
precondición que ya asumían como dada [specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md)
(FR-001: "crear una Organization como contenedor aislado") y
[specs/004-authentication-identity/spec.md](../004-authentication-identity/spec.md)
(FR-017: acceso solo a Organizations con Membership activa). Esta feature no redefine
cómo se autentica un User (004) ni cómo se le asigna un Role dentro de una Organization
vía Membership (004/001 US4); solo define la creación, configuración y ciclo de vida de
la propia Organization, y el rol especial **Propietario** que reciben automáticamente sus
creadores.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y configurar una organización (Priority: P1)

Como persona que quiere empezar a usar VELO para su empresa, quiero crear una nueva
Organization con sus datos básicos, para tener un espacio propio y aislado donde
gestionar mi negocio.

**Why this priority**: Es el punto de entrada de todo el sistema: ninguna otra feature
(CRM, Auth, Facturación) tiene sentido sin que exista al menos una Organization.

**Independent Test**: Puede probarse creando una Organization con nombre, zona horaria,
moneda e idioma, y verificando que su creador queda automáticamente con rol Propietario, sin
depender de invitaciones, branding ni cambios de plan.

**Acceptance Scenarios**:

1. **Given** un User autenticado sin Organization propia, **When** crea una nueva
   Organization indicando nombre, zona horaria, moneda e idioma, **Then** la Organization
   queda creada y ese User recibe automáticamente una Membership con rol Propietario.
2. **Given** una Organization recién creada, **When** se consulta su configuración,
   **Then** incluye los valores por defecto de zona horaria, moneda, idioma y plan
   asignados en la creación.
3. **Given** un Propietario, **When** edita el nombre, zona horaria, moneda o idioma de su
   Organization, **Then** los cambios se reflejan de inmediato para todos los Users con
   Membership en ella.
4. **Given** dos Organizations distintas, **When** se compara su configuración y datos,
   **Then** ninguna operación sobre una Organization puede leer ni modificar datos de la
   otra.

---

### User Story 2 - Configurar branding, moneda, impuestos y módulos habilitados (Priority: P2)

Como Propietario de una Organization, quiero personalizar su branding (logo, dominio) y
configurar moneda, impuestos y qué módulos de VELO están habilitados, para adaptar la
plataforma a la identidad y necesidades de mi empresa.

**Why this priority**: Aporta valor una vez que la Organization ya existe (US1); no es
necesaria para que el sistema funcione en su forma más básica.

**Independent Test**: Puede probarse, sobre una Organization ya creada, subiendo un logo,
configurando un dominio, ajustando impuestos y habilitando/deshabilitando un módulo, y
verificando que esos cambios se reflejan en la configuración de esa Organization
únicamente.

**Acceptance Scenarios**:

1. **Given** una Organization existente, **When** el Propietario configura su logo y dominio,
   **Then** esa identidad visual se aplica a todas las vistas de esa Organization.
2. **Given** una Organization existente, **When** el Propietario configura sus impuestos
   aplicables, **Then** esa configuración queda disponible para los módulos que la
   requieran (por ejemplo, Facturación en fases futuras).
3. **Given** una Organization con varios módulos disponibles según su plan, **When** el
   Propietario habilita o deshabilita un módulo, **Then** los Users de esa Organization ven
   reflejado ese cambio en la disponibilidad del módulo correspondiente.

---

### User Story 3 - Invitar usuarios a la organización (Priority: P3)

Como Propietario de una Organization, quiero invitar a otras personas de mi equipo, para que
puedan colaborar dentro de mi Organization con el rol que yo les asigne.

**Why this priority**: Extiende el valor de la Organization a un equipo, pero una
Organization de un solo Propietario ya es utilizable (US1/US2).

**Independent Test**: Puede probarse invitando un email a una Organization existente y
verificando que, tras aceptar la invitación, esa persona obtiene una Membership en esa
Organization exclusivamente.

**Acceptance Scenarios**:

1. **Given** una Organization con cupos disponibles según su plan, **When** el Propietario
   invita a un nuevo email, **Then** se dispara el flujo de invitación/autenticación
   (ver [specs/004-authentication-identity/spec.md](../004-authentication-identity/spec.md))
   y, al aceptarse, se crea una Membership en esa Organization.
2. **Given** una Organization que alcanzó el límite de usuarios de su plan, **When** el
   Propietario intenta invitar a un usuario adicional, **Then** el sistema rechaza la
   invitación e indica que debe aumentar su plan.
3. **Given** una invitación pendiente, **When** el Propietario la cancela antes de que sea
   aceptada, **Then** el enlace de invitación deja de ser válido.

---

### User Story 4 - Cambiar de plan (Priority: P4)

Como Propietario de una Organization, quiero cambiar el plan contratado, para ajustar los
límites y módulos disponibles a medida que crece o cambian las necesidades de mi
empresa.

**Why this priority**: Es relevante una vez que la Organization ya opera con un plan
inicial (US1); no bloquea el uso básico de la plataforma.

**Independent Test**: Puede probarse cambiando el plan de una Organization existente y
verificando que sus límites (usuarios, módulos habilitados) se actualizan en
consecuencia.

**Acceptance Scenarios**:

1. **Given** una Organization en un plan determinado, **When** el Propietario cambia a un plan
   superior, **Then** los nuevos límites y módulos quedan disponibles de inmediato.
2. **Given** una Organization en un plan superior con módulos o usuarios que exceden los
   límites de un plan inferior, **When** el Propietario intenta bajar de plan, **Then** el
   sistema le advierte qué debe ajustar (usuarios o módulos) antes de completar el
   cambio.
3. **Given** un cambio de plan completado, **When** se consulta el historial de la
   Organization, **Then** el cambio de plan queda registrado en el Audit Log con fecha y
   responsable.

---

### User Story 5 - Suspender y reactivar una organización (Priority: P5)

Como administrador de la plataforma VELO, quiero poder suspender y reactivar una
Organization, para gestionar casos de incumplimiento de pago o solicitudes del propio
cliente sin eliminar sus datos.

**Why this priority**: Es una operación administrativa poco frecuente sobre
Organizations que ya llevan tiempo operando; no es necesaria para el uso diario del
producto.

**Independent Test**: Puede probarse suspendiendo una Organization existente,
verificando que sus Users no pueden operar en ella, y luego reactivándola para confirmar
que recupera el acceso normal con sus datos intactos.

**Acceptance Scenarios**:

1. **Given** una Organization activa, **When** se suspende, **Then** ningún User puede
   seguir operando dentro de ella, aunque sus datos permanecen intactos.
2. **Given** una Organization suspendida, **When** un User con Membership en ella intenta
   acceder, **Then** el sistema le informa que la Organization está suspendida en lugar
   de mostrarle sus datos.
3. **Given** una Organization suspendida, **When** se reactiva, **Then** sus Users
   recuperan el acceso normal a todos los datos previos.
4. **Given** cualquier suspensión, reactivación o cambio de plan, **When** ocurre,
   **Then** queda registrado en el Audit Log de la Organization.

---

### Edge Cases

- ¿Qué pasa si el único Propietario de una Organization quiere abandonarla? El sistema MUST
  exigir transferir el rol Propietario a otro Membership existente antes de permitirlo, en
  línea con la regla ya definida en spec 001 (una Organization nunca queda sin
  administrador).
- ¿Qué ocurre si dos Organizations intentan registrar el mismo dominio personalizado? El
  sistema MUST rechazar el dominio duplicado y solicitar uno distinto.
- ¿Cómo se comporta el sistema si se deshabilita un módulo que tiene datos activos (por
  ejemplo, Oportunidades abiertas en CRM)? El sistema MUST conservar los datos existentes
  en modo de solo lectura y advertir antes de deshabilitar el módulo.
- ¿Qué sucede si se intenta invitar a un usuario ya invitado con una invitación pendiente?
  El sistema MUST reutilizar/reenviar la invitación existente en lugar de crear una
  duplicada.
- ¿Qué pasa con las sesiones activas de los Users de una Organization que se suspende?
  El sistema MUST invalidar el acceso a los datos de esa Organization de inmediato, sin
  necesidad de que cada User cierre sesión manualmente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear una nueva Organization con al menos nombre,
  zona horaria, moneda e idioma.
- **FR-002**: El sistema MUST asignar automáticamente el rol Propietario al User que crea una
  Organization.
- **FR-003**: El sistema MUST permitir invitar Users a una Organization respetando los
  límites de usuarios de su plan vigente, delegando la mecánica de autenticación/
  aceptación al flujo definido en [specs/004-authentication-identity/spec.md](../004-authentication-identity/spec.md).
- **FR-004**: El sistema MUST permitir configurar el branding de una Organization (al
  menos logo y dominio personalizado).
- **FR-005**: El sistema MUST permitir configurar la moneda de una Organization.
- **FR-006**: El sistema MUST permitir configurar los impuestos aplicables de una
  Organization.
- **FR-007**: El sistema MUST permitir habilitar y deshabilitar módulos disponibles para
  una Organization según su plan.
- **FR-008**: El sistema MUST permitir suspender una Organization, bloqueando el acceso
  de todos sus Users sin eliminar sus datos.
- **FR-009**: El sistema MUST permitir reactivar una Organization suspendida,
  restaurando el acceso normal a sus datos.
- **FR-010**: El sistema MUST permitir cambiar el plan de una Organization, actualizando
  en consecuencia los límites de usuarios y módulos disponibles.
- **FR-011**: El sistema MUST garantizar que ningún dato de una Organization sea
  accesible ni modificable desde otra Organization, en cualquier operación del sistema.
- **FR-012**: El sistema MUST impedir que una Organization quede sin ningún Membership
  con rol Propietario.
- **FR-013**: El sistema MUST registrar en el Audit Log la creación, actualización,
  suspensión, reactivación, cambio de plan e invitaciones de cada Organization,
  incluyendo quién y cuándo realizó la acción.
- **FR-014**: El sistema MUST rechazar dominios personalizados duplicados entre
  Organizations.

### Key Entities

- **Organization**: Empresa que usa VELO; contenedor aislado (tenant) de todos sus datos
  (ver [Domain Model](../../docs/domain-model.md)); posee nombre, logo, dominio, zona
  horaria, moneda, idioma, plan y configuración (Settings).
- **Propietario**: Rol especial de Membership asignado automáticamente al creador de una
  Organization; una Organization siempre tiene al menos un Propietario.
- **Plan**: Nivel contratado por una Organization; determina límites (usuarios) y módulos
  habilitables.
- **Settings**: Configuración propia de una Organization (branding, moneda, impuestos,
  módulos habilitados).
- **Membership**: Relación User–Organization con un Role (ver
  [specs/004-authentication-identity/spec.md](../004-authentication-identity/spec.md));
  esta feature es responsable de crear la primera Membership (Propietario) al crear la
  Organization.
- **Audit Log**: Registro inmutable de eventos del ciclo de vida de la Organization
  (creación, actualización, suspensión, reactivación, cambio de plan, invitaciones).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona nueva puede crear su Organization y quedar operando dentro de
  ella (como Propietario) en menos de 2 minutos.
- **SC-002**: El sistema soporta al menos 100 Organizations activas simultáneamente sin
  que ninguna vea datos de otra, verificable mediante pruebas de aislamiento.
- **SC-003**: El 100% de los cambios de configuración de una Organization (branding,
  moneda, impuestos, módulos, plan) quedan reflejados para sus Users en menos de
  5 segundos.
- **SC-004**: El 100% de las acciones de creación, suspensión, reactivación, cambio de
  plan e invitación quedan registradas en el Audit Log, verificable mediante consulta
  del log.
- **SC-005**: Una Organization suspendida bloquea el acceso a sus datos para el 100% de
  sus Users en menos de 5 segundos desde la suspensión.
- **SC-006**: Un intento de invitar más usuarios de los permitidos por el plan es
  rechazado el 100% de las veces, con un mensaje claro sobre el límite alcanzado.

## Assumptions

- Un User puede crear y ser Propietario de más de una Organization; cada Organization mantiene
  su configuración y datos completamente separados.
- El catálogo de planes (nombres, límites de usuarios, módulos incluidos) se define como
  configuración de negocio y no forma parte del alcance de esta especificación; esta
  feature solo define el comportamiento de cambiar entre planes existentes.
- La suspensión de una Organization es una acción administrativa de la plataforma (no
  disponible para el Propietario sobre su propia Organization), reservada a casos de
  incumplimiento de pago o soporte; el Propietario sí puede solicitar la baja, pero la
  ejecución de la suspensión queda fuera del alcance de esta fase para el propio Propietario.
- Los módulos habilitables en esta fase corresponden a las fases del roadmap ya
  definidas en [docs/product-vision.md](../../docs/product-vision.md) (CRM, Agenda,
  Facturación, Inventario, RRHH, Automatizaciones); esta especificación solo define el
  mecanismo de habilitación, no el contenido de cada módulo.
- La configuración de impuestos en esta fase almacena las tasas/reglas aplicables de la
  Organization como datos de referencia; su uso efectivo en cálculos corresponde a la
  fase de Facturación.
