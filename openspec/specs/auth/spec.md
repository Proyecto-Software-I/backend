# auth Specification

## Purpose

Provee autenticación y resolución del tenant activo para LegacyLift, respetando el modelo multi-tenant (`User → OrganizationMembership → Organization → Role`) ya definido en Prisma, mediante los endpoints de registro, login, sesión, selección de organización, refresh y logout.

## Requirements

### Requirement: Registration creates user, organization and active session
El sistema SHALL crear, en una única transacción Prisma, un `User` (estado `ACTIVE`, `emailVerifiedAt` nulo, `displayName` = `firstName + lastName`), su `UserCredential` con el password hasheado, una `Organization` (estado `TRIAL`, `deploymentMode` `SAAS`, slug generado desde `organizationName` con unicidad garantizada), una `OrganizationMembership` (`ACTIVE`, `joinedAt` = now), un rol `OWNER` (`scope` `ORGANIZATION`, `key` `OWNER`, `isSystem` `true`) con todos los permisos sembrados, vinculado a la membresía vía `MembershipRole`, y una `UserSession` con `organizationId` = la organización creada. El email SHALL normalizarse a minúsculas antes de persistir y consultar.

#### Scenario: Successful registration
- **WHEN** se envía `POST /api/auth/register` con email, password (≥8), firstName, lastName y organizationName válidos y no duplicados
- **THEN** el sistema responde `201 Created` y crea en una transacción User, UserCredential, Organization, OrganizationMembership, rol OWNER con permisos y UserSession con organizationId fijado

#### Scenario: Duplicate email rejected
- **WHEN** se envía `POST /api/auth/register` con un email ya registrado
- **THEN** el sistema responde `409 Conflict` con código `EMAIL_ALREADY_REGISTERED`

### Requirement: Registration response establishes the active tenant
El sistema SHALL devolver tras el registro un cuerpo con `user`, `auth` (accessToken, tokenType `Bearer`, expiresIn `900`), `activeOrganization`, `activeMembership` (con `roles: ["OWNER"]`), `memberships` y `requiresOrganizationSelection: false`. Nunca SHALL incluir hashes de password, refresh ni secrets. Tras el registro no SHALL existir selector de organización.

#### Scenario: Registration returns active organization and no selection
- **WHEN** el registro es exitoso
- **THEN** la respuesta trae `activeOrganization` poblado, `activeMembership.roles` incluye `OWNER`, `requiresOrganizationSelection` es `false` y no se devuelven campos internos sensibles

### Requirement: Login auto-selects the single active organization
El sistema SHALL, para un usuario con exactamente una `OrganizationMembership` `ACTIVE`, crear una `UserSession` con `organizationId` = esa organización y responder con `activeOrganization` poblado y `requiresOrganizationSelection: false`.

#### Scenario: Login with one active membership
- **WHEN** se envía `POST /api/auth/login` con credenciales válidas y el usuario tiene una sola membresía ACTIVE
- **THEN** la respuesta trae `activeOrganization` no nulo, `requiresOrganizationSelection` `false` y la sesión queda con organizationId fijado

### Requirement: Login with multiple active organizations requires explicit selection
El sistema SHALL, para un usuario con dos o más `OrganizationMembership` `ACTIVE`, crear la `UserSession` con `organizationId` nulo y responder con `activeOrganization: null`, `activeMembership: null` y `requiresOrganizationSelection: true`, sin elegir organización arbitrariamente.

#### Scenario: Login with multiple active memberships
- **WHEN** el usuario tiene dos o más membresías ACTIVE
- **THEN** la respuesta trae `activeOrganization` nulo, `requiresOrganizationSelection` `true` y la sesión queda con organizationId nulo

### Requirement: Login rejects users without an active membership
El sistema SHALL rechazar el login con `401` y código `NO_ACTIVE_MEMBERSHIP` cuando las credenciales sean válidas pero el usuario no tenga ninguna `OrganizationMembership` `ACTIVE`, sin crear sesión tenant-scoped.

#### Scenario: Login with no active membership
- **WHEN** las credenciales son válidas pero no existe membresía ACTIVE
- **THEN** el sistema responde `401` con código `NO_ACTIVE_MEMBERSHIP` y no crea UserSession con organizationId

