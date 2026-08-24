## Context

See `proposal.md` for motivation. The current backend has NestJS 11, `AppModule`, global `PrismaModule`, and `AuthModule` from Issue #5. Auth already provides `JwtAuthGuard`, `CurrentUser`, `CurrentTenant`, `AuthService`, `SessionService`, and `TokenService`. `UserSession.organizationId` is the source of the active tenant, and JWT payloads contain only `{ sub, sid, org }`.

The Prisma models required by Issue #10 already exist in `prisma/schema/auth-tenancy.prisma`: `User`, `UserCredential`, `UserSession`, `Organization`, `OrganizationMembership`, `OrganizationInvitation`, `Role`, `MembershipRole`, `Permission`, and `RolePermission`. `OrganizationInvitation` already has `tokenHash`, `expiresAt`, `acceptedAt`, `invitedByUserId`, `proposedRoleId`, and statuses `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`. `OrganizationMembership` already has `ACTIVE`, `SUSPENDED`, and `REMOVED`. No schema or migration work is required.

Existing Auth creates `OWNER` per organization at normal registration time and grants it all seeded permissions. The seed already creates `organization.read`, `members.read`, and `members.manage`. Auth response construction currently includes membership role keys but not permission keys.

## Goals / Non-Goals

**Goals:**

- Keep Auth responsible for authentication, sessions, credentials, and Auth response contracts.
- Add an Organizations domain responsible for member administration and invitations.
- Add reusable access-control infrastructure that can protect future tenant-scoped modules without depending on Organizations business logic.
- Use `UserSession.organizationId` exclusively as tenant source for administrative endpoints.
- Keep permissions current by reading them from the database per protected request, with only request-local reuse.
- Make invitation acceptance and invitation registration atomic and replay-resistant.
- Preserve normal registration behavior while adding invitation registration.
- Avoid `AuthModule <-> OrganizationsModule` circular imports and avoid `forwardRef` as a default design.

**Non-Goals:**

- No Prisma schema changes, migrations, generated client edits, or new dependencies.
- No role UI, custom roles, manual role assignment, permission editing, ProjectAccess, ownership transfer, restoring `REMOVED`, billing seats, email provider, resend automation, groups, or teams.
- No global permission cache. Permission changes should be visible on subsequent requests.

## Decisions

### D1. Add an Organizations domain module

Create a domain module with this target shape:

```text
src/organizations/
├── dto/
├── services/
│   ├── memberships.service.ts
│   ├── invitations.service.ts
│   └── organization-roles.service.ts
├── organizations.controller.ts
├── invitations.controller.ts
└── organizations.module.ts
```

`OrganizationsController` owns `/api/organizations/current/*` endpoints. `InvitationsController` owns `/api/invitations/:token` public preview and authenticated acceptance. Controllers stay thin: DTO validation, Swagger, guards/decorators, and delegation.

Alternative considered: place invitation acceptance under `AuthController`. Rejected because accepting/listing/revoking invitations and managing memberships are organization domain behavior, not authentication. Auth only participates when registration creates credentials and sessions.

### D2. Introduce neutral access-control infrastructure

Create a reusable area such as:

```text
src/access-control/
├── decorators/require-permissions.decorator.ts
├── guards/permission.guard.ts
└── access-control.module.ts
```

`@RequirePermissions('members.read')` stores required permission keys as metadata. `PermissionGuard` runs after `JwtAuthGuard` and reads the authenticated context from the request. It rejects `organizationId = null` with `TENANT_REQUIRED`, loads the active membership and permissions from the current database state, and rejects missing permissions with `MEMBER_ACCESS_DENIED`.

Expected guard flow:

```text
JwtAuthGuard
  -> req.user = { userId, sessionId, organizationId }
PermissionGuard
  -> organizationId must be non-null
  -> OrganizationMembership ACTIVE for userId + organizationId
  -> MembershipRole -> Role -> RolePermission -> Permission.key
  -> all required permission keys must be present
```

The guard may attach request-local data such as `membershipId` and `permissions` to the request to avoid repeated queries inside the same request. It must not use a process-wide cache and must not put permissions in JWTs.

Alternative considered: extend `JwtAuthGuard` to always load permissions. Rejected because many authenticated endpoints do not need permission evaluation, and it would increase query cost for basic Auth endpoints.

### D3. Avoid circular dependency with a required provisioning module

`AuthModule` should not import `OrganizationsModule` while `OrganizationsModule` imports Auth guards, because that creates a direct cycle. The shared logic needed by both sides is role provisioning and invitation acceptance primitives, not controller-level organization behavior.

Create a required lower-level module, named `OrganizationProvisioningModule` or an equivalent neutral name, with providers that depend only on `PrismaService`/`PrismaModule` and small local helpers. This module MUST NOT import `AuthModule` or `OrganizationsModule`.

