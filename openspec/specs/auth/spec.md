# auth Specification

## Purpose

Provee autenticación y resolución del tenant activo para LegacyLift, respetando el modelo multi-tenant (`User → OrganizationMembership → Organization → Role`) ya definido en Prisma, mediante los endpoints de registro, login, sesión, selección de organización, refresh y logout.

## Requirements

### Requirement: Registration creates user, organization and active session
El sistema SHALL soportar dos modos mutuamente excluyentes en `POST /api/auth/register`: registro normal y registro por invitación. En modo normal, el sistema SHALL crear, en una única transacción Prisma, un `User` (estado `ACTIVE`, `emailVerifiedAt` nulo, `displayName` = `firstName + lastName`), su `UserCredential` con el password hasheado, una `Organization` (estado `TRIAL`, `deploymentMode` `SAAS`, slug generado desde `organizationName` con unicidad garantizada), una `OrganizationMembership` (`ACTIVE`, `joinedAt` = now), un rol `OWNER` (`scope` `ORGANIZATION`, `key` `OWNER`, `isSystem` `true`) con todos los permisos sembrados, un rol `MEMBER` (`scope` `ORGANIZATION`, `key` `MEMBER`, `isSystem` `true`) con `organization.read` y `members.read`, el vínculo `MembershipRole` del usuario al rol `OWNER`, y una `UserSession` con `organizationId` = la organización creada. En modo invitación, el sistema SHALL recibir `password`, `firstName`, `lastName` e `invitationToken`, obtener el email desde una invitación válida, no aceptar `email` ni `organizationName`, no crear una nueva `Organization`, crear `User`, `UserCredential`, `OrganizationMembership ACTIVE`, asignar el rol `MEMBER`, marcar la invitación `ACCEPTED`, y crear una `UserSession` con `organizationId` = la organización de la invitación. El modo invitación SHALL ejecutar todo el aggregate operation dentro de una transacción Serializable con retry acotado ante `P2034`; cualquier provisioning compartido SHALL usar el mismo `Prisma.TransactionClient` de esa transacción. Si el token de invitación no existe o no es usable, la operación SHALL fallar atómicamente sin crear parcialmente `User`, `UserCredential`, `OrganizationMembership`, `MembershipRole` ni `UserSession`. El email SHALL normalizarse a minúsculas antes de persistir y consultar.

#### Scenario: Successful registration
- **GIVEN** no usuario existente usa el email normalizado
- **WHEN** se envía `POST /api/auth/register` con email, password (≥8), firstName, lastName y organizationName válidos y sin `invitationToken`
- **THEN** el sistema responde `201 Created` y crea en una transacción User, UserCredential, Organization, OrganizationMembership, rol OWNER con permisos, rol MEMBER con permisos de lectura, MembershipRole OWNER y UserSession con organizationId fijado

#### Scenario: Duplicate email rejected
- **GIVEN** ya existe un usuario con el email normalizado
- **WHEN** se envía `POST /api/auth/register` en modo normal o invitación para ese email
- **THEN** el sistema responde `409 Conflict` con código `EMAIL_ALREADY_REGISTERED`

#### Scenario: Successful invitation registration
- **GIVEN** `invitationToken` corresponde a una invitación `PENDING` no expirada y ningún usuario existe con el email de la invitación
- **WHEN** se envía `POST /api/auth/register` con password, firstName, lastName e invitationToken válidos, sin email y sin organizationName
- **THEN** el sistema responde `201 Created`, crea User, UserCredential, OrganizationMembership ACTIVE, asigna MEMBER, marca la invitación ACCEPTED, crea UserSession con la organización invitante activa y no crea una nueva Organization

#### Scenario: Invitation registration uses one transaction boundary
- **GIVEN** se procesa un registro por invitación válido
- **WHEN** el sistema asegura MEMBER, crea membership, asigna MembershipRole, consume la invitación y crea la sesión
- **THEN** todas esas operaciones usan el mismo `Prisma.TransactionClient` dentro de una transacción Serializable y ningún provisioning abre una transacción separada

#### Scenario: Invitation registration retries only serializable conflicts
- **GIVEN** una transacción Serializable de registro por invitación falla con Prisma `P2034`
- **WHEN** no se ha superado el límite de retry
- **THEN** el sistema reintenta la transacción completa con un nuevo transaction client, hasta un máximo de 3 intentos totales, sin reintentar errores funcionales

#### Scenario: Registration modes are mutually exclusive
- **GIVEN** un request de registro incluye `invitationToken` junto con `email` u `organizationName`
- **WHEN** se envía `POST /api/auth/register`
- **THEN** el sistema responde `400` con código `VALIDATION_ERROR`

