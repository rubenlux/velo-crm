# Feature Specification: Users

**Feature Branch**: `006-users`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-006 — Users. Administrar las personas que utilizan VELO: perfil (nombre, apellido, email, avatar, idioma, zona horaria), preferencias, estados del ciclo de vida (Pending, Active, Inactive, Suspended, Deleted), crear/editar/desactivar/reactivar/eliminar (soft delete) usuarios, ver historial de accesos y organizaciones asociadas, cambiar entre organizaciones autorizadas con permisos que se actualizan automáticamente, y auditoría completa de creación, modificación, eliminación lógica, cambio de rol, cambio de email y último acceso."

**Nota de terminología**: Esta especificación extiende la entidad `User` del bounded
context **Identity** (ver [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md))
con sus atributos de **perfil y ciclo de vida** (nombre, avatar, idioma, zona horaria,
estado). No redefine autenticación ni sesiones — eso pertenece a
[specs/004-authentication-identity/spec.md](../004-authentication-identity/spec.md) — ni
la creación/configuración de `Organization` — eso pertenece a
[specs/005-organizations-multi-tenant/spec.md](../005-organizations-multi-tenant/spec.md).
Esta feature es responsable de: los datos de perfil del `User`, su estado
(`UserStatus`), la administración del ciclo de vida de Users dentro de una Organization,
y la experiencia de cambiar de Organization activa a través de las Memberships
existentes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar mi perfil y preferencias (Priority: P1)

Como User de VELO, quiero editar mi nombre, apellido, avatar, idioma y zona horaria, y
configurar mis preferencias, para que la plataforma se vea y comporte como yo la
necesito.

**Why this priority**: Es la funcionalidad más básica y usada por el 100% de los Users;
sin ella el perfil queda con los datos mínimos del registro (email) para siempre.

**Independent Test**: Puede probarse editando el nombre, avatar e idioma de un User
existente y verificando que los cambios persisten y se reflejan de inmediato, sin
depender de otras historias.

**Acceptance Scenarios**:

1. **Given** un User autenticado, **When** edita su nombre, apellido y avatar,
   **Then** los cambios quedan guardados y visibles en su perfil.
2. **Given** un User autenticado, **When** cambia su idioma o zona horaria,
   **Then** la interfaz y los horarios mostrados usan esa configuración de inmediato.
3. **Given** un User autenticado, **When** ajusta sus preferencias (por ejemplo,
   notificaciones), **Then** esas preferencias se respetan en el resto de la plataforma.
4. **Given** un cambio de perfil, **When** ocurre, **Then** queda registrado en el Audit
   Log con el campo modificado, el valor anterior y el nuevo (FR de auditoría).

---

### User Story 2 - Cambiar entre mis organizaciones (Priority: P2)

Como User que pertenece a varias Organizations, quiero cambiar fácilmente entre ellas,
para operar en el contexto correcto sin tener que cerrar sesión y volver a entrar.

**Why this priority**: Es el segundo comportamiento más frecuente para Users que
colaboran con más de una empresa; sin él, un User multi-organización quedaría atado a
una sola Membership por sesión.

**Independent Test**: Con un User que tiene Membership en dos Organizations distintas
(con Roles distintos en cada una), puede probarse cambiar la Organization activa y
verificar que los permisos disponibles cambian de acuerdo al Role de esa Membership.

**Acceptance Scenarios**:

1. **Given** un User con Membership en dos o más Organizations, **When** consulta la
   lista de organizaciones asociadas, **Then** ve todas las Organizations donde tiene una
   Membership activa.
2. **Given** un User con la Organization A como contexto activo, **When** cambia a la
   Organization B, **Then** las acciones disponibles reflejan el Role que tiene en B, no
   el que tenía en A.
3. **Given** un User sin Membership en una Organization, **When** intenta cambiar a ella,
   **Then** el sistema deniega el cambio.

---

### User Story 3 - Administrar el ciclo de vida de Users de mi Organization (Priority: P3)

Como Administrador de una Organization, quiero crear, desactivar, reactivar y eliminar
(soft delete) Users, para mantener actualizado quién tiene acceso a mi empresa a lo
largo del tiempo.

**Why this priority**: Extiende el valor de US1/US2 con control administrativo; una
Organization pequeña puede operar un tiempo solo con el flujo de invitación de
Membership (spec 005) antes de necesitar esta gestión más fina.

**Independent Test**: Puede probarse creando un User, desactivándolo, verificando que
pierde acceso, reactivándolo, y finalmente eliminándolo (soft delete), verificando en
cada paso el estado (`UserStatus`) y que el historial no se pierde.