The provisioning module encapsulates only shared domain primitives needed by Auth and Organizations:

- `OrganizationRolesService`: ensure `OWNER` and `MEMBER` roles and role permissions idempotently.
- invitation acceptance/provisioning operations: validate an invitation, create or activate a membership only when allowed by the spec, assign MEMBER, and mark invitations accepted inside a transaction.

Provisioning methods that participate in an atomic operation MUST accept an explicit Prisma transaction client, using `Prisma.TransactionClient` or the equivalent generated type for the installed Prisma version. If a caller starts `prisma.$transaction(async (tx) => { ... })`, every provisioning operation that belongs to that aggregate operation MUST use the same `tx`. The provisioning module MUST NOT open a nested transaction or use the root `PrismaService` inside those transactional methods. A non-transaction convenience wrapper may exist only for operations that are not part of a larger atomic flow.

Critical transaction-bound provisioning methods include ensuring MEMBER, assigning MEMBER, creating membership plus MembershipRole, invitation state transitions, existing-user invitation acceptance, and register-with-invitation.

Required module direction:

```text
AppModule
├── AuthModule
├── OrganizationsModule
├── AccessControlModule
└── OrganizationProvisioningModule

AuthModule -> OrganizationProvisioningModule
OrganizationsModule -> AuthModule for JwtAuthGuard exports, AccessControlModule, OrganizationProvisioningModule
OrganizationProvisioningModule -> PrismaModule only
AccessControlModule -> PrismaModule only
```

`AuthModule` MUST NOT import `OrganizationsModule`. `OrganizationsModule` may import `AuthModule` only to reuse exported authentication guards/context. `forwardRef` is not part of the primary design and should not be used unless a later reviewed design change proves it is strictly necessary.

### D4. Tenant isolation by query shape, not by convention

Every administrative operation uses `UserSession.organizationId` from `CurrentUser` or `CurrentTenant` after `JwtAuthGuard`. No endpoint accepts `organizationId` in body, query, params, or `X-Organization-Id` for authorization.

Resource lookups use combined predicates:

- invitation admin: `id = invitationId AND organizationId = activeOrganizationId`
- membership admin: `id = membershipId AND organizationId = activeOrganizationId`

Cross-tenant IDs should return not-found style functional errors (`INVITATION_NOT_FOUND` or `MEMBERSHIP_NOT_FOUND`) rather than revealing existence in another tenant.

### D5. MEMBER role provisioning

`OrganizationRolesService` should ensure:

- `OWNER`: current behavior remains: organization-scoped system role with all seeded permissions.
- `MEMBER`: organization-scoped system role with `organization.read` and `members.read`, without `members.manage`.

Use the existing unique constraint `@@unique([organizationId, scope, key])` through upsert. `RolePermission` has compound primary key, so assigning permissions is idempotent.

For new organizations, normal registration should create/ensure both `OWNER` and `MEMBER`. The creator remains assigned only to `OWNER` unless the implementation deliberately assigns both and the response remains compatible. Simpler: assign only OWNER to the creator because OWNER has all permissions.

For existing organizations, invitation creation and acceptance should ensure MEMBER before using it. This covers organizations created before Issue #10.

### D6. Invitation token handling

Use Node `crypto` directly or a small organization-local helper:

- generate plaintext token using `crypto.randomBytes(48).toString('hex')` or equivalent high-entropy random bytes;
- hash with SHA-256;
- store only `OrganizationInvitation.tokenHash`;
- return plaintext token only in `acceptanceUrl` from `POST /api/organizations/current/invitations`;
- never return plaintext token or `tokenHash` from list, preview, or accept responses.

Do not couple Organizations to `TokenService` if that would imply JWT semantics. If reusing only the SHA-256 behavior is attractive, extract a neutral token-hashing helper rather than making invitation code depend on JWT token signing.

`acceptanceUrl` should be composed with the frontend invite route. If no existing config variable exists for frontend invite path, use `FRONTEND_URL` plus a documented `/invite/<TOKEN>` path without adding new environment variables unless implementation finds it necessary and the approved scope is updated.

### D7. Expiration without cron

Treat `PENDING + expiresAt < now` as expired whenever an invitation is listed, previewed, accepted, or used for registration. Persist `EXPIRED` opportunistically during those reads/writes for audit consistency.

This avoids cron while keeping state coherent enough for operators and tests. Expired invitations do not block new invitations for the same email.

### D8. Serializable transactions and retry policy

Transactions that protect concurrent invariants MUST use `Prisma.TransactionIsolationLevel.Serializable` or the exact equivalent API exposed by the installed Prisma version for PostgreSQL. This applies at minimum to:

