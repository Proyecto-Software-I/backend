## 1. Module Structure And Shared Authorization

- [ ] 1.1 Create the reusable access-control module area with `RequirePermissions` decorator and `PermissionGuard`.
- [ ] 1.2 Implement `PermissionGuard` to require `JwtAuthGuard` context, reject null tenant with `TENANT_REQUIRED`, load active membership permissions from Prisma, and reject missing permissions with `MEMBER_ACCESS_DENIED`.
- [ ] 1.3 Add request-local permission/membership reuse in `PermissionGuard` without adding global permission cache or JWT permission claims.
- [ ] 1.4 Add unit tests for `PermissionGuard`: OWNER with `members.manage`, MEMBER without `members.manage`, null tenant, missing active membership, and current DB permissions.
- [ ] 1.5 Create `OrganizationsModule` and wire it into `AppModule` without introducing `AuthModule <-> OrganizationsModule` circular imports.

## 2. Organization Role Provisioning

- [ ] 2.1 Implement `OrganizationRolesService` or an equivalent lower-level provisioning service that depends only on `PrismaService`.
- [ ] 2.2 Move or reuse OWNER role provisioning so normal registration still grants OWNER all seeded permissions.
- [ ] 2.3 Implement idempotent MEMBER role provisioning with `organization.read` and `members.read`, excluding `members.manage`.
- [ ] 2.4 Ensure normal registration creates or ensures both OWNER and MEMBER for new organizations while preserving the creator's OWNER membership behavior.
- [ ] 2.5 Add unit tests for OWNER provisioning, MEMBER provisioning, idempotency, and MEMBER permission contents.

## 3. Auth Contract Updates

- [ ] 3.1 Extend Auth membership view construction to include deduplicated permission keys from `MembershipRole -> Role -> RolePermission -> Permission`.
- [ ] 3.2 Centralize membership view construction so register, login, select-organization, and `/auth/me` use the same permissions-aware response shape.
- [ ] 3.3 Extend `RegisterDto` validation to support mutually exclusive normal and invitation modes while preserving the existing normal registration payload.
- [ ] 3.4 Extend `AuthService.register` normal mode to use shared role provisioning and preserve current behavior.
- [ ] 3.5 Add invitation registration path to `AuthService.register` using an atomic transaction and the shared invitation acceptance/provisioning logic.
- [ ] 3.6 Update Auth Swagger documentation for normal register, invitation register, functional errors, and `activeMembership.permissions`.
- [ ] 3.7 Update Auth unit tests for normal register compatibility, invitation register success, mode exclusivity validation, duplicate email, unusable invitation tokens, atomic failure without partial records, and permissions in Auth responses.

## 4. Invitation Services And DTOs

- [ ] 4.1 Create DTOs for invitation creation and invitation-related responses with class-validator and Swagger metadata.
- [ ] 4.2 Implement invitation token generation and SHA-256 hashing using Node crypto or a neutral helper, storing only `tokenHash`.
- [ ] 4.3 Implement invitation expiration handling that treats stale `PENDING` records as `EXPIRED` and persists expiration opportunistically.
- [ ] 4.4 Implement `InvitationsService.createInvitation` with tenant-scoped checks for normalized email, active member conflict, removed membership non-restoration, duplicate pending invitation, MEMBER provisioning, 7-day expiry, and one-time `acceptanceUrl` return.
- [ ] 4.5 Implement `InvitationsService.listInvitations` for current-tenant listing without plaintext tokens or token hashes.
- [ ] 4.6 Implement `InvitationsService.revokeInvitation` using `invitationId + active organizationId` and `PENDING -> REVOKED` behavior.
- [ ] 4.7 Implement public invitation preview by token hash with safe response fields and functional errors for missing, expired, revoked, and accepted invitations.
- [ ] 4.8 Implement existing-user invitation acceptance with authenticated email match, atomic `PENDING -> ACCEPTED`, ACTIVE membership creation, MEMBER assignment, and no automatic organization selection.
- [ ] 4.9 Add unit tests for invitation create, duplicate pending, expired replacement, revoked, accepted, invalid token, token hashing, email mismatch, replay, existing ACTIVE/SUSPENDED/REMOVED membership rejection, revocation by state, and cross-tenant invitation not found.

## 5. Membership Services And Session Tenant Invalidation

