# Quickstart: Authentication & Identity

Guía manual para validar la User Story 1 (registro y login por email) una vez
implementado el módulo `identity`, sin depender de OAuth, MFA ni gestión de
dispositivos (US2-US5).

## Prerrequisitos

- Backend NestJS corriendo localmente con PostgreSQL disponible (ver
  `docs/implementation-plan.md` para el stack) y migraciones de Prisma aplicadas.
- Frontend React corriendo localmente, apuntando al backend local.
- Un servicio de email de desarrollo (ej. bandeja de pruebas / logs de consola) para
  poder leer el enlace de verificación de email.

## Escenario: registro, verificación y login (US1)

1. `POST /auth/register` con un email y contraseña nuevos.
   - **Verificar**: se crea el `User`; se envía (o se loguea) un
     `EmailVerificationToken`.
2. Sin verificar el email, `POST /auth/login` con las mismas credenciales.
   - **Verificar**: el login es exitoso (Acceptance Scenario 2 de la User Story 1), pero
     la respuesta indica `emailVerified: false`.
3. Usar el token recibido para llamar `POST /auth/verify-email`.
   - **Verificar**: el `User` queda con `emailVerifiedAt` seteado.
4. `POST /auth/logout` con la sesión activa.
   - **Verificar**: una llamada posterior con el mismo access token es rechazada.
5. `POST /auth/login` nuevamente con las mismas credenciales.
   - **Verificar**: login exitoso, ahora con `emailVerified: true`.
6. Repetir `POST /auth/login` con una contraseña incorrecta 6 veces seguidas en menos de
   10 minutos.
   - **Verificar**: a partir del 6º intento el sistema bloquea temporalmente (SC-005) y
     el evento queda en el Audit Log.

## Validación de aislamiento multi-tenant (relacionado con FR-017)

7. Con el `User` autenticado pero sin ninguna Membership, intentar acceder a un recurso
   de una Organization arbitraria.
   - **Verificar**: acceso denegado; no se filtra ninguna Organization existente.

Este flujo cubre el criterio de éxito SC-001 (registro + verificación en <2 minutos) y
sirve de base para los tests de integración/E2E que se detallarán en `tasks.md`
(`/speckit-tasks`).