- invitation creation, to protect one current `PENDING` invitation per organization and normalized email;
- invitation acceptance, to protect single-use `PENDING -> ACCEPTED` consumption;
- last-owner suspend/remove operations, to prevent concurrent mutations from leaving zero active owners;
- register-with-invitation, because it combines user, credential, membership, role assignment, session creation, and invitation consumption.

Serializable conflicts can surface as Prisma `P2034`. The implementation MUST define a bounded helper such as `runSerializableTransactionWithRetry(callback)` that:

1. starts a new Serializable transaction for each attempt;
2. executes the whole callback inside that transaction;
3. retries only when Prisma reports `P2034`;
4. never retries functional errors such as `MEMBER_ALREADY_EXISTS` or `LAST_OWNER_REQUIRED`;
5. uses a small explicit limit of 3 total attempts;
6. propagates the error after the limit;
7. never reuses a `TransactionClient` after rollback.

The retry wraps the complete transaction, not individual operations inside a failed transaction.

### D9. Invitation creation duplicate strategy

There is no database partial unique constraint for one active pending invitation per organization/email. Do not add a migration for this issue. The service MUST use one Serializable transaction with bounded `P2034` retry to:

1. normalize email;
2. check whether the target user already has an `ACTIVE`, `SUSPENDED`, or `REMOVED` membership in the active organization, rejecting with `MEMBER_ALREADY_EXISTS` if so;
3. expire stale pending invitations for that organization/email;
4. check remaining non-expired pending invitations, rejecting with `INVITATION_ALREADY_PENDING` if one exists;
5. ensure MEMBER using the same transaction client;
6. create the new invitation with `invitedByUserId = authenticated user id`, `proposedRoleId = MEMBER role id`, `tokenHash`, `expiresAt`, and status `PENDING`.

The absence of a partial unique constraint is handled within the approved no-migration scope by Serializable isolation, bounded retry, and concurrency tests. Do not add raw SQL and do not modify schema.

### D10. Existing-user acceptance transaction

For `POST /api/invitations/:token/accept`, run one Serializable transaction with bounded `P2034` retry. The invitation service MUST pass the same `Prisma.TransactionClient` to OrganizationProvisioningModule operations. The transaction must:

1. hash token and load invitation by `tokenHash`;
2. map missing/revoked/accepted/expired states to the functional errors;
3. compare normalized authenticated user email to normalized invitation email;
4. ensure MEMBER role for the invitation organization using the same transaction client;
5. reject existing `ACTIVE`, `SUSPENDED`, or `REMOVED` memberships rather than restoring them;
6. create `OrganizationMembership ACTIVE` with `joinedAt = now`;
7. create `MembershipRole` for MEMBER;
8. mark invitation `ACCEPTED` and set `acceptedAt = now`.

Use an atomic state transition for replay resistance, for example `updateMany` with `where: { id, status: PENDING }` and require `count = 1`, or equivalent transaction-safe logic. The existing unique `OrganizationMembership(organizationId, userId)` and `MembershipRole(membershipId, roleId)` constraints protect against duplicate memberships and duplicate role assignments.

The endpoint does not select the organization in the existing user's session. The frontend must call `POST /api/auth/select-organization` afterward.

### D11. Register-with-invitation transaction

Extend `RegisterDto` and `AuthService.register` to support two mutually exclusive input modes. Keep the normal registration path backward compatible.

Invitation registration should reuse the same invitation validation and acceptance primitives but also create credentials and a session. It MUST run inside one Serializable transaction with bounded `P2034` retry. `AuthService` MUST pass the same `Prisma.TransactionClient` to OrganizationProvisioningModule and must not call provisioning methods that use root `PrismaService` or open another transaction. Transaction shape:

1. hash `invitationToken` and validate pending, non-expired invitation;
2. use invitation email as the new user's normalized email;
3. reject duplicate user email;
4. hash password;
5. create `User` and `UserCredential`;
6. ensure MEMBER using the same transaction client;
7. create `OrganizationMembership ACTIVE` and `MembershipRole MEMBER`;
8. mark invitation `ACCEPTED` and set `acceptedAt`;
9. create `UserSession` with `organizationId` set to invitation organization;
10. return the same Auth response envelope as normal registration.

Auth should not become a general Organizations service. The shared acceptance/provisioning logic should sit below both domains and depend only on Prisma and small helpers.

### D12. Membership management and session tenant invalidation

Membership operations are soft-state updates only:

- `ACTIVE -> SUSPENDED`
- `SUSPENDED -> ACTIVE`
- `ACTIVE/SUSPENDED -> REMOVED`
- no restoration from `REMOVED`
- no physical delete

When status becomes `SUSPENDED` or `REMOVED`, update only sessions matching:

```text
userId = target.userId
organizationId = activeOrganizationId
revokedAt = null
```

Set `organizationId = null`; do not revoke the full session. This makes old access tokens fail because `JwtAuthGuard` compares JWT `org` against the database session. Refresh then emits a token with `org: null`, `/auth/me` requires selection, and `select-organization` rejects the suspended/removed membership.

