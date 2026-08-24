## 1. Module Structure And Shared Authorization

- [x] 1.1 Create the reusable access-control module area with `RequirePermissions` decorator and `PermissionGuard`.
- [x] 1.2 Implement `PermissionGuard` to require `JwtAuthGuard` context, reject null tenant with `TENANT_REQUIRED`, load active membership permissions from Prisma, and reject missing permissions with `MEMBER_ACCESS_DENIED`.
- [x] 1.3 Add request-local permission/membership reuse in `PermissionGuard` without adding global permission cache or JWT permission claims.
- [x] 1.4 Add unit tests for `PermissionGuard`: OWNER with `members.manage`, MEMBER without `members.manage`, null tenant, missing active membership, and current DB permissions.
- [x] 1.5 Create `OrganizationsModule` and wire it into `AppModule` without introducing `AuthModule <-> OrganizationsModule` circular imports.
- [x] 1.6 Create `OrganizationProvisioningModule` or equivalent neutral module imported by Auth and Organizations, depending only on `PrismaModule` and not importing Auth or Organizations.

## 2. Organization Role Provisioning

- [x] 2.1 Implement `OrganizationRolesService` or an equivalent lower-level provisioning service whose atomic-operation methods accept an explicit Prisma transaction client.
- [x] 2.2 Move or reuse OWNER role provisioning so normal registration still grants OWNER all seeded permissions.
- [x] 2.3 Implement idempotent MEMBER role provisioning with `organization.read` and `members.read`, excluding `members.manage`.
- [x] 2.4 Ensure normal registration creates or ensures both OWNER and MEMBER for new organizations while preserving the creator's OWNER membership behavior.
- [x] 2.5 Add unit tests for OWNER provisioning, MEMBER provisioning, idempotency, MEMBER permission contents, and verification that transaction-aware provisioning uses the provided transaction client instead of root PrismaService.

## 3. Serializable Transaction Support

- [x] 3.1 Implement a bounded Serializable transaction retry helper for Prisma `P2034` conflicts with 3 total attempts and no retries for functional errors.
- [x] 3.2 Ensure each retry creates a new Serializable transaction and never reuses a rolled-back transaction client.
- [x] 3.3 Use Serializable transactions for invitation creation, invitation acceptance, register-with-invitation, and last-owner membership mutations.
- [x] 3.4 Add unit tests for P2034 retry, retry limit, non-P2034 propagation, and functional-error non-retry behavior.

## 4. Auth Contract Updates

- [x] 4.1 Extend Auth membership view construction to include deduplicated permission keys from `MembershipRole -> Role -> RolePermission -> Permission`.
- [x] 4.2 Centralize membership view construction so register, login, select-organization, and `/auth/me` use the same permissions-aware response shape.
- [x] 4.3 Extend `RegisterDto` validation to support mutually exclusive normal and invitation modes while preserving the existing normal registration payload.
- [x] 4.4 Extend `AuthService.register` normal mode to use shared role provisioning and preserve current behavior.
- [x] 4.5 Add invitation registration path to `AuthService.register` using a Serializable transaction, bounded P2034 retry, and shared provisioning methods that receive the same transaction client.
- [x] 4.6 Update Auth Swagger documentation for normal register, invitation register, functional errors, and `activeMembership.permissions`.
- [x] 4.7 Update Auth unit tests for normal register compatibility, invitation register success, mode exclusivity validation, duplicate email, unusable invitation tokens, transaction-client propagation, atomic failure without partial records, and permissions in Auth responses.

## 5. Invitation Services And DTOs

- [x] 5.1 Create DTOs for invitation creation and invitation-related responses with class-validator and Swagger metadata.
- [x] 5.2 Implement invitation token generation and SHA-256 hashing using Node crypto or a neutral helper, storing only `tokenHash`.
- [x] 5.3 Implement invitation expiration handling that treats stale `PENDING` records as `EXPIRED` and persists expiration opportunistically.
- [x] 5.4 Implement `InvitationsService.createInvitation` with a Serializable transaction, bounded P2034 retry, tenant-scoped checks for normalized email, ACTIVE/SUSPENDED/REMOVED membership conflict, duplicate pending invitation, same-tx MEMBER provisioning, 7-day expiry, `invitedByUserId`, `proposedRoleId`, and one-time `acceptanceUrl` return.
- [x] 5.5 Implement `InvitationsService.listInvitations` for current-tenant listing with safe `invitedBy` and `proposedRole` relation fields and without plaintext tokens, token hashes, or internal relation IDs.
- [x] 5.6 Implement `InvitationsService.revokeInvitation` using `invitationId + active organizationId` and state-specific contracts for PENDING, ACCEPTED, EXPIRED, REVOKED, missing, and cross-tenant invitations.
- [x] 5.7 Implement public invitation preview by token hash with safe response fields and functional errors for missing, expired, revoked, and accepted invitations.
- [x] 5.8 Implement existing-user invitation acceptance with Serializable transaction, bounded P2034 retry, authenticated email match, atomic `PENDING -> ACCEPTED`, same-tx ACTIVE membership creation, same-tx MEMBER assignment, and no automatic organization selection.
- [x] 5.9 Add unit tests for invitation create, duplicate pending, expired replacement, revoked, accepted, invalid token, token hashing, email mismatch, replay, existing ACTIVE/SUSPENDED/REMOVED membership rejection, no invitation created for membership conflicts, invitedBy/proposedRole persistence, revocation by state, and cross-tenant invitation not found.

## 6. Membership Services And Session Tenant Invalidation

