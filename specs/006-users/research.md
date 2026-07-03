# Research: Users

No quedaron marcadores `NEEDS CLARIFICATION` en el Technical Context. Este documento
resuelve las decisiones técnicas concretas necesarias para implementar los requisitos
funcionales de [spec.md](spec.md), en particular las de frontera entre `users` y los
módulos ya implementados `identity` (spec 004) y `organizations` (spec 005).

## 1. Un solo repositorio sobre la tabla `User` (FR-002, FR-004-FR-008)

- **Decision**: Las columnas de perfil/estado (`firstName`, `lastName`, `avatarUrl`,
  `language`, `timezone`, `preferences`, `status`, `deletedAt`) se agregan al modelo
  `User` ya existente en `schema.prisma`. El `UserRepository` de `identity` (que ya
  posee `findById`/`findByEmail`/`create`/`markEmailVerified`) se **extiende** con
  `updateProfile`, `updatePreferences`, `updateStatus` y `findStatusById`, y se exporta
  desde `IdentityModule` para que `users` lo consuma. `users` no crea un segundo
  repositorio sobre la misma tabla.
- **Rationale**: Prisma no tiene noción de "propiedad por módulo" sobre una tabla; tener
  dos repositorios independientes escribiendo la misma tabla (`UserRepository` de
  identity y un hipotético `UserProfileRepository` de users) duplicaría lógica de
  acceso a datos sin beneficio real, y arriesgaría inconsistencias (por ejemplo,
  invalidación de caché o mapeo de columnas hecho una sola vez en un lugar y no en el
  otro). La separación de responsabilidades que pide spec.md ("esta feature es
  responsable de los datos de perfil") se logra a nivel de **casos de uso** (la lógica
  de negocio de perfil/ciclo de vida vive en `users/application/`), no necesariamente a
  nivel de clase repositorio.
- **Alternatives considered**: Repositorio propio de `users` sobre la tabla `User`
  (rechazada: duplicación de acceso a datos sobre la misma tabla, mayor riesgo de
  divergencia); mover todo `UserRepository` a `users` y que `identity` lo importe de
  vuelta (rechazada: invertiría la dependencia ya establecida — `identity` es el módulo
  fundacional que otros importan, no al revés; spec 004 ya está implementado y estable,
  no se reabre su modelo de dependencias sin necesidad).

## 2. "Cambiar de Organization activa" no requiere estado nuevo en el servidor (FR-010, US2)

- **Decision**: Spec 005 (research.md #5) ya resolvió que el tenant activo se determina
  por el header `X-Organization-Id` en cada request, sin persistir una "Organization
  activa" del lado del servidor ni en el JWT. Por lo tanto, US2 no necesita un endpoint
  de "cambiar" en el sentido de mutar estado — solo necesita `GET /users/me/organizations`
  (listar Memberships propias con datos básicos de cada Organization y el Role
  correspondiente). El cliente cambia de contexto simplemente enviando un
  `X-Organization-Id` distinto en la siguiente request; `TenantContextGuard` (ya
  implementado) valida la Membership y resuelve el Role igual que para cualquier otra
  request.
- **Rationale**: Evita construir una segunda fuente de verdad de "en qué Organization
  estoy" (servidor vs. cliente) que podría desincronizarse. Es consistente con Principio
  VIII (Simplicity Wins) y con la arquitectura ya validada en producción por spec 005.
- **Alternatives considered**: Persistir `activeOrganizationId` en el `User` o en el JWT
  (rechazada: JWT de acceso vive hasta 15 min y no se puede mutar sin reemitirlo;
  persistirlo en `User` sería estado de sesión, no de perfil, y contradice la decisión ya
  tomada en spec 005 de mantener a `identity` ajeno al concepto de Organization).

## 3. Historial de accesos como vista de solo lectura sobre `Session` (FR-011, US4)

- **Decision**: Se agrega `SessionHistoryRepository` (nuevo, en `identity/infrastructure/`)
  con un único método `listByUserId(userId, limit)` que lee `Session` completa (incluidas
  las revocadas/expiradas, no solo las activas — a diferencia de `ListSessionsUseCase` de
  spec 004, que solo expone sesiones activas para gestión). Se exporta desde
  `IdentityModule` para que `users` lo consuma en `ListAccessHistoryUseCase`.
- **Rationale**: Spec.md es explícito: "no duplica ese modelo, solo lo expone desde la
  perspectiva del perfil del User". Un repositorio de solo lectura, separado del que ya
  gestiona sesiones activas (que sí puede revocar), mantiene la distinción entre "gestión
  de sesiones" (spec 004 US4, mutación) e "historial de accesos" (spec 006 US4,
  visualización histórica).
- **Alternatives considered**: Reutilizar `ListSessionsUseCase` directamente (rechazada:
  ese caso de uso filtra por sesiones activas únicamente, no sirve para "historial"; y
  reutilizar un *use case* de otro módulo directamente violaría Modular by Design — la
  reutilización cross-module se hace a nivel de repositorio, no de caso de uso).

## 4. Invariante de "nunca sin administrador" se ejecuta por primera vez acá (FR-008)

- **Decision**: `DeactivateUserUseCase` y `DeleteUserUseCase` (en `users`) usan
  `MembershipRepository.countOwners(organizationId)` (ya existente en `organizations`,
  agregado en spec 005 pero nunca invocado hasta ahora) más un nuevo
  `MembershipRepository.countActiveAdmins(organizationId, excludingUserId?)` que cuenta
  Memberships con rol `Propietario` **o** `Administrador` cuyo `User.status` sea `Active`
  (join lógico entre `Membership` y `User`, resuelto en el caso de uso componiendo
  ambos repositorios, no con una query cruzada en un solo repositorio — mantiene la
  separación de infraestructura por módulo). Si desactivar/eliminar dejaría ese conteo
  en cero, se rechaza con `LastAdminError`.
