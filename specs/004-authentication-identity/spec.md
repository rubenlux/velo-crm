# Feature Specification: Authentication & Identity

**Feature Branch**: `004-authentication-identity`
**Created**: 2026-07-01
**Status**: Draft
**Input**: User description: "SPEC-004 — Authentication & Identity. Proporcionar un sistema de autenticación seguro y escalable para todos los usuarios de VELO: registro, login (email y OAuth con Google/Microsoft), logout, recuperación y cambio de contraseña, verificación de email, invitación de usuarios, gestión de sesiones y dispositivos, MFA opcional, expiración configurable de sesión, protección contra fuerza bruta/CSRF, refresh tokens con revocación inmediata, y auditoría de eventos de autenticación."

**Nota de terminología**: Esta especificación extiende el bounded context **Identity**
definido en [SPEC-003 — Bounded Contexts](../../docs/bounded-contexts.md) (`User`,
`Role`, `Permission`, `Membership`) e introduce las entidades `Session`, `Device`,
`PasswordResetToken` y `EmailVerificationToken` propias de la autenticación. Todo evento
de autenticación se registra como `AuditLog`, según [SPEC-002 — Domain Model](../../docs/domain-model.md).

Esta feature es una precondición técnica para la User Story 4 (Administración de Users,
Roles y Permissions) de [specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md):
allí se definió *qué* puede hacer un Administrador con Memberships/Roles; aquí se define
*cómo* un User efectivamente se autentica para poder hacerlo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro e inicio de sesión con email y contraseña (Priority: P1)

Como User de VELO, quiero registrarme y luego iniciar sesión con mi email y contraseña,
para poder acceder a las Organizations en las que tengo Membership.

**Why this priority**: Es el mecanismo de acceso más básico. Sin login no hay acceso a
ningún otro módulo de la plataforma (CRM, Facturación, etc.).

**Independent Test**: Puede probarse registrando un nuevo User con email/contraseña,
verificando su email, cerrando sesión y volviendo a iniciar sesión con esas mismas
credenciales, sin depender de OAuth, MFA ni gestión de dispositivos.

**Acceptance Scenarios**:

1. **Given** un email no registrado, **When** una persona se registra con email y
   contraseña, **Then** se crea el User y recibe un correo de verificación de email.
2. **Given** un User registrado que no verificó su email, **When** intenta iniciar
   sesión, **Then** el sistema le permite iniciar sesión pero indica claramente que su
   email está sin verificar y limita las acciones sensibles hasta verificarlo.
3. **Given** un User con email verificado, **When** inicia sesión con email y contraseña
   correctos, **Then** accede a las Organizations de sus Memberships activas.
4. **Given** un User, **When** ingresa una contraseña incorrecta repetidas veces en un
   corto período, **Then** el sistema bloquea temporalmente los intentos (protección de
   fuerza bruta) y lo registra en el Audit Log.
5. **Given** un User autenticado, **When** cierra sesión, **Then** su sesión actual deja
   de ser válida de inmediato.

---

### User Story 2 - Recuperación y cambio de contraseña (Priority: P2)

Como User que olvidó su contraseña, quiero poder restablecerla de forma segura mediante
mi email, para recuperar el acceso a mi cuenta sin intervención de un administrador.

**Why this priority**: Es el segundo flujo de acceso más frecuente después del login; sin
él, un User bloqueado no tiene forma de recuperar su cuenta.

**Independent Test**: Puede probarse solicitando un restablecimiento de contraseña,
usando el enlace/token recibido para definir una nueva contraseña, e iniciando sesión con
ella, de forma independiente de OAuth o MFA.

**Acceptance Scenarios**:

1. **Given** un email registrado, **When** el User solicita restablecer su contraseña,
   **Then** recibe un enlace de un solo uso con expiración para definir una nueva
   contraseña.
2. **Given** un enlace de restablecimiento válido, **When** el User define una nueva
   contraseña, **Then** la contraseña anterior deja de funcionar y todas las sesiones
   activas previas se cierran.
3. **Given** un enlace de restablecimiento ya usado o expirado, **When** el User intenta
   usarlo nuevamente, **Then** el sistema lo rechaza y le permite solicitar uno nuevo.
4. **Given** un User autenticado, **When** cambia su contraseña desde su perfil (sin
   pasar por recuperación), **Then** el sistema exige su contraseña actual antes de
   aplicar el cambio.

---

### User Story 3 - Inicio de sesión con proveedores OAuth (Priority: P3)

Como User de VELO, quiero iniciar sesión con mi cuenta de Google o Microsoft, para
acceder más rápido sin tener que recordar otra contraseña.

**Why this priority**: Mejora la conversión y comodidad de acceso, pero el sistema ya es
funcional con login por email/contraseña (US1) sin esta historia.

**Independent Test**: Puede probarse iniciando sesión con una cuenta Google o Microsoft
válida y verificando que se crea o vincula el User correspondiente, de forma
independiente del resto de historias.

**Acceptance Scenarios**:

1. **Given** una persona sin cuenta previa en VELO, **When** inicia sesión con Google o
   Microsoft por primera vez, **Then** se crea un nuevo User vinculado a ese proveedor
   con el email verificado automáticamente.
2. **Given** un User existente registrado con email/contraseña, **When** inicia sesión
   con un proveedor OAuth que usa el mismo email, **Then** el sistema vincula el
   proveedor a la cuenta existente en lugar de crear un User duplicado.
3. **Given** un User que solo tiene login por OAuth, **When** intenta recuperar
   contraseña por email, **Then** el sistema le indica que su cuenta usa inicio de
   sesión con proveedor externo.

---

### User Story 4 - Gestión de sesiones y dispositivos (Priority: P4)

Como User de VELO, quiero ver mis sesiones y dispositivos activos y poder cerrarlos
remotamente, para proteger mi cuenta si sospecho un acceso no autorizado.

**Why this priority**: Es una capa adicional de control y seguridad sobre un sistema de
login ya funcional (US1-US3); no bloquea el uso básico de la plataforma.

**Independent Test**: Puede probarse iniciando sesión desde dos dispositivos/navegadores
distintos, listando las sesiones activas desde uno de ellos, y cerrando la sesión del
otro de forma remota.

**Acceptance Scenarios**:

1. **Given** un User con sesiones activas en varios dispositivos, **When** consulta su
   lista de sesiones, **Then** ve cada sesión con su dispositivo, ubicación aproximada y
   última actividad.
2. **Given** una sesión activa en otro dispositivo, **When** el User la cierra
   remotamente, **Then** esa sesión y su refresh token quedan revocados de inmediato y
   cualquier intento de uso posterior es rechazado.
3. **Given** un User que sospecha un acceso no autorizado, **When** elige "cerrar todas
   las sesiones", **Then** todas sus sesiones (incluida la actual) se revocan y debe
   iniciar sesión nuevamente.

---

### User Story 5 - Autenticación multifactor opcional (MFA) (Priority: P5)

Como User de VELO, quiero poder activar un segundo factor de autenticación, para
proteger mi cuenta con una capa adicional de seguridad si mi contraseña se ve
comprometida.

**Why this priority**: Es una mejora de seguridad opcional sobre un sistema de login ya
funcional; no es requisito para el uso básico de la plataforma en esta fase.

**Independent Test**: Puede probarse activando MFA en una cuenta, cerrando sesión, y
verificando que el siguiente login exige el segundo factor además de la contraseña.

**Acceptance Scenarios**:

1. **Given** un User autenticado, **When** activa MFA y completa la configuración,
   **Then** los siguientes inicios de sesión exigen el segundo factor.
2. **Given** un User con MFA activo, **When** ingresa email/contraseña correctos pero un
   código de segundo factor incorrecto, **Then** el acceso se deniega y el intento queda
   registrado en el Audit Log.
3. **Given** un User con MFA activo, **When** desactiva MFA desde su perfil, **Then** el
   sistema exige reautenticación antes de permitir la desactivación.

---

### Edge Cases

- ¿Qué ocurre si se usa un refresh token ya revocado (por ejemplo, robado y reutilizado
  luego de un cierre de sesión remoto)? El sistema MUST rechazarlo y puede revocar
  preventivamente el resto de la familia de tokens del User, registrándolo en el Audit
  Log.
- ¿Qué pasa si un User solicita múltiples restablecimientos de contraseña seguidos? Solo
  el enlace más reciente es válido; los anteriores quedan invalidados.
- ¿Cómo se comporta el sistema si el proveedor OAuth no entrega un email verificado? El
  sistema MUST tratar el email como no verificado y aplicar las mismas restricciones que
  a un registro por email sin verificar.
- ¿Qué sucede si expira la sesión mientras el User tiene una operación en curso? El
  sistema MUST solicitar reautenticación antes de continuar, sin perder silenciosamente
  la acción del usuario.
- ¿Qué pasa si un Administrador invita a un email que ya tiene un User en VELO (en otra
  Organization)? El sistema MUST asociar una nueva Membership a ese User existente en
  lugar de crear un User duplicado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir registrarse e iniciar sesión mediante email y
  contraseña.
- **FR-002**: El sistema MUST permitir iniciar sesión mediante los proveedores OAuth
  Google y Microsoft, vinculando automáticamente cuentas que compartan el mismo email
  verificado.
- **FR-003**: El sistema MUST permitir solicitar y completar el restablecimiento de
  contraseña mediante un enlace de un solo uso con expiración.
- **FR-004**: El sistema MUST requerir verificación de email y distinguir el estado
  verificado/no verificado de cada User.
- **FR-005**: El sistema MUST permitir cerrar la sesión actual de forma individual.
- **FR-006**: El sistema MUST permitir cerrar todas las sesiones activas de un User de
  una sola acción.
- **FR-007**: El sistema MUST permitir a un User consultar y administrar sus dispositivos
  y sesiones activas, incluyendo la revocación remota de una sesión específica.