**Acceptance Scenarios**:

1. **Given** un Administrador de una Organization, **When** desactiva a un User
   (`Active → Inactive`), **Then** ese User pierde acceso a esa Organization de
   inmediato, sin perder su historial.
2. **Given** un User `Inactive`, **When** el Administrador lo reactiva
   (`Inactive → Active`), **Then** recupera el acceso con su Role y datos previos
   intactos.
3. **Given** un User que un Administrador decide eliminar, **When** confirma la
   eliminación, **Then** el User pasa a `Deleted` (soft delete): deja de poder acceder,
   pero sus datos históricos y de auditoría permanecen íntegros.
4. **Given** el único Administrador con Role Propietario/Administrador de una Organization,
   **When** se intenta desactivar o eliminar a ese User, **Then** el sistema lo impide
   (regla ya definida en spec 001/005: una Organization nunca queda sin administrador).

---

### User Story 4 - Ver mi historial de accesos (Priority: P4)

Como User de VELO, quiero ver el historial de mis accesos recientes, para confirmar que
solo yo (o dispositivos que reconozco) accedieron a mi cuenta.

**Why this priority**: Es una capa de transparencia y confianza adicional sobre un
perfil ya editable (US1) y funcional entre organizaciones (US2); no bloquea el uso
diario de la plataforma.

**Independent Test**: Puede probarse iniciando sesión un par de veces (vía
[specs/004-authentication-identity/spec.md](../004-authentication-identity/spec.md)) y
verificando que el historial de accesos del User refleja esos eventos con fecha.

**Acceptance Scenarios**:

1. **Given** un User con inicios de sesión previos, **When** consulta su historial de
   accesos, **Then** ve la fecha del último acceso y los accesos recientes.
2. **Given** un User, **When** consulta su historial de accesos, **Then** el sistema
   muestra únicamente sus propios accesos, nunca los de otro User.

---

### Edge Cases

- ¿Qué pasa si se intenta reactivar un User en estado `Deleted`? El sistema MUST
  impedirlo: `Deleted` es un estado terminal; solo se puede crear un User nuevo con ese
  email si la regla de unicidad de email lo permite (ver Assumptions).
