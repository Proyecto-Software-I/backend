## Why

LegacyLift necesita un sistema de autenticación desde el primer día que respete el modelo multi-tenant ya definido en Prisma (`User → OrganizationMembership → Organization → Role`). Hoy el backend no tiene ningún mecanismo de auth, ni guardas, ni contexto de tenant, por lo que ningún endpoint puede autorizar ni aislar datos por organización. La GitHub issue #5 (https://github.com/Proyecto-Software-I/backend/issues/5) define el contrato HTTP obligatorio para registro, login, sesión, refresh, logout y resolución automática del tenant activo, y es fuente de verdad para frontend y backend.

## What Changes

- Se implementa el módulo `AuthModule` de NestJS con 6 endpoints bajo `/api/auth`: `register`, `login`, `me`, `select-organization`, `refresh`, `logout`.
- Registro crea en una transacción Prisma: `User` (ACTIVO), `UserCredential` (password hasheado), `Organization` (TRIAL/SAAS, slug único), `OrganizationMembership` (ACTIVE), rol `OWNER` (ORGANIZATION, isSystem) con todos los permisos sembrados, y `UserSession` con `organizationId` = la org creada.
- Login resuelve el tenant activo automáticamente: 1 membership ACTIVE → org fijada y `requiresOrganizationSelection=false`; 2+ → sesión con `organizationId=null` y `requiresOrganizationSelection=true`; 0 membreships ACTIVE → rechazo `NO_ACTIVE_MEMBERSHIP`.
- `select-organization` valida que la org solicitada sea una membership ACTIVE del usuario autenticado (nunca por UUID solo) y emite nuevo access token con el tenant activo.
- Access token JWT (`sub`, `sid`, `org`) de 15 min; refresh token en cookie HttpOnly `legacylift_refresh`, solo hash en `UserSession.refreshTokenHash`.
- `UserSession.tokenHash` se pobló con `sha256(accessToken)` para soporte futuro de revocación.
- Se añade un filtro de excepción global con el contrato de errores `{ statusCode, code, message }` y los códigos `EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`, `USER_NOT_ACTIVE`, `NO_ACTIVE_MEMBERSHIP`, `ORGANIZATION_ACCESS_DENIED`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `VALIDATION_ERROR`.
- `JwtAuthGuard` resuelve el contexto de tenant (sesión + membership + roles) y lo expone vía decoradores para módulos futuros.
- Swagger documenta los 6 endpoints y los DTOs según el contrato.

## Capabilities

### New Capabilities
- `auth`: Autenticación multi-tenant y contexto de organización (registro, login, sesión actual, selección de organización, refresh, logout, JWT, refresh en cookie, rol OWNER y contrato de errores).

### Modified Capabilities
<!-- Ninguna capacidad existente cambia sus requisitos; es la primera spec. -->

## Impact

- **Código**: nuevo `src/auth/` (module, controller, service, DTOs, guards, token/password/session services, exception filter). Modificaciones en `src/app.module.ts` (importar `AuthModule`, extender schema Joi con `AUTH_JWT_SECRET`, `AUTH_ACCESS_TOKEN_TTL`, `AUTH_REFRESH_TOKEN_TTL_DAYS`) y `src/main.ts` (filtro de excepciones global, middleware de cookies).
- **API**: 6 nuevos endpoints bajo `/api/auth`. Contrato coordinado con frontend (labels `api-contract`, `cross-repo`).
- **Dependencias nuevas** (requieren aprobación): `jsonwebtoken` + `@types/jsonwebtoken`, `bcryptjs`, `cookie-parser` + `@types/cookie-parser`.
- **Base de datos**: NO se modifica el schema Prisma (todas las tablas ya existen, migración `20260814144509_init` aplicada). El seed (`prisma/seed.ts`) NO se modifica para roles; el rol `OWNER` y sus permisos se crean idempotentemente en `AuthService` al registrar.
- **Configuración**: nuevas variables de entorno en `.env.example`.
- **Riesgos**:
  - *Seguridad*: el secreto `AUTH_JWT_SECRET` debe estar presente en todos los entornos; la cookie de refresh usa `Secure` solo en producción y `SameSite=Lax`. No diferenciar públicamente email inexistente vs password incorrecto (`INVALID_CREDENTIALS`). Passwords y refresh solo por hash.
  - *Compatibilidad*: el `ConfigModule` rechazará arrancar sin `AUTH_JWT_SECRET`; entornos y CI deben proveerlo.
  - *Despliegue*: sin `AUTH_JWT_SECRET` configurado el bootstrap falla; debe documentarse en el setup.
  - *Pruebas*: el e2e actual (`test/app.e2e-spec.ts`) debe seguir pasando; se añaden tests de auth (unit + e2e) con caso dedicado de "1 org nunca devuelve `requiresOrganizationSelection: true`" y denegación cross-tenant.
