# Research: Organizations (Multi-Tenant)

No quedaron marcadores `NEEDS CLARIFICATION` en el Technical Context. Este documento
resuelve las decisiones técnicas concretas necesarias para implementar los requisitos
funcionales de [spec.md](spec.md).

## 1. Estrategia de aislamiento multi-tenant (FR-011, Constitución Principio IV)

- **Decision**: Aislamiento por columna `organizationId` en cada tabla tenant-scoped
  (row-level, base de datos compartida), combinado con un `TenantContextGuard` de NestJS
  que resuelve la Organization activa desde un header `X-Organization-Id`, valida que el
  User autenticado tenga una `Membership` activa en esa Organization, y la adjunta a
  `req.organizationId`. Cada método de repositorio que toque datos tenant-scoped exige
  `organizationId` como parámetro explícito (no hay una capa de middleware de Prisma que
  lo inyecte "mágicamente").
- **Rationale**: Bases de datos o esquemas separados por Organization escalarían mejor en
  aislamiento absoluto, pero son operacionalmente mucho más caros (una migración = N
  migraciones) para la escala objetivo de esta fase (SC-002: 100 Organizations). Exigir
  `organizationId` explícito por parámetro (en vez de middleware implícito) hace que
  cualquier acceso a datos tenant-scoped sea auditable a simple vista en el código y
  falle en tiempo de compilación (TypeScript) si se omite, priorizando Principio VIII
  (Simplicity Wins) y V (Security by Default) sobre la comodidad de una capa mágica que
  podría fallar en silencio si se olvida aplicarla en un nuevo repositorio.
- **Alternatives considered**: Base de datos separada por tenant (rechazada: sobre-
  ingeniería para la escala actual, contradice Simplicity Wins); Prisma middleware
  global que inyecta `WHERE organizationId = ...` automáticamente (rechazada: oculta el
  filtro tenant en una capa transversal difícil de auditar por code review, y un olvido
  de configuración lo desactivaría sin error visible — mayor riesgo para Principio V que
  el beneficio de ergonomía que aporta).

## 2. Catálogo de planes y límites (FR-010, Assumptions de spec.md)

- **Decision**: El catálogo de planes (nombres, límites de usuarios, módulos incluidos)
  se define como configuración estática en código (`plan-catalog.ts`), no como tabla en
  base de datos. `Organization.plan` es un enum (`Free`, `Pro`, `Enterprise` para este
  MVP). Cambiar de plan solo actualiza el enum y revalida los límites vigentes.
- **Rationale**: La spec.md ya documenta como Assumption que el catálogo de planes "no
  forma parte del alcance de esta especificación"; modelarlo en base de datos añadiría
  una entidad y un CRUD administrativo sin requisito funcional que lo pida todavía
  (Principio VIII).
- **Alternatives considered**: Tabla `Plan` en base de datos con límites configurables
  (rechazada por ahora: sin requisito de negocio que exija cambiar límites sin
  deploy; se reconsiderará si una fase futura de Billing lo requiere).

## 3. Invitaciones y su aceptación (FR-003, US3; cierra FR-018 de spec 004)

- **Decision**: `OrganizationInvitation` (email, organizationId, role, tokenHash,
  status, expiresAt) se crea y cancela desde el módulo `organizations`
  (`POST /organizations/:id/invitations`, `DELETE /organizations/:id/invitations/:id`),
  pero la **aceptación** ocurre en el endpoint ya reservado por spec 004
  (`POST /auth/invitations/:token/accept`, tarea T064 diferida en ese momento por falta
  de esta spec). Ese endpoint del módulo `identity` invoca un caso de uso expuesto por
  `organizations` (`AcceptInvitationUseCase`) para crear la `Membership` correspondiente,
  evitando que `identity` conozca el modelo interno de `Organization`.
- **Rationale**: Mantiene la responsabilidad de "quién puede loguearse" en `identity`
  (Principio II Modular by Design: cada módulo posee su dominio) mientras que "quién
  pertenece a qué Organization con qué rol" queda en `organizations`. Reutilizar el
  mismo mecanismo de token de un solo uso hasheado que `PasswordResetToken`/
  `EmailVerificationToken` (spec 004) mantiene consistencia de patrón.
- **Alternatives considered**: Mover la aceptación a un endpoint propio de
  `organizations` (rechazada: spec 004 ya fijó el contrato público
  `/auth/invitations/:token/accept` y cambiarlo rompería esa spec ya implementada sin
  beneficio); que `organizations` importe repositorios de `identity` directamente
  (rechazada: viola Modular by Design — la comunicación debe ser vía casos de uso/
  servicios exportados, no acceso directo a infraestructura ajena).

## 4. Audit Log persistente y consultable (FR-013, SC-004)

- **Decision**: Nueva tabla `AuditLog` (organizationId, actorUserId, action, metadata
  JSON, occurredAt) persistida vía Prisma, con un `AuditLogPublisher` que la escribe
  directamente (sin cola de mensajería) y un endpoint de consulta
  (`GET /organizations/:id/audit-log`) filtrable por rango de fechas y tipo de acción.
- **Rationale**: A diferencia de `identity` (spec 004), donde el Audit Log se documentó
  como un "seam" temporal que solo loguea a consola (`IdentityAuditPublisher`), spec 005
  tiene un criterio de éxito explícito que exige que el log sea "verificable mediante
  consulta" (SC-004) — una entrada de log en consola no es consultable por un
  Administrador. Escribir directo a la tabla (sin cola) es suficiente para el volumen
  esperado en esta fase (Principio VIII).
- **Alternatives considered**: Extender `IdentityAuditPublisher` para que también sirva a
  `organizations` (rechazada: acoplaría dos módulos independientes por una
  responsabilidad transversal; en cambio, `organizations` introduce el `AuditLog` real y
  `identity` puede migrar a consumirlo en una iteración futura, fuera de alcance aquí);
  cola de eventos (Kafka/RabbitMQ) para desacoplar el registro (rechazada: infraestructura
  no justificada todavía para el volumen de esta fase).

## 5. Selección de Organization activa para Users con múltiples Memberships

- **Decision**: El cliente (frontend) indica la Organization activa vía header
  `X-Organization-Id` en cada request; el backend la valida contra las Memberships del
  User en cada llamada (no se persiste "organization activa" en el token de acceso, que
  es emitido por `identity` sin conocer Organizations).
- **Rationale**: Mantiene `identity` completamente ajeno al concepto de Organization
  (Modular by Design) y permite que un User cambie de Organization sin necesidad de un
  nuevo login; el costo es una validación adicional de Membership por request, aceptable
  a la escala objetivo (SC-002).
- **Alternatives considered**: Incluir `organizationId` como claim en el JWT de acceso
  (rechazada: acoplaría la emisión de tokens en `identity` al conocimiento de
  Memberships/Organizations, y obligaría a reemitir el token al cambiar de Organization
  activa).