#### Scenario: Invitation registration with unknown token
- **GIVEN** `invitationToken` no corresponde a ninguna invitación existente
- **WHEN** se envía `POST /api/auth/register` en modo invitación
- **THEN** el sistema responde `404` con código `INVITATION_NOT_FOUND` y no crea User, UserCredential, membership, MembershipRole ni UserSession

#### Scenario: Invitation registration with expired token
- **GIVEN** `invitationToken` corresponde a una invitación `EXPIRED` o a una invitación `PENDING` con `expiresAt` anterior a ahora
- **WHEN** se envía `POST /api/auth/register` en modo invitación
- **THEN** el sistema responde `410` con código `INVITATION_EXPIRED` y no crea User, UserCredential, membership, MembershipRole ni UserSession

#### Scenario: Invitation registration with revoked token
- **GIVEN** `invitationToken` corresponde a una invitación `REVOKED`
- **WHEN** se envía `POST /api/auth/register` en modo invitación
- **THEN** el sistema responde `410` con código `INVITATION_REVOKED` y no crea User, UserCredential, membership, MembershipRole ni UserSession

#### Scenario: Invitation registration with already accepted token
- **GIVEN** `invitationToken` corresponde a una invitación `ACCEPTED`
- **WHEN** se envía `POST /api/auth/register` en modo invitación
- **THEN** el sistema responde `409` con código `INVITATION_ALREADY_ACCEPTED` y no crea User, UserCredential, membership, MembershipRole ni UserSession

### Requirement: Registration response establishes the active tenant
El sistema SHALL devolver tras el registro un cuerpo con `user`, `auth` (accessToken, tokenType `Bearer`, expiresIn `900`), `activeOrganization`, `activeMembership` (con `roles` y `permissions`), `memberships` y `requiresOrganizationSelection: false`. En registro normal, `activeMembership.roles` SHALL incluir `OWNER` y `activeMembership.permissions` SHALL incluir permisos actuales derivados de base de datos para el rol OWNER. En registro por invitación, `activeMembership.roles` SHALL incluir `MEMBER` y `activeMembership.permissions` SHALL incluir `organization.read` y `members.read`, sin `members.manage`. Nunca SHALL incluir hashes de password, refresh, tokens de invitación ni secrets. Tras el registro no SHALL existir selector de organización.

#### Scenario: Registration returns active organization and no selection
- **GIVEN** el registro normal es exitoso
- **WHEN** el sistema responde a `POST /api/auth/register`
- **THEN** la respuesta trae `activeOrganization` poblado, `activeMembership.roles` incluye `OWNER`, `activeMembership.permissions` está poblado desde base de datos, `requiresOrganizationSelection` es `false` y no se devuelven campos internos sensibles

#### Scenario: Invitation registration returns MEMBER permissions
- **GIVEN** el registro por invitación es exitoso
- **WHEN** el sistema responde a `POST /api/auth/register`
- **THEN** la respuesta trae `activeOrganization` de la invitación, `activeMembership.roles` incluye `MEMBER`, `activeMembership.permissions` incluye `organization.read` y `members.read`, no incluye `members.manage`, y `requiresOrganizationSelection` es `false`

### Requirement: Login auto-selects the single active organization
El sistema SHALL, para un usuario con exactamente una `OrganizationMembership` `ACTIVE`, crear una `UserSession` con `organizationId` = esa organización y responder con `activeOrganization` poblado, `activeMembership` con `roles` y `permissions` derivados de base de datos, y `requiresOrganizationSelection: false`.

#### Scenario: Login with one active membership
- **GIVEN** un usuario tiene credenciales válidas y exactamente una membresía ACTIVE
- **WHEN** se envía `POST /api/auth/login`
- **THEN** la respuesta trae `activeOrganization` no nulo, `activeMembership.permissions` poblado desde base de datos, `requiresOrganizationSelection` `false` y la sesión queda con organizationId fijado

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
El endpoint `POST /api/auth/select-organization` SHALL requerir autenticación y verificar que el `organizationId` solicitado corresponda a una `OrganizationMembership` `ACTIVE` del usuario autenticado; en caso válido SHALL actualizar `UserSession.organizationId`, emitir un nuevo access token con el tenant activo, y responder con `activeMembership.roles` y `activeMembership.permissions` derivados de base de datos y `requiresOrganizationSelection: false`.