- **FR-008**: El sistema MUST ofrecer la opción de "recordar sesión" para extender la
  duración de la sesión en un dispositivo de confianza.
- **FR-009**: El sistema MUST permitir activar y desactivar un segundo factor de
  autenticación (MFA) de forma opcional por User.
- **FR-010**: El sistema MUST permitir configurar el tiempo de expiración de sesión a
  nivel Organization.
- **FR-011**: El sistema MUST almacenar las contraseñas mediante un mecanismo de hashing
  de contraseñas reconocido como seguro (nunca en texto plano ni cifrado reversible).
- **FR-012**: El sistema MUST emitir tokens de sesión firmados y verificar su firma en
  cada solicitud autenticada.
- **FR-013**: El sistema MUST proteger los formularios de autenticación contra ataques
  CSRF.
- **FR-014**: El sistema MUST aplicar rate limiting y bloqueo temporal ante intentos
  repetidos de login fallido sobre una misma cuenta o dirección de origen.
- **FR-015**: El sistema MUST soportar refresh tokens con revocación inmediata: un token
  revocado MUST dejar de ser válido sin demora perceptible.
- **FR-016**: El sistema MUST registrar en el Audit Log, como mínimo, los eventos: login,
  logout, cambio de contraseña, activación de MFA y revocación de sesión — incluyendo
  User, fecha y resultado (éxito/fallo).
- **FR-017**: El sistema MUST garantizar que un User autenticado solo pueda acceder a las
  Organizations en las que tiene una Membership activa.
- **FR-018**: El sistema MUST permitir invitar Users nuevos o existentes a una
  Organization por email, reutilizando el User existente si el email ya está registrado.

### Key Entities

- **User**: Persona con acceso a VELO (ver [Domain Model](../../docs/domain-model.md));
  en esta feature se detallan sus atributos de autenticación (email, estado de
  verificación, contraseña hasheada, MFA habilitado/deshabilitado).
- **Session**: Acceso activo de un User desde un dispositivo/navegador concreto; tiene
  fecha de inicio, última actividad y estado (activa/revocada).
- **Device**: Dispositivo o navegador desde el que un User inició sesión; asociado a una
  o más Sessions.
- **PasswordResetToken**: Token de un solo uso, con expiración, emitido para permitir a
  un User definir una nueva contraseña.
- **EmailVerificationToken**: Token emitido para confirmar la propiedad de un email
  asociado a un User.
- **Membership**: Relación User–Organization con un Role (ver [Domain Model](../../docs/domain-model.md));
  determina a qué Organizations puede acceder un User autenticado.
- **Audit Log**: Registro inmutable de eventos de autenticación y seguridad (login,
  logout, cambios de contraseña, MFA, revocaciones).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario nuevo puede registrarse y llegar a la pantalla principal de su
  Organization en menos de 2 minutos, incluyendo la verificación de email.
- **SC-002**: El 95% de los inicios de sesión (email o OAuth) se completan en menos de
  3 segundos en condiciones normales de red.
- **SC-003**: El 100% de los eventos de autenticación relevantes (login, logout, cambio
  de contraseña, MFA, revocación de sesión) quedan registrados en el Audit Log,
  verificable mediante consulta del log.
- **SC-004**: Una sesión o refresh token revocado deja de ser aceptado por el sistema en
  menos de 5 segundos desde la revocación.
- **SC-005**: Tras 5 intentos fallidos de login en 10 minutos sobre la misma cuenta, el
  sistema bloquea temporalmente nuevos intentos y lo notifica al usuario.
- **SC-006**: El 100% de los enlaces de restablecimiento de contraseña dejan de ser
  válidos después de su primer uso o de su expiración configurada.
- **SC-007**: Un usuario puede revocar remotamente una sesión de otro dispositivo y
  confirmar, desde ese otro dispositivo, que quedó desconectado en menos de 10 segundos.

## Assumptions

- Los proveedores OAuth soportados en esta fase son Google y Microsoft; se documenta
  como extensible a otros proveedores en fases futuras.
- El vínculo entre un User existente y un login OAuth se realiza automáticamente cuando
  el proveedor entrega un email verificado que coincide con el del User; no se pide
  confirmación manual adicional en esta fase.
- MFA se implementa mediante código temporal (TOTP) como mecanismo por defecto; otros
  factores (SMS, llaves físicas) quedan fuera de alcance de esta fase.
- El tiempo de expiración de sesión tiene un valor por defecto razonable (ej. sesión
  "recordada" de hasta 30 días, sesión estándar de algunas horas de inactividad) y es
  configurable por Organization según FR-010.
- La invitación de Users (FR-018) reutiliza el flujo ya definido en la User Story 4 de
  [specs/001-crm-fase1-clientes-pipeline/spec.md](../001-crm-fase1-clientes-pipeline/spec.md);
  esta feature no redefine cómo se asignan Roles, solo cómo se autentica el User
  invitado.
- El rate limiting y bloqueo por fuerza bruta se aplica por combinación de cuenta y
  origen de la solicitud, con umbrales configurables a nivel de plataforma (no por
  Organization) en esta fase.
