# Research: Authentication & Identity

No quedaron marcadores `NEEDS CLARIFICATION` en el Technical Context (la arquitectura
técnica ya está fijada en [docs/implementation-plan.md](../../docs/implementation-plan.md)).
Este documento resuelve las decisiones técnicas concretas necesarias para implementar
los requisitos funcionales de [spec.md](spec.md).

## 1. Hashing de contraseñas (FR-011)

- **Decision**: Argon2id (parámetros por defecto recomendados por OWASP: memoria ≥19 MiB,
  iteraciones ≥2, paralelismo ≥1), vía librería `argon2` para Node.js.
- **Rationale**: Argon2id es el ganador de la Password Hashing Competition y la
  recomendación actual de OWASP; resiste ataques por GPU/ASIC mejor que bcrypt para el
  mismo costo computacional.
- **Alternatives considered**: bcrypt (más simple, ampliamente soportado, pero con
  límite efectivo de 72 bytes y menor resistencia a hardware especializado); scrypt
  (comparable a Argon2 pero con menos adopción en el ecosistema Node/NestJS).

## 2. Estrategia de tokens de sesión (FR-012, FR-015)

- **Decision**: JWT de acceso de corta duración (15 min) firmado con clave asimétrica
  (RS256), acompañado de un refresh token opaco (no JWT) persistido hasheado en la
  tabla `Session`, con rotación en cada uso (refresh token rotation) y detección de
  reutilización (si un refresh token ya usado se reintenta, se revoca toda la familia
  de tokens del User).
- **Rationale**: Los JWT de acceso evitan una consulta a base de datos en cada request
  autenticado; el refresh token opaco y persistido permite revocación inmediata y
  real (un JWT por sí solo no se puede "revocar" antes de su expiración).
- **Alternatives considered**: JWT también para refresh (rechazado: no se puede revocar
  sin una lista de bloqueo, lo que anula la ventaja de no consultar la base de datos);
  sesiones 100% server-side con cookie opaca (rechazado: más simple, pero no encaja con
  Principio VI API First — un cliente no-browser no podría reutilizar el mismo
  mecanismo con la misma facilidad que un Bearer token).

## 3. Login social (FR-002)

- **Decision**: Passport.js con las estrategias `passport-google-oauth20` y
  `passport-microsoft` (OAuth2/OIDC), normalizando el perfil devuelto a los campos
  mínimos de `User` (email, nombre, email_verified).
- **Rationale**: Passport es el estándar de facto en el ecosistema NestJS/Node para
  OAuth, con estrategias mantenidas para ambos proveedores y buena integración con
  Guards de NestJS.
- **Alternatives considered**: Integración manual del flujo OAuth2 por proveedor
  (rechazado por Principio VIII Simplicity Wins: reimplementar el protocolo no aporta
  valor de negocio medible).

## 4. Segundo factor (FR-009)

- **Decision**: TOTP (RFC 6238) vía librería `otplib`, con secreto por usuario cifrado
  en reposo y códigos de recuperación de un solo uso generados al activar MFA.
- **Rationale**: TOTP no depende de un proveedor externo (SMS, push), es el estándar
  soportado por todas las apps autenticadoras comunes (Google Authenticator, Authy,
  1Password), y es coherente con el supuesto ya documentado en spec.md (Assumptions).
- **Alternatives considered**: SMS OTP (rechazado en este MVP: costo por proveedor
  externo, y vulnerable a SIM swapping); WebAuthn/llaves físicas (documentado como fuera
  de alcance en spec.md; se reconsiderará en fases futuras).

## 5. Rate limiting y protección de fuerza bruta (FR-014)

- **Decision**: Rate limiting a nivel de aplicación con `@nestjs/throttler`, con un
  límite específico y más estricto para los endpoints de login/reset (ventana deslizante
  de 10 minutos, 5 intentos por combinación cuenta+IP de origen, acorde a SC-005),
  además del límite general de la API.
- **Rationale**: Mantiene la protección dentro de la misma capa de aplicación (sin
  infraestructura adicional obligatoria para el MVP), evaluable en los tests de
  integración de la Fase 2.
- **Alternatives considered**: Rate limiting a nivel de proxy/API gateway (más robusto a
  escala, pero se difiere hasta que exista infraestructura de gateway dedicada; no
  bloquea el MVP).

## 6. Verificación de email e invitaciones (FR-004, FR-018)

- **Decision**: Tokens de un solo uso con expiración corta (24h para verificación de
  email, 1h para restablecimiento de contraseña) almacenados hasheados, enviados por
  email transaccional (proveedor a definir en la fase de infraestructura, fuera del
  alcance de esta feature).
- **Rationale**: Un solo uso + expiración corta minimiza la ventana de ataque si un
  enlace se filtra; hashear el token en la base de datos evita que un volcado de datos
  exponga tokens válidos.
- **Alternatives considered**: Códigos numéricos cortos (rechazados para el enlace de
  verificación/reset por menor entropía; se pueden reconsiderar para MFA de respaldo).