#### Scenario: Valid selection
- **GIVEN** un usuario autenticado tiene una membresía ACTIVE en la organización solicitada
- **WHEN** el usuario envía `POST /api/auth/select-organization` con esa organización
- **THEN** la sesión queda con organizationId fijado, se emite nuevo access token y la respuesta trae `activeOrganization` poblado, `activeMembership.permissions` poblado desde base de datos y `requiresOrganizationSelection` `false`

### Requirement: Organization selection rejects organizations the user does not belong to
El sistema SHALL responder `403` con código `ORGANIZATION_ACCESS_DENIED` si el `organizationId` no es una membresía ACTIVE del usuario, sin confiar en el UUID recibido.

#### Scenario: Foreign organization
- **WHEN** un usuario autenticado envía un organizationId que no le pertenece o no tiene membresía ACTIVE
- **THEN** el sistema responde `403` con código `ORGANIZATION_ACCESS_DENIED`

### Requirement: Current session reflects active organization and membership
El endpoint `GET /api/auth/me` SHALL devolver, para un Bearer token válido, `user`, `activeOrganization`, `activeMembership`, `memberships` y `requiresOrganizationSelection`. Cuando exista tenant activo, `activeMembership` SHALL incluir `roles` y `permissions` derivados de base de datos. Si la sesión existe sin organización (proceso de selección), SHALL devolver `activeOrganization: null`, `activeMembership: null` y `requiresOrganizationSelection: true`. Nunca SHALL devolver hashes de password, refresh, invitation tokens ni secrets.

#### Scenario: Authenticated session with active tenant
- **GIVEN** una sesión autenticada válida tiene organizationId activo
- **WHEN** se consulta `GET /api/auth/me` con el Bearer token de esa sesión
- **THEN** la respuesta trae activeOrganization, activeMembership con roles y permissions, memberships poblados y `requiresOrganizationSelection` `false`

#### Scenario: Session pending organization selection
- **GIVEN** una sesión autenticada válida no tiene organizationId activo
- **WHEN** se consulta `GET /api/auth/me` con el Bearer token de esa sesión
- **THEN** la respuesta trae activeOrganization nulo, activeMembership nulo y `requiresOrganizationSelection` `true`

### Requirement: Access token is a JWT carrying subject, session and tenant
El sistema SHALL emitir access tokens como JWT con payload `{ sub: userId, sid: sessionId, org: organizationId | null }`, duración por defecto 15 minutos, sin roles ni permisos en el payload. `org` SHALL ser `null` únicamente durante el flujo excepcional de selección múltiple no resuelta o después de que una membresía suspendida/removida haya dejado a la sesión sin tenant activo.

#### Scenario: Token payload shape
- **GIVEN** el sistema emite un access token para cualquier flujo de auth
- **WHEN** se inspecciona el payload JWT
- **THEN** el JWT contiene `sub`, `sid` y `org`, no contiene roles ni permisos, y los permisos se obtienen desde la base de datos cuando se construye la respuesta o se autoriza un request

### Requirement: Refresh issues a new access token via HttpOnly cookie
El endpoint `POST /api/auth/refresh` SHALL leer el refresh token desde la cookie `legacylift_refresh` (`HttpOnly`, `SameSite=Lax`, `Secure` solo en producción, `Path=/api/auth`), validarlo contra `UserSession.refreshTokenHash`, y emitir un nuevo access token conservando el tenant activo actual de la sesión. Si la sesión quedó con `organizationId` nulo por suspensión o remoción de membership, el nuevo access token SHALL contener `org: null`. El refresh token nuevo SHALL rotarse (reescribir `refreshTokenHash`) y la cookie SHALL renovarse; el refresh token nunca SHALL devolverse en JSON.

#### Scenario: Successful refresh
- **GIVEN** existe una sesión con refresh token válido, no revocada y no expirada
- **WHEN** se envía `POST /api/auth/refresh` con cookie válida
- **THEN** el sistema responde con nuevo access token que conserva el tenant actual de la sesión, rota el refresh token y renueva la cookie, sin devolver el refresh en el cuerpo

#### Scenario: Refresh after tenant invalidation
- **GIVEN** la sesión de un usuario tenía organizationId activo y luego su membership fue suspendida o removida, dejando `UserSession.organizationId` en null
- **WHEN** se envía `POST /api/auth/refresh` con cookie válida de esa sesión
- **THEN** el sistema responde con un nuevo access token cuyo payload contiene `org: null`

### Requirement: Logout revokes the session and invalidates the refresh token
El endpoint `POST /api/auth/logout` SHALL, para un usuario autenticado, asignar `UserSession.revokedAt`, invalidar el refresh token y eliminar la cookie `legacylift_refresh`, respondiendo `204 No Content`.