### D13. Last owner protection and concurrency

Suspend/remove operations that may affect an owner MUST execute inside one Serializable transaction with bounded `P2034` retry. Inside the same transaction:

1. load the target by `id + organizationId` including roles;
2. determine whether it is `ACTIVE` and has organization role `OWNER`;
3. if so, count `ACTIVE` owner memberships for the same organization;
4. reject with `LAST_OWNER_REQUIRED` when count is 1.
5. otherwise mutate the membership;
6. clear `organizationId` on matching sessions for suspended/removed memberships.

This covers self-suspend and self-remove. The last-owner check MUST NOT be performed outside a transaction followed by a separate mutation. Do not use raw SQL locks for this issue.

### D14. Auth response permissions

Centralize Auth membership view construction so register, login, select-organization, and `/auth/me` all return consistent `activeMembership.permissions` when an active organization exists.

Current `getMembershipViews` should be extended or replaced by a focused helper that loads:

```text
OrganizationMembership
  -> roles.role.key
  -> roles.role.permissions.permission.key
```

Deduplicate permission keys. `memberships` can include permissions too if the implementation chooses, but the spec requires `activeMembership.permissions` at minimum. Do not add permissions to JWT payloads.

### D15. Error handling

Continue using `AuthError` and the global `HttpExceptionFilter`. The class name is auth-specific but it already provides the repository's functional error mechanism. Do not introduce a second exception format for Organizations.

Required mappings:

- `TENANT_REQUIRED` -> 403
- `MEMBER_ALREADY_EXISTS` -> 409
- `INVITATION_ALREADY_PENDING` -> 409
- `INVITATION_NOT_FOUND` -> 404
- `INVITATION_EXPIRED` -> 410
- `INVITATION_REVOKED` -> 410
- `INVITATION_ALREADY_ACCEPTED` -> 409
- `INVITATION_EMAIL_MISMATCH` -> 403
- `MEMBERSHIP_NOT_FOUND` -> 404
- `LAST_OWNER_REQUIRED` -> 409
- `MEMBER_ACCESS_DENIED` -> 403

### D16. Swagger and DTOs

Document all new endpoints with `@ApiTags`, `@ApiBearerAuth` where applicable, `@ApiOperation`, DTO schemas, success responses, and functional errors. Register must clearly show the normal mode and invitation mode as mutually exclusive. Existing Auth response docs must include `activeMembership.permissions`.

## Risks / Trade-offs

- [Risk] `AuthModule <-> OrganizationsModule` circular dependency -> Mitigation: keep shared provisioning/acceptance logic in a lower-level provider/module that depends only on Prisma; avoid `forwardRef` unless proven necessary.
- [Risk] IDOR on `membershipId` or `invitationId` -> Mitigation: always query by `id + active organizationId`; cross-tenant IDs return not found errors.
- [Risk] Tenant leakage through client-supplied `organizationId` -> Mitigation: administrative endpoints never accept tenant IDs for authorization and only use `UserSession.organizationId`.
- [Risk] Invitation token leakage -> Mitigation: store only SHA-256 hash; return plaintext only in creation `acceptanceUrl`; omit token fields elsewhere.
- [Risk] Invitation replay -> Mitigation: atomic `PENDING -> ACCEPTED` transition inside a Serializable transaction with bounded `P2034` retry.
- [Risk] Duplicate pending invitations under concurrency -> Mitigation: expire stale pending records and check/create in one Serializable transaction with bounded `P2034` retry; rely on service-level handling because no schema change is planned.
- [Risk] Last-owner race -> Mitigation: perform count, mutation, and session tenant invalidation in the same Serializable transaction with bounded `P2034` retry.
- [Risk] Stale permissions -> Mitigation: permissions are read from DB per protected request and optionally cached only on the request object.
- [Risk] Register backward compatibility -> Mitigation: keep normal payload valid and add invitation mode as mutually exclusive alternative.
- [Risk] E2E complexity with PostgreSQL -> Mitigation: keep service unit tests focused and run E2E only after `db:ensure`, `db:deploy`, and `db:seed`.

## Migration Plan

- No database migration. Do not modify `prisma/schema/*.prisma`, `prisma/migrations/*`, or `src/generated/prisma`.
- Deploy code after tests pass. Runtime will idempotently ensure MEMBER roles for new organizations and for existing organizations when invitations are created or accepted.
- Rollback is code-only. Data created by the feature (`OrganizationInvitation`, `MEMBER` roles, `MembershipRole`, and status changes) remains valid under the existing schema, though rolled-back code will not expose management endpoints.

## Open Questions

None. The required behavior, error mappings, no-schema constraint, and existing-user invitation selection behavior are defined by Issue #10 and the exploration.
