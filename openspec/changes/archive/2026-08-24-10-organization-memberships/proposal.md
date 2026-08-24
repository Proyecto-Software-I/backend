## Why

GitHub Issue #10 (https://github.com/Proyecto-Software-I/backend/issues/10) requires organization membership administration and invitation flows for LegacyLift tenants. The backend already has multi-tenant authentication from Issue #5, but it has no domain module for managing members, invitations, reusable permission checks, or invitation-based registration.

## What Changes

- Add an `OrganizationsModule` domain area for current-organization member and invitation administration.
- Add reusable permission authorization with `@RequirePermissions(...)` and a `PermissionGuard` that reads current permissions from the database, not from JWT claims.
- Add administrative endpoints under `/api/organizations/current` for listing members, listing invitations, creating/revoking invitations, updating membership status, and removing memberships.
- Add public invitation preview and authenticated invitation acceptance endpoints under `/api/invitations/:token`.
- Extend `POST /api/auth/register` with a mutually exclusive invitation registration mode while preserving the existing normal registration contract.
- Extend Auth responses so `activeMembership` includes `permissions: string[]` when a tenant is active.
- Ensure every organization has an idempotent system `MEMBER` role with `organization.read` and `members.read`, while `OWNER` keeps its current full-permission behavior.
- Invalidate only the affected active tenant on sessions when a membership is suspended or removed.
- Do not modify the Prisma schema, generated client, or migrations.

Out of scope:

- UI of roles, custom roles, manual role assignment, permission editing, ProjectAccess, ownership transfer, restoring `REMOVED` memberships, email delivery provider, automatic resend, billing seats, groups, and teams.

## Capabilities

### New Capabilities

- `organization-memberships`: Current-tenant member administration, invitations, invitation token lifecycle, acceptance, reusable permission authorization, tenant isolation, session tenant invalidation, and last-owner protection.

### Modified Capabilities

- `auth`: Registration gains an invitation mode, Auth session responses include active membership permissions, and normal registration provisions both OWNER and MEMBER roles for new organizations.

## Impact

- **Code**: New organization domain files under `src/organizations/`; reusable access-control files under a neutral area such as `src/access-control/`; updates to Auth register and membership view construction; updates to `AppModule`/module wiring as needed.
- **API**: New `/api/organizations/current/*` and `/api/invitations/:token*` endpoints; extended `POST /api/auth/register`; extended Auth response contract with `activeMembership.permissions`.
- **Frontend**: Affected. Frontend can use Swagger to build member management, invitation preview/acceptance, invitation registration, and permission-aware UI behavior.
- **Database**: No Prisma schema changes and no migrations. Existing `OrganizationInvitation`, `OrganizationMembership`, `Role`, `Permission`, `RolePermission`, `MembershipRole`, and `UserSession` models are sufficient.
- **Dependencies**: No new dependency is planned. Invitation tokens use Node `crypto` and existing project patterns.
- **Security risks**: IDOR on membership/invitation IDs, tenant leakage, token leakage, invitation replay, email mismatch, stale permission data, and last-owner race conditions. The design must enforce tenant scoping via `UserSession.organizationId`, store only token hashes, and use transactions for sensitive state changes.
- **Compatibility risks**: `POST /api/auth/register` must remain backward compatible for normal registration; existing Auth response fields must be preserved while adding permissions.
- **Deployment risks**: None from schema or configuration changes; verification still requires local PostgreSQL for E2E tests.