- [x] 6.1 Create DTOs for membership status updates with allowed target statuses and Swagger metadata.
- [x] 6.2 Implement current-tenant member listing with `members.read`, safe user fields, membership status, joined timestamp, and role keys.
- [x] 6.3 Implement membership status update with `id + organizationId` lookup and allowed transitions `ACTIVE -> SUSPENDED` and `SUSPENDED -> ACTIVE`.
- [x] 6.4 Implement membership removal as soft state `ACTIVE/SUSPENDED -> REMOVED` without physical delete.
- [x] 6.5 Implement last-active-owner protection inside a Serializable transaction with bounded P2034 retry, including self-suspend and self-remove.
- [x] 6.6 Implement session tenant invalidation for suspended/removed memberships inside the same transaction by setting matching non-revoked `UserSession.organizationId` to null only for the affected organization.
- [x] 6.7 Add unit tests for list members, suspend, reactivate, remove, REMOVED -> ACTIVE returning `MEMBERSHIP_NOT_FOUND`, cross-tenant membership not found, last-owner rejection, session tenant invalidation, and owner mutation retry behavior.

## 7. Controllers, Routing, And Swagger

- [x] 7.1 Implement `OrganizationsController` for `GET /api/organizations/current/members`, `GET /api/organizations/current/invitations`, `POST /api/organizations/current/invitations`, `DELETE /api/organizations/current/invitations/:invitationId`, `PATCH /api/organizations/current/members/:membershipId`, and `DELETE /api/organizations/current/members/:membershipId`.
- [x] 7.2 Protect administrative endpoints with `JwtAuthGuard`, `PermissionGuard`, and the required `members.read` or `members.manage` decorators.
- [x] 7.3 Implement `InvitationsController` for `GET /api/invitations/:token` without auth and `POST /api/invitations/:token/accept` with `JwtAuthGuard` only.
- [x] 7.4 Document all organization and invitation endpoints in Swagger with auth requirements, permission requirements, DTOs, responses, safe invitation list metadata, and functional errors.
- [x] 7.5 Verify controllers never accept or use body/query/header organization IDs for tenant authorization.

## 8. E2E Coverage

- [x] 8.1 Add E2E setup helpers for creating users, organizations, roles, memberships, sessions, and authenticated requests without leaking tokens.
- [x] 8.2 Add E2E tests proving OWNER can administer members and MEMBER without `members.manage` receives 403.
- [x] 8.3 Add E2E tests proving Org A cannot administer Org B memberships or invitations by ID.
- [x] 8.4 Add E2E tests for invitation create, duplicate pending, invalid token, preview PENDING, preview EXPIRED, preview REVOKED, and preview ACCEPTED cases.
- [x] 8.5 Add E2E tests for invitation creation conflicts: existing ACTIVE, SUSPENDED, and REMOVED memberships each return `MEMBER_ALREADY_EXISTS` and create no OrganizationInvitation.
- [x] 8.6 Add E2E tests for invitation metadata: `invitedBy` is the authenticated user, `proposedRole` is MEMBER, list response includes safe invitedBy/proposedRole fields, and list response excludes internal IDs and tokenHash.
- [x] 8.7 Add E2E tests for invitation revocation states: PENDING -> REVOKED, ACCEPTED returns `INVITATION_ALREADY_ACCEPTED`, EXPIRED returns `INVITATION_EXPIRED`, REVOKED returns `INVITATION_REVOKED`, missing invitation returns not found, and cross-tenant invitationId returns not found.
- [x] 8.8 Add E2E security tests proving plaintext invitation token is never stored and email mismatch is rejected.
- [x] 8.9 Add E2E existing-user flow: invite -> accept -> ACTIVE membership + MEMBER role, without auto-selecting the organization.
- [x] 8.10 Add E2E tests proving invitation accept rejects users with existing ACTIVE, SUSPENDED, or REMOVED memberships with `MEMBER_ALREADY_EXISTS` and leaves membership and invitation unchanged.
- [x] 8.11 Add E2E new-user flow: invite -> register with invitation -> User + Credential + ACTIVE membership + MEMBER role + active session.
- [x] 8.12 Add E2E tests for register with invitation token not found, expired, revoked, and already accepted, proving no partial User/Credential/Membership/Session records are created.
- [x] 8.13 Add E2E membership management tests for suspend, reactivate, remove, REMOVED -> ACTIVE returning `MEMBERSHIP_NOT_FOUND`, and cross-tenant membershipId returning not found.
- [x] 8.14 Add E2E last-owner tests proving the last active OWNER cannot be suspended or removed.
- [x] 8.15 Add E2E session tests proving suspended/removed users lose only the affected active tenant and refresh returns `org: null`.
- [x] 8.16 Add E2E Auth contract tests proving `activeMembership.permissions` appears in register, login, select-organization, and `/auth/me`.
- [x] 8.17 Add concurrency integration/E2E tests proving concurrent duplicate invitation creation leaves at most one current PENDING, concurrent invitation acceptance consumes the token once, concurrent owner mutations never leave zero active OWNER, P2034 retries are bounded, and retry limit is not infinite.

## 9. Final Verification

- [x] 9.1 Confirm no changes were made to `prisma/schema/*.prisma`, `prisma/migrations/*`, or `src/generated/prisma`.
- [x] 9.2 Run `npm run prisma:validate`.
- [x] 9.3 Run `npm run prisma:generate`.
- [x] 9.4 Run `npm run lint`.
- [x] 9.5 Run `npm run test`.
- [x] 9.6 Run `npm run db:ensure`, `npm run db:deploy`, `npm run db:seed`, and `npm run test:e2e` when local PostgreSQL is available.
- [x] 9.7 Run `npm run build`.
- [x] 9.8 Run `npm run check`.