### Requirement: Login rejects invalid credentials without differentiation
El sistema SHALL responder `401` con código `INVALID_CREDENTIALS` tanto para email inexistente como para password incorrecto, sin revelar cuál de los dos falló.

#### Scenario: Unknown email
- **WHEN** se envía `POST /api/auth/login` con un email no registrado
- **THEN** el sistema responde `401` con código `INVALID_CREDENTIALS`

#### Scenario: Wrong password
- **WHEN** se envía `POST /api/auth/login` con email válido y password incorrecto
- **THEN** el sistema responde `401` con código `INVALID_CREDENTIALS` (idéntico al caso de email inexistente)

### Requirement: Login rejects users who are not active
El sistema SHALL rechazar el login con `401` y código `USER_NOT_ACTIVE` cuando el `User` no tiene estado `ACTIVE`, aunque las credenciales hasheadas coincidan.

#### Scenario: Non-active user
- **WHEN** se autentica un usuario con estado distinto de ACTIVE
- **THEN** el sistema responde `401` con código `USER_NOT_ACTIVE`

### Requirement: Organization selection validates active membership ownership
El endpoint `POST /api/auth/select-organization` SHALL requerir autenticación y verificar que el `organizationId` solicitado corresponda a una `OrganizationMembership` `ACTIVE` del usuario autenticado; en caso válido SHALL actualizar `UserSession.organizationId` y emitir un nuevo access token con el tenant activo, respondiendo con `requiresOrganizationSelection: false`.

#### Scenario: Valid selection
- **WHEN** un usuario autenticado selecciona una organización donde tiene membresía ACTIVE
- **THEN** la sesión queda con organizationId fijado, se emite nuevo access token y la respuesta trae `activeOrganization` poblado y `requiresOrganizationSelection` `false`

### Requirement: Organization selection rejects organizations the user does not belong to
El sistema SHALL responder `403` con código `ORGANIZATION_ACCESS_DENIED` si el `organizationId` no es una membresía ACTIVE del usuario, sin confiar en el UUID recibido.

#### Scenario: Foreign organization
- **WHEN** un usuario autenticado envía un organizationId que no le pertenece o no tiene membresía ACTIVE
- **THEN** el sistema responde `403` con código `ORGANIZATION_ACCESS_DENIED`

### Requirement: Current session reflects active organization and membership
El endpoint `GET /api/auth/me` SHALL devolver, para un Bearer token válido, `user`, `activeOrganization`, `activeMembership`, `memberships` y `requiresOrganizationSelection`. Si la sesión existe sin organización (proceso de selección), SHALL devolver `activeOrganization: null`, `activeMembership: null` y `requiresOrganizationSelection: true`. Nunca SHALL devolver hashes de password, refresh ni secrets.

#### Scenario: Authenticated session with active tenant
- **WHEN** se consulta `GET /api/auth/me` con un token de sesión que tiene organizationId
- **THEN** la respuesta trae activeOrganization, activeMembership y memberships poblados y `requiresOrganizationSelection` `false`

#### Scenario: Session pending organization selection
- **WHEN** se consulta `GET /api/auth/me` con un token de sesión sin organizationId
- **THEN** la respuesta trae activeOrganization nulo, activeMembership nulo y `requiresOrganizationSelection` `true`

### Requirement: Access token is a JWT carrying subject, session and tenant
El sistema SHALL emitir access tokens como JWT con payload `{ sub: userId, sid: sessionId, org: organizationId | null }`, duración por defecto 15 minutos, sin roles ni permisos en el payload. `org` SHALL ser `null` únicamente durante el flujo excepcional de selección múltiple no resuelta.

#### Scenario: Token payload shape
- **WHEN** se emite un access token
- **THEN** el JWT contiene `sub`, `sid` y `org`, no contiene roles ni permisos, y `org` es null solo si la sesión no tiene organizationId

### Requirement: Refresh issues a new access token via HttpOnly cookie
El endpoint `POST /api/auth/refresh` SHALL leer el refresh token desde la cookie `legacylift_refresh` (`HttpOnly`, `SameSite=Lax`, `Secure` solo en producción, `Path=/api/auth`), validarlo contra `UserSession.refreshTokenHash`, y emitir un nuevo access token conservando el tenant activo de la sesión. El refresh token nuevo SHALL rotarse (reescribir `refreshTokenHash`) y la cookie SHALL renovarse; el refresh token nunca SHALL devolverse en JSON.