#### Scenario: Logout
- **WHEN** se envía `POST /api/auth/logout` autenticado
- **THEN** la sesión queda revocada, la cookie se elimina y el sistema responde `204`

### Requirement: Errors follow the standardized error contract
El sistema SHALL responder errores con cuerpo `{ statusCode, code, message }` y los códigos `EMAIL_ALREADY_REGISTERED`, `INVALID_CREDENTIALS`, `USER_NOT_ACTIVE`, `NO_ACTIVE_MEMBERSHIP`, `ORGANIZATION_ACCESS_DENIED`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `VALIDATION_ERROR`, `INVITATION_NOT_FOUND`, `INVITATION_EXPIRED`, `INVITATION_REVOKED`, `INVITATION_ALREADY_ACCEPTED` e `INVITATION_EMAIL_MISMATCH`. Los códigos de validación SHALL usar `400`, credenciales/sesión `401`, autorización `403`, no encontrado `404`, expirado/revocado `410` y conflicto `409`.

#### Scenario: Validation error shape
- **GIVEN** un request falla la validación de DTO, incluyendo un request de registro que mezcla modo normal e invitación
- **WHEN** el sistema rechaza el request
- **THEN** el sistema responde `400` con cuerpo `{ statusCode: 400, code: "VALIDATION_ERROR", message: <descripción> }`

#### Scenario: Revoked session
- **GIVEN** se usa un token cuya sesión tiene `revokedAt` seteado
- **WHEN** el usuario llama un endpoint autenticado
- **THEN** el sistema responde `401` con código `SESSION_REVOKED`

#### Scenario: Expired session
- **GIVEN** se usa un token cuya sesión superó `expiresAt`
- **WHEN** el usuario llama un endpoint autenticado
- **THEN** el sistema responde `401` con código `SESSION_EXPIRED`

### Requirement: Tenant-scoped authorization verifies membership and never trusts a bare UUID
Para cualquier request tenant-scoped, el sistema SHALL resolver el contexto demostrando `Usuario autenticado -> UserSession -> organización activa -> OrganizationMembership ACTIVE -> Role/Permission`, y NUNCA autorizar acceso a un recurso usando únicamente su UUID. Esta verificación SHALL aplicar a `me`, `select-organization`, `refresh`, `logout`, y a los endpoints de organización que administran members e invitations. Los permisos SHALL salir del estado actual de la base de datos y no del JWT.

#### Scenario: Request with revoked or expired session is denied
- **GIVEN** un request autenticado llega con sesión revocada o expirada
- **WHEN** el request alcanza un endpoint protegido
- **THEN** el sistema responde `401` con `SESSION_REVOKED` o `SESSION_EXPIRED` según corresponda

#### Scenario: Request with active tenant verifies membership
- **GIVEN** un request autenticado llega con sesión válida y organizationId presente
- **WHEN** el request alcanza un endpoint tenant-scoped
- **THEN** el sistema verifica que existe OrganizationMembership ACTIVE para ese usuario y organización antes de continuar

#### Scenario: Permission check reads current database permissions
- **GIVEN** un request autenticado llega a un endpoint que requiere un permiso
- **WHEN** el sistema evalúa la autorización
- **THEN** resuelve los permisos desde MembershipRole, RolePermission y Permission en la base de datos actual y no desde el JWT

### Requirement: Authentication requires AUTH_* environment configuration
El sistema SHALL requerir las variables `AUTH_JWT_SECRET`, `AUTH_ACCESS_TOKEN_TTL` (defecto `15m`) y `AUTH_REFRESH_TOKEN_TTL_DAYS` (defecto `30`), declaradas en `.env.example` y validadas por el `ConfigModule`. El bootstrap SHALL fallar si `AUTH_JWT_SECRET` no está presente.

#### Scenario: Missing JWT secret at bootstrap
- **WHEN** la aplicación arranca sin `AUTH_JWT_SECRET`
- **THEN** el `ConfigModule` rechaza la configuración y el arranque falla

### Requirement: Endpoints are documented in Swagger
El sistema SHALL documentar en Swagger/OpenAPI los endpoints existentes de auth (`register`, `login`, `me`, `select-organization`, `refresh`, `logout`), el modo normal y el modo invitation de `register`, sus DTOs, códigos de error y contratos de respuesta, incluyendo `activeMembership.permissions`, coherentes con el contrato de la issue #10.

#### Scenario: Swagger reflects the contract
- **GIVEN** el backend está ejecutándose
- **WHEN** se consulta la documentación en `/docs`
- **THEN** los endpoints de auth aparecen con sus métodos, bodies, responses, modo normal vs invitation en register, permisos en activeMembership y errores según el contrato
