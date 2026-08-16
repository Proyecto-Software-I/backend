## Context

El backend ya tiene el modelo de datos completo en `prisma/schema/auth-tenancy.prisma` (User, UserCredential, UserSession con `organizationId` nullable, Organization, OrganizationMembership, Role, Permission, MembershipRole) y la migración `20260814144509_init` aplicada. No existe código de autenticación: `app.module.ts` solo importa `ConfigModule` y `PrismaModule`; `main.ts` tiene helmet, CORS, ValidationPipe global y Swagger. El seed (`prisma/seed.ts`) crea `Permission` pero no roles. La issue #5 (https://github.com/Proyecto-Software-I/backend/issues/5) es el contrato HTTP fuente de verdad. Ver proposal.md (Why) y specs/auth/spec.md (requisitos).

## Goals / Non-Goals

**Goals:**
- Implementar `AuthModule` con los 6 endpoints y el contrato de errores.
- Resolver el tenant activo automáticamente (1 membresía) o vía selección explícita (2+), nunca arbitrariamente.
- Establecer el mecanismo de contexto de tenant reutilizable por módulos futuros.

**Non-Goals (fuera de alcance, según la issue):**
- Persistencia de última organización / tenant switcher dentro de `/app`.
- OAuth/OIDC/SAML/MFA/WebAuthn, invitaciones, recuperación de contraseña, envío real de email, billing checkout.

## Decisions

### D1. Estructura de módulo NestJS
Se crea `src/auth/` con `auth.module.ts` (importa `ConfigModule` y `PrismaModule`), `auth.controller.ts` (solo HTTP/DTO/Swagger), `auth.service.ts` (orquestación y reglas de negocio). La lógica pesada se delega en servicios pequeños: `password.service.ts`, `token.service.ts`, `session.service.ts`, y un `tenant-context` (guard + decoradores). Sigue el patrón del repo (controlador sin lógica, servicio con reglas).

### D2. Dependencias nuevas (justificadas)
- **`jsonwebtoken`** (+ `@types/jsonwebtoken`): la issue exige JWT para el access token (`sub`/`sid`/`org`). Alternativa `jose` descartada para evitar cambiar el ecosistema de Node 24 ya presente.
- **`bcryptjs`**: hash de passwords seguro. Se eligió la variante pura JS (coste 12) sobre `bcrypt` nativo y `argon2` porque en dev Windows evitan la compilación nativa (node-gyp/Python), reduciendo fricción de setup sin sacrificar seguridad. AGENTS.md exige solo hashes seguros; bcrypt cumple.
- **`cookie-parser`** (+ `@types/cookie-parser`): leer/escribir la cookie `legacylift_refresh` (HttpOnly) en `refresh`/`logout`. Alternativa (parsear `req.headers.cookie` a mano) descartada por ser más frágil y repetitiva.
- Todas requieren aprobación explícita antes de `npm install` (AGENTS.md / `openspec/config.yaml` prohíben agregar deps sin aprobación).

### D3. Creación del rol OWNER y sus permisos
`Role.organizationId` es obligatorio (no nullable), por lo que el `OWNER` es **por organización**. El seed NO se modifica para roles. `AuthService` crea idempotentemente, dentro de la transacción de registro, un `Role` (`scope=ORGANIZATION`, `key=OWNER`, `isSystem=true`) en la nueva org y le asigna **todos los permisos sembrados** vía `MembershipRole` + `RolePermission`. Esto hace al dueño administrador total de su tenant y es reutilizable para cualquier org futura.

### D4. `UserSession.tokenHash`
Es obligatorio y único en el schema. Como el access token es JWT stateless, se almacena `tokenHash = sha256(accessToken)`. Habilita revocación por token en el futuro sin cambiar el modelo. `refreshTokenHash` guarda el hash del refresh (nunca el plaintext).