#### Scenario: Successful refresh
- **WHEN** se envía `POST /api/auth/refresh` con cookie válida y sesión no revocada ni expirada
- **THEN** el sistema responde con nuevo access token que conserva el tenant, rota el refresh token y renueva la cookie, sin devolver el refresh en el cuerpo

### Requirement: Logout revokes the session and invalidates the refresh token
El endpoint `POST /api/auth/logout` SHALL, para un usuario autenticado, asignar `UserSession.revokedAt`, invalidar el refresh token y eliminar la cookie `legacylift_refresh`, respondiendo `204 No Content`.

#### Scenario: Logout
- **WHEN** se envía `POST /api/auth/logout` autenticado
- **THEN** la sesión queda revocada, la cookie se elimina y el sistema responde `204`

### Requirement: Errors follow the standardized error contract
El sistema SHALL responder errores con cuerpo `{ statusCode, code, message }` y los códigos `EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`, `USER_NOT_ACTIVE`, `NO_ACTIVE_MEMBERSHIP`, `ORGANIZATION_ACCESS_DENIED`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `VALIDATION_ERROR`. Los códigos de validación SHALL usar `400`, credenciales/sesión `401`, autorización `403` y conflicto `409`.

#### Scenario: Validation error shape
- **WHEN** un request falla la validación de DTO
- **THEN** el sistema responde `400` con cuerpo `{ statusCode: 400, code: "VALIDATION_ERROR", message: <descripción> }`

#### Scenario: Revoked session
- **WHEN** se usa un token cuya sesión tiene `revokedAt` seteado
- **THEN** el sistema responde `401` con código `SESSION_REVOKED`

#### Scenario: Expired session
- **WHEN** se usa un token cuya sesión superó `expiresAt`
- **THEN** el sistema responde `401` con código `SESSION_EXPIRED`

### Requirement: Tenant-scoped authorization verifies membership and never trusts a bare UUID
Para cualquier request tenant-scoped, el sistema SHALL resolver el contexto demostrando `Usuario autenticado → UserSession → organización activa → OrganizationMembership ACTIVE → Role/Permission`, y NUNCA autorizar acceso a un recurso usando únicamente su UUID. Esta verificación SHALL aplicar a `me`, `select-organization`, `refresh` y `logout`.

#### Scenario: Request with revoked or expired session is denied
- **WHEN** un request autenticado llega con sesión revocada o expirada
- **THEN** el sistema responde `401` con `SESSION_REVOKED` o `SESSION_EXPIRED` según corresponda

#### Scenario: Request with active tenant verifies membership
- **WHEN** un request autenticado llega con sesión válida y organizationId presente
- **THEN** el sistema verifica que existe OrganizationMembership ACTIVE para ese usuario y organización antes de continuar

### Requirement: Authentication requires AUTH_* environment configuration
El sistema SHALL requerir las variables `AUTH_JWT_SECRET`, `AUTH_ACCESS_TOKEN_TTL` (defecto `15m`) y `AUTH_REFRESH_TOKEN_TTL_DAYS` (defecto `30`), declaradas en `.env.example` y validadas por el `ConfigModule`. El bootstrap SHALL fallar si `AUTH_JWT_SECRET` no está presente.

#### Scenario: Missing JWT secret at bootstrap
- **WHEN** la aplicación arranca sin `AUTH_JWT_SECRET`
- **THEN** el `ConfigModule` rechaza la configuración y el arranque falla

### Requirement: Endpoints are documented in Swagger
El sistema SHALL documentar en Swagger/OpenAPI los seis endpoints (`register`, `login`, `me`, `select-organization`, `refresh`, `logout`), sus DTOs, códigos de error y contratos de respuesta, coherentes con el contrato de la issue #5.

#### Scenario: Swagger reflects the contract
- **WHEN** se consulta la documentación en `/docs`
- **THEN** los seis endpoints aparecen con sus métodos, bodies y respuestas según el contrato