- ¿Qué ocurre si un User es eliminado (soft delete) pero tiene Memberships en varias
  Organizations? El sistema MUST revocar el acceso en todas ellas y conservar la
  trazabilidad histórica en cada una (regla: "un usuario nunca pierde la trazabilidad
  histórica").
- ¿Qué pasa si dos Administradores editan el estado del mismo User al mismo tiempo (uno
  desactiva mientras otro reactiva)? El sistema MUST aplicar el último cambio de forma
  consistente y registrar ambos intentos en el Audit Log.
- ¿Qué sucede si un User cambia su email? El sistema MUST re-disparar el flujo de
  verificación de email (spec 004) y registrar el cambio de email en el Audit Log,
  conservando el email anterior en el historial.
- ¿Qué pasa si un User suspendido (`Suspended`) intenta iniciar sesión? El login (spec
  004) MUST completarse a nivel de credenciales, pero el acceso a datos de cualquier
  Organization MUST denegarse mientras el estado sea `Suspended`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear un User con nombre, apellido y email
  (reutilizando o extendiendo el flujo de invitación de
  [specs/005-organizations-multi-tenant/spec.md](../005-organizations-multi-tenant/spec.md)
  y de autenticación de spec 004).
- **FR-002**: El sistema MUST permitir a un User editar su propio perfil: nombre,
  apellido, avatar, idioma y zona horaria.
- **FR-003**: El sistema MUST permitir a un User configurar sus preferencias (por
  ejemplo, notificaciones).
- **FR-004**: El sistema MUST modelar el estado de un User como una de: `Pending`,
  `Active`, `Inactive`, `Suspended`, `Deleted`.
- **FR-005**: El sistema MUST permitir a un Administrador desactivar
  (`Active → Inactive`) y reactivar (`Inactive → Active`) un User dentro de su
  Organization.
- **FR-006**: El sistema MUST permitir a un Administrador eliminar (soft delete,
  `→ Deleted`) un User, sin destruir su historial ni sus registros de auditoría.
- **FR-007**: El sistema MUST impedir que un User en estado `Deleted` sea reactivado.
- **FR-008**: El sistema MUST impedir que se desactive o elimine al único User con Role
  de administrador de una Organization.
- **FR-009**: El sistema MUST permitir a un User consultar las Organizations donde tiene
  una Membership activa.
- **FR-010**: El sistema MUST permitir a un User cambiar su Organization activa entre
  aquellas donde tiene Membership, actualizando sus permisos disponibles según el Role de
  la Membership correspondiente.
- **FR-011**: El sistema MUST permitir a un User consultar su propio historial de
  accesos (fecha de último acceso y accesos recientes).
- **FR-012**: El sistema MUST denegar el acceso a datos de cualquier Organization para un
  User en estado `Suspended`, `Inactive` o `Deleted`, incluso si sus credenciales de
  login siguen siendo válidas.
- **FR-013**: El sistema MUST registrar en el Audit Log: creación, modificación de
  perfil, cambio de estado, cambio de rol, cambio de email y cada acceso relevante,
  incluyendo quién y cuándo.
- **FR-014**: El sistema MUST garantizar que el email de un User sea único a nivel de
  toda la plataforma (no solo por Organization).

### Key Entities

- **User**: Persona con acceso a VELO (ver [Domain Model](../../docs/domain-model.md) y
  [specs/004-authentication-identity/spec.md](../004-authentication-identity/spec.md)
  para sus atributos de autenticación); esta feature agrega perfil (nombre, apellido,
  avatar, idioma, zona horaria), preferencias y `UserStatus`.
- **UserStatus**: Estado del ciclo de vida de un User: `Pending` (invitado, no aceptó
  aún), `Active`, `Inactive` (desactivado, reversible), `Suspended` (bloqueado
  temporalmente), `Deleted` (soft delete, terminal).
- **Membership**: Relación User–Organization con un Role (ver
  [specs/005-organizations-multi-tenant/spec.md](../005-organizations-multi-tenant/spec.md));
  esta feature la consume para listar Organizations asociadas y cambiar el contexto
  activo, sin redefinir su modelo.
- **Preferences**: Configuración personal de un User (idioma, zona horaria, notificaciones).
- **Access History Entry**: Vista de solo lectura sobre los eventos de login del User
  (originados en `Session` de spec 004), expuesta al propio User.
- **Audit Log**: Registro inmutable de creación, modificación, eliminación lógica,
  cambio de rol/email y accesos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un User puede editar su perfil (nombre, avatar, idioma, zona horaria) y ver
  el cambio reflejado en menos de 3 segundos.
- **SC-002**: Un User con Membership en múltiples Organizations puede cambiar de
  Organization activa en menos de 3 segundos, con sus permisos ya actualizados al Role
  correspondiente.
- **SC-003**: El 100% de los cambios de perfil, estado, rol y email quedan registrados en
  el Audit Log, verificable mediante consulta del log.
- **SC-004**: Un intento de desactivar o eliminar al único administrador de una
  Organization es rechazado el 100% de las veces.
- **SC-005**: Un User en estado `Suspended`, `Inactive` o `Deleted` no puede acceder a
  ningún dato de ninguna Organization el 100% de las veces, aunque sus credenciales sigan
  siendo válidas.
- **SC-006**: Un User puede consultar su historial de accesos recientes en menos de
  2 segundos.

## Assumptions

- El email es único a nivel de toda la plataforma (no por Organization), consistente con
  el modelo de `User` de spec 004; un cambio de email dispara nuevamente la verificación
  definida en esa spec.
- `Pending` corresponde a un User invitado que aún no aceptó la invitación (ver flujo de
  invitación en spec 005); al aceptar, pasa a `Active`.
- `Suspended` es un estado transitorio que puede aplicar tanto un Administrador de
  Organization (por ejemplo, ante una investigación interna) como el sistema (por
  ejemplo, tras actividad sospechosa detectada en spec 004); esta feature solo define el
  efecto del estado, no todos los disparadores posibles, que se detallarán en fases
  futuras de seguridad/soporte.
- El soft delete (`Deleted`) es terminal: para volver a dar acceso a esa persona se crea
  un User nuevo, sujeto a la regla de unicidad de email (si el email anterior no puede
  reutilizarse por políticas de retención, queda fuera de alcance de esta fase definir
  ese mecanismo de liberación).
- El cambio de Organization activa (US2) afecta el contexto de la sesión actual del User
  (qué Organization ve), no las Sessions propiamente dichas, que siguen siendo
  responsabilidad de spec 004.
- El historial de accesos (US4) es una vista de solo lectura sobre los datos de `Session`
  ya definidos en spec 004; esta feature no duplica ese modelo, solo lo expone desde la
  perspectiva del perfil del User.
