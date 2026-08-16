## 1. Setup y configuración

- [ ] 1.1 Agregar `AUTH_JWT_SECRET`, `AUTH_ACCESS_TOKEN_TTL` (defecto `15m`) y `AUTH_REFRESH_TOKEN_TTL_DAYS` (defecto `30`) al schema Joi de `app.module.ts` y a `.env.example`.
- [ ] 1.2 Instalar dependencias aprobadas: `jsonwebtoken` + `@types/jsonwebtoken`, `bcryptjs`, `cookie-parser` + `@types/cookie-parser`.

## 2. Servicios base

- [ ] 2.1 Implementar `password.service.ts`: hash (bcryptjs coste 12) y verify; unit test de ida/vuelta.
- [ ] 2.2 Implementar `token.service.ts`: firmar/verificar JWT (`sub`/`sid`/`org`) con `AUTH_JWT_SECRET` y TTL; generar refresh aleatorio + `sha256`; unit tests.
- [ ] 2.3 Implementar `session.service.ts`: crear `UserSession` (con/sin `organizationId`), revocar (`revokedAt`), actualizar org, validar por `sid` (no revocada/no expirada), hash de refresh; unit tests.

## 3. DTOs y AuthService

- [ ] 3.1 Crear DTOs validados con `class-validator`: `RegisterDto` (email, password ≥8, firstName, lastName, organizationName), `LoginDto` (email, password), `SelectOrganizationDto` (organizationId).
- [ ] 3.2 Implementar `auth.service.ts` → `register`: transacción Prisma creando User+UserCredential+Organization(slug único)+OrganizationMembership+rol OWNER(idempotente, todos los permisos)+UserSession; normaliza email lowercase; rechaza email duplicado (`EMAIL_ALREADY_REGISTERED`).
- [ ] 3.3 Implementar `login`: casos A (1 membresía → org fijada, `requiresOrganizationSelection=false`), B (2+ → sesión sin org, `requiresOrganizationSelection=true`), C (0 → `NO_ACTIVE_MEMBERSHIP`); rechaza credenciales inválidas (`INVALID_CREDENTIALS`) y usuario no activo (`USER_NOT_ACTIVE`).
- [ ] 3.4 Implementar `selectOrganization`: valida membresía ACTIVE del usuario; `ORGANIZATION_ACCESS_DENIED` si no; actualiza `organizationId` y emite nuevo access token.
- [ ] 3.5 Implementar `me`, `refresh` (cookie, rota refresh, conserva tenant) y `logout` (revoca sesión, limpia cookie, `204`).

## 4. Guard y contexto de tenant

- [ ] 4.1 Implementar `JwtAuthGuard`: verifica firma, carga sesión por `sid`, chequea `revokedAt`/`expiresAt` (`SESSION_REVOKED`/`SESSION_EXPIRED`), y si `org` presente verifica `OrganizationMembership ACTIVE` (`ORGANIZATION_ACCESS_DENIED`).
- [ ] 4.2 Implementar decoradores `@CurrentUser()` / `@CurrentTenant()` y servicio de contexto de tenant reutilizable.

## 5. Controller, módulo y wiring

- [ ] 5.1 Crear `auth.controller.ts` con los 6 endpoints y `AuthModule` (importa `ConfigModule`, `PrismaModule`; exporta contexto).
- [ ] 5.2 Crear filtro de excepción global con contrato `{ statusCode, code, message }` y los códigos de la issue; registrar en `main.ts`.
- [ ] 5.3 Registrar `cookie-parser` en `main.ts` y `AuthModule` en `app.module.ts`.

## 6. Swagger

- [ ] 6.1 Documentar los 6 endpoints, DTOs, códigos de error y contratos de respuesta en Swagger (`@ApiTags`/`@ApiOperation`/`@ApiResponse`).

## 7. Tests

- [ ] 7.1 Unit tests de `auth.service`: registro ok / email duplicado; login A/B/C; selectOrganization válido / org ajeno; me; refresh; logout.
- [ ] 7.2 Test unitario dedicado: usuario con 1 organización activa NUNCA recibe `requiresOrganizationSelection: true`.
- [ ] 7.3 E2E (`test/auth.e2e-spec.ts`): flujos completos con supertest, incluyendo denegación cross-tenant en `select-organization` (`ORGANIZATION_ACCESS_DENIED`) y refresh vía cookie.
- [ ] 7.4 Verificar que `test/app.e2e-spec.ts` (health) sigue pasando.

## 8. Verificación final

- [ ] 8.1 Ejecutar `npm run check` (spec:validate, prisma:validate, prisma:generate, lint, test, build) y confirmar que pasa.