- [ ] 5.1 Create DTOs for membership status updates with allowed target statuses and Swagger metadata.
- [ ] 5.2 Implement current-tenant member listing with `members.read`, safe user fields, membership status, joined timestamp, and role keys.
- [ ] 5.3 Implement membership status update with `id + organizationId` lookup and allowed transitions `ACTIVE -> SUSPENDED` and `SUSPENDED -> ACTIVE`.
- [ ] 5.4 Implement membership removal as soft state `ACTIVE/SUSPENDED -> REMOVED` without physical delete.
- [ ] 5.5 Implement last-active-owner protection inside the same transaction as suspend/remove, including self-suspend and self-remove.
- [ ] 5.6 Implement session tenant invalidation for suspended/removed memberships by setting matching non-revoked `UserSession.organizationId` to null only for the affected organization.
- [ ] 5.7 Add unit tests for list members, suspend, reactivate, remove, REMOVED -> ACTIVE returning `MEMBERSHIP_NOT_FOUND`, cross-tenant membership not found, last-owner rejection, and session tenant invalidation.

## 6. Controllers, Routing, And Swagger

- [ ] 6.1 Implement `OrganizationsController` for `GET /api/organizations/current/members`, `GET /api/organizations/current/invitations`, `POST /api/organizations/current/invitations`, `DELETE /api/organizations/current/invitations/:invitationId`, `PATCH /api/organizations/current/members/:membershipId`, and `DELETE /api/organizations/current/members/:membershipId`.
- [ ] 6.2 Protect administrative endpoints with `JwtAuthGuard`, `PermissionGuard`, and the required `members.read` or `members.manage` decorators.
- [ ] 6.3 Implement `InvitationsController` for `GET /api/invitations/:token` without auth and `POST /api/invitations/:token/accept` with `JwtAuthGuard` only.
- [ ] 6.4 Document all organization and invitation endpoints in Swagger with auth requirements, permission requirements, DTOs, responses, and functional errors.
- [ ] 6.5 Verify controllers never accept or use body/query/header organization IDs for tenant authorization.

## 7. E2E Coverage

- [ ] 7.1 Add E2E setup helpers for creating users, organizations, roles, memberships, sessions, and authenticated requests without leaking tokens.
- [ ] 7.2 Add E2E tests proving OWNER can administer members and MEMBER without `members.manage` receives 403.
- [ ] 7.3 Add E2E tests proving Org A cannot administer Org B memberships or invitations by ID.
- [ ] 7.4 Add E2E tests for invitation create, duplicate pending, invalid token, preview PENDING, preview EXPIRED, preview REVOKED, and preview ACCEPTED cases.
- [ ] 7.5 Add E2E tests for invitation revocation states: PENDING -> REVOKED, ACCEPTED returns `INVITATION_ALREADY_ACCEPTED`, EXPIRED returns `INVITATION_EXPIRED`, REVOKED returns `INVITATION_REVOKED`, missing invitation returns not found, and cross-tenant invitationId returns not found.
- [ ] 7.6 Add E2E security tests proving plaintext invitation token is never stored and email mismatch is rejected.
- [ ] 7.7 Add E2E existing-user flow: invite -> accept -> ACTIVE membership + MEMBER role, without auto-selecting the organization.
- [ ] 7.8 Add E2E tests proving invitation accept rejects users with existing ACTIVE, SUSPENDED, or REMOVED memberships with `MEMBER_ALREADY_EXISTS` and leaves membership and invitation unchanged.
- [ ] 7.9 Add E2E new-user flow: invite -> register with invitation -> User + Credential + ACTIVE membership + MEMBER role + active session.
- [ ] 7.10 Add E2E tests for register with invitation token not found, expired, revoked, and already accepted, proving no partial User/Credential/Membership/Session records are created.
- [ ] 7.11 Add E2E membership management tests for suspend, reactivate, remove, REMOVED -> ACTIVE returning `MEMBERSHIP_NOT_FOUND`, and cross-tenant membershipId returning not found.
- [ ] 7.12 Add E2E last-owner tests proving the last active OWNER cannot be suspended or removed.
- [ ] 7.13 Add E2E session tests proving suspended/removed users lose only the affected active tenant and refresh returns `org: null`.
- [ ] 7.14 Add E2E Auth contract tests proving `activeMembership.permissions` appears in register, login, select-organization, and `/auth/me`.

## 8. Final Verification

- [ ] 8.1 Confirm no changes were made to `prisma/schema/*.prisma`, `prisma/migrations/*`, or `src/generated/prisma`.
- [ ] 8.2 Run `npm run prisma:validate`.
- [ ] 8.3 Run `npm run prisma:generate`.
- [ ] 8.4 Run `npm run lint`.
- [ ] 8.5 Run `npm run test`.
- [ ] 8.6 Run `npm run db:ensure`, `npm run db:deploy`, `npm run db:seed`, and `npm run test:e2e` when local PostgreSQL is available.
- [ ] 8.7 Run `npm run build`.
- [ ] 8.8 Run `npm run check`.