- **Rationale**: Spec 005 ya había dejado preparado (pero sin usar) el conteo de
  Propietarios exactamente para este momento — no había ningún flujo en spec 005 que
  pudiera violar el invariante (no existe "remover Membership" ni "cambiar rol" en spec
  005). Spec 006 es el primer módulo que introduce una acción capaz de dejar una
  Organization sin administrador operativo (desactivar/eliminar al User), así que es
  el lugar correcto para hacer cumplir la regla.
- **Alternatives considered**: Mover el chequeo a `organizations` (rechazada: la acción
  que dispara el riesgo — cambiar `User.status` — es responsabilidad de `users`, no de
  `organizations`; `organizations` ya expone los datos necesarios vía
  `MembershipRepository`, no necesita conocer `UserStatus`).

## 5. `TenantContextGuard` debe validar también `User.status` (FR-012)

- **Decision**: `TenantContextGuard` (en `organizations`) se extiende para, además de
  validar la Membership activa, consultar `UserRepository.findStatusById(userId)` (de
  `identity`, ya exportado — ver research.md #1) y rechazar con `ForbiddenException`
  si el status no es `Active`. `OrganizationsModule` ya importa `IdentityModule`, así
  que no se agrega una dependencia nueva entre módulos.
- **Rationale**: El edge case de spec.md es explícito: "el login MUST completarse a
  nivel de credenciales, pero el acceso a datos de cualquier Organization MUST
  denegarse" — esto es exactamente el punto donde `TenantContextGuard` ya actúa. Revisar
  el estado en cada request (no solo al emitir el JWT) es necesario porque el JWT de
  acceso vive hasta 15 minutos y no refleja una suspensión aplicada mientras sigue
  vigente.
- **Alternatives considered**: Verificar `User.status` en el `AuthGuard` global
  (rechazada: `AuthGuard` es de `identity` y el propio spec dice que el login debe
  completarse igual; el efecto de un status no-Active es específicamente sobre datos de
  Organization, no sobre la autenticación en sí — ver edge case citado arriba); revocar
  todas las Sessions del User al desactivarlo/suspenderlo en vez de chequear el status
  en cada request (rechazada como mecanismo único: revocar sesiones fuerza un nuevo
  login, pero no impide que el mismo User cree una nueva sesión válida mientras su
  status siga sin ser `Active`; el chequeo de status en `TenantContextGuard` cubre ese
  caso, y revocar sesiones queda fuera de alcance de esta spec ya que no lo pide
  ningún FR).

## 6. `Pending` no tiene disparador implementado todavía

- **Decision**: El modelo incluye el valor `Pending` en `UserStatus` (para cumplir
  FR-004 y no bloquear su uso futuro), pero ningún caso de uso de esta fase transiciona
  a un User a ese estado. El flujo de invitación real (spec 005) ya requiere que la
  persona acepte estando autenticada como un `User` que se registró vía spec 004 (por
  ende ya `Active` desde que existe), así que "invitado, no aceptó aún" no es un estado
  alcanzable con el flujo actual sin duplicar el mecanismo de invitación ya
  implementado.
- **Rationale**: Evita inventar un segundo flujo de "usuario placeholder creado por un
  administrador antes de que la persona exista" que compita con el flujo de invitación
  de spec 005 ya construido y testeado. Documentar la limitación es preferible a
  construir código sin un caso de uso real que lo dispare (Principio VII, "no código sin
  pruebas").
- **Alternatives considered**: Implementar creación directa de Users en estado
  `Pending` por un Administrador, con contraseña provisoria (rechazada por ahora: no
  está pedido por ningún Acceptance Scenario de spec.md — todos los escenarios de US3
  parten de un User que ya existe — y duplicaría el flujo de invitación de spec 005).

## 7. `AuditLog.organizationId` pasa a ser nullable (Acceptance Scenario 4 de US1)

- **Decision**: `AuditLog.organizationId` (spec 005, antes obligatorio) se vuelve
  nullable. Los eventos de perfil/preferencias (`UserProfileUpdated`) se publican con
  `organizationId: null`; los eventos de ciclo de vida (`UserStatusChanged`, US3) siguen
  llevando el `organizationId` de la Organization donde ocurrió la acción, porque ahí sí
  hay un actor administrando dentro de un contexto de tenant concreto. Se agregó
  `AuditLogRepository.listByActor(actorUserId)` y el endpoint
  `GET /users/me/audit-log` para que el propio User pueda consultar sus eventos de
  cuenta (que nunca aparecerían en `GET /organizations/:id/audit-log`, filtrado
  estrictamente por `organizationId`).
- **Rationale**: Editar el propio nombre o preferencias no ocurre "dentro" de una
  Organization — el User podría no tener ninguna todavía. Forzar un `organizationId`
  arbitrario (por ejemplo, la primera Organization del User) sería incorrecto y
  confuso para auditoría; `null` representa honestamente "evento de cuenta, no de
  tenant". No estaba anticipado en el research original — se descubrió al implementar
  el test de la Acceptance Scenario 4.
- **Alternatives considered**: Exigir que el cliente mande `X-Organization-Id` también
  en `PATCH /users/me/profile` y usarlo como `organizationId` del evento (rechazada:
  estas rutas son intencionalmente independientes de contexto de tenant — ver
  contracts/users-api.md — agregar ese requisito ahí sería inconsistente con el resto
  de `/users/me/*`); no auditar los cambios de perfil (rechazada: viola directamente
  la Acceptance Scenario 4 y FR-013).