### D5. Rotación de refresh token
Se rota en cada `POST /api/auth/refresh`: se regenera el refresh, se reescribe `UserSession.refreshTokenHash` y se renueva la cookie. En `select-organization` NO se rota (la sesión y el refresh persisten; solo cambia el tenant del access token). Previene replay del refresh.

### D6. Guard y contexto de tenant
`JwtAuthGuard` lee `Authorization: Bearer`, verifica la firma JWT, carga la `UserSession` por `sid`, y comprueba `revokedAt=null`, `expiresAt>now`. También compara `payload.sub` y `payload.org` con `UserSession.userId` y `UserSession.organizationId`; si no coinciden, rechaza el token. Cuando la sesión tiene organización, verifica `OrganizationMembership ACTIVE` usando los valores recuperados de la base de datos. Devuelve `SESSION_REVOKED` / `SESSION_EXPIRED` / `ORGANIZATION_ACCESS_DENIED`. Expone mediante `@CurrentUser()` un contexto mínimo con `userId`, `sessionId` y `organizationId`, y `@CurrentTenant()` devuelve la organización activa o `null` durante la selección. Ambos decoradores fallan explícitamente si se usan sin contexto cargado por el guard. El guard aplica a `me`, `select-organization` y `logout`; `refresh` valida la sesión mediante el refresh token y conserva su organización. Esto materializa la regla multi-tenant de AGENTS.md (nunca autorizar por UUID solo).

### D7. Usuario no activo y sesiones múltiples
Login rechaza con `USER_NOT_ACTIVE` si `User.status != ACTIVE`. Se permiten **múltiples sesiones concurrentes** por usuario (cada login crea un `UserSession` nuevo; logout revoca solo el de esa cookie). `select-organization` se permite aunque haya 1 sola membresía ACTIVE (re-selección idempotente y segura, siempre validando pertenencia).

### D8. Variables de entorno y cookie
Se agregan `AUTH_JWT_SECRET` (requerida), `AUTH_ACCESS_TOKEN_TTL=15m`, `AUTH_REFRESH_TOKEN_TTL_DAYS=30` a `.env.example` y al schema Joi de `app.module.ts`. La cookie `legacylift_refresh` usa `HttpOnly=true`, `SameSite=Lax`, `Secure=true` solo en producción, `Path=/api/auth`.

## Risks / Trade-offs

- [Riesgo] Fuga de `AUTH_JWT_SECRET` compromete todos los access tokens → Mitigación: secret obligatorio, jamás versionado; en producción desde gestor de secretos.
- [Riesgo] Cookie de refresh robada permite acceso hasta rotación → Mitigación: `HttpOnly` + `Secure`(prod) + `SameSite=Lax`; rotación en cada refresh; `revokedAt` en logout.
- [Riesgo] `bcryptjs` es más lento que nativo → Mitigación: coste 12 equilibrado; aceptable para el volumen de auth.
- [Riesgo] Sesión con `organizationId=null` accede a recursos tenant-scoped → Mitigación: `me`, `refresh` y `logout` permanecen disponibles para completar el ciclo de autenticación; los recursos tenant-scoped requieren una organización activa y `select-organization` solo permite fijarla tras validar una membresía ACTIVE.
- [Riesgo] Arranque falla sin `AUTH_JWT_SECRET` → Mitigación: documentado en setup; CI/entornos proveen la variable.

## Migration Plan

- No hay migración de base de datos: el schema y la migración `init` ya cubren todas las tablas. No se edita ninguna migración aplicada (AGENTS.md).
- El seed no cambia su contrato; el rol OWNER se crea en runtime al registrar. `db:seed` y `db:fresh` siguen válidos.
- Rollback: eliminar el módulo `auth` y revertir `app.module.ts`/`main.ts`/`.env.example`; no hay cambios de datos que revertir.
- Despliegue: requiere `AUTH_JWT_SECRET` configurado en todos los entornos antes de publicar.

## Open Questions

Ninguna pendiente: las 8 ambigüedades de la issue fueron resueltas y aprobadas antes de redactar este diseño (ver D3–D8).
