## Context

See `proposal.md` for motivation. The current backend already has tenant-scoped auth and DB-driven authorization: `JwtAuthGuard` establishes `AuthContext`, `CurrentTenant` exposes the active organization, `RequirePermissions` declares endpoint permissions, and `PermissionGuard` resolves permissions from `OrganizationMembership -> MembershipRole -> Role -> RolePermission -> Permission`. Existing organization member and invitation endpoints live in `OrganizationsController` under `organizations/current`, use `members.read` and `members.manage`, and delegate business logic to services.

The Prisma schema already contains `Role`, `Permission`, `RolePermission`, `MembershipRole`, `OrganizationMembership`, and `ProjectAccess`. This change must not alter the schema, migrations, seed data, guards, JWT payloads, or authorization model.

## Goals / Non-Goals

**Goals:**

- Add current-tenant organization role management using existing organization controller/service/DTO patterns.
- Manage only custom roles with `scope = ORGANIZATION` and `isSystem = false` for mutations.
- Preserve system roles and existing last-owner protection by not exposing `OWNER` assignment/removal or system role mutation.
- Prevent the new API from creating `MembershipRole` rows pointing to `RoleScope.PROJECT`.
- Keep role and permission changes immediately visible through existing DB-driven permission resolution.

**Non-Goals:**

- No Prisma schema or migration work.
- No seed changes and no new permission keys such as `roles.read` or `roles.manage`.
- No new auth or RBAC guard.
- No `ProjectAccess` or project-role assignment behavior.
- No transfer ownership, promote to OWNER, remove OWNER, teams/groups, role templates, role billing, dynamic tenant-defined permissions, JWT permission claims, or incidental `/auth/me` Swagger correction.

## Decisions

### Extend the existing organizations feature

Add the endpoints to the existing `OrganizationsController` because they are tenant-scoped organization administration operations under the same `organizations/current` route and guard model as members and invitations. Add a focused service inside `src/organizations/services/` for role-management business logic, and DTOs under `src/organizations/dto/`.

Alternative considered: create a separate Nest module or guard. This is rejected because the repository organizes by feature, the current `organizations/current` pattern is sufficient, and the issue explicitly prohibits a parallel guard.

### Reuse members permissions

Use `members.read` for `GET /roles` and `GET /permissions`, and `members.manage` for create/update/delete/replacement operations. Do not create `roles.read` or `roles.manage`.

Alternative considered: introduce role-specific permissions. This is rejected by the issue and would require seed/authorization scope changes.

### Use stable backend-generated slug keys

Generate custom role `key` from `name` only at creation time using a lowercase slug strategy compatible with the existing organization slug convention: normalize, remove accents, lowercase, replace non-alphanumeric runs with `-`, trim separators, and use an explicit fallback when the result is empty. If the generated key collides within `(organizationId, ORGANIZATION, key)`, append an incremental numeric suffix such as `-2`, `-3`, while respecting the `Role.key` length limit. Do not regenerate the key on PATCH.

Alternative considered: accept client-provided keys. This is rejected because the issue requires backend-generated keys. Alternative considered: UUID-derived keys. This is less compatible with existing readable slug conventions.

### Handle concurrent role key collisions locally

Do not modify `SerializableTransactionService` globally to retry Prisma `P2002` for all backend transactions. Custom role creation should handle only the expected concurrent collision on the `Role` unique constraint `(organizationId, scope, key)`: if Prisma returns `P2002` for that target during custom role creation, start a new bounded creation attempt, re-read current roles for the active organization, calculate the next slug candidate such as `security-reviewer-2`, and retry role creation with that candidate. The retry loop must be finite. If bounded attempts are exhausted, return `409 ROLE_ALREADY_EXISTS` instead of propagating Prisma errors or returning `500`.

Alternative considered: add locking, global retry behavior, or a dependency. This is rejected because the issue only needs a local controlled strategy for role-key uniqueness and the database unique constraint already protects correctness.

### Treat system roles as read-only and out of custom assignment

List `OWNER` and `MEMBER`, but reject PATCH, DELETE, and membership-role replacement attempts that include any `isSystem = true` role ID. The replacement endpoint preserves existing system `MembershipRole` rows and modifies only custom organization-role rows for the active tenant.

Alternative considered: silently ignore system role IDs in `roleIds`. This is rejected because explicit rejection is safer and makes invalid client intent visible.

### Use not-found semantics for cross-tenant and out-of-scope role IDs

For role IDs from another tenant and role IDs with `scope = PROJECT`, return `404 ROLE_NOT_FOUND` from organization-role endpoints. This follows existing tenant-isolation patterns where cross-tenant IDs are not disclosed.

Alternative considered: expose `CROSS_TENANT_ROLE` or `ROLE_SCOPE_INVALID`. This is rejected for public responses because it leaks resource classification or existence.

### Reject duplicate input arrays

Reject duplicate `permissionKeys` and duplicate `roleIds` as `400 VALIDATION_ERROR` rather than silently deduplicating. The existing effective-permission resolution deduplicates outputs, but input replacement contracts should be explicit.

Alternative considered: deduplicate silently. This is not required by existing repository behavior and can hide client bugs.

### Use transaction boundaries for multi-row mutations

Use the existing `SerializableTransactionService` where multi-step role changes must be atomic: create role plus permissions, update metadata plus permission replacement, delete with in-use policy, and replace membership custom roles. Do not add complex locking, versioning, or new dependencies.

Alternative considered: independent Prisma calls. This risks partially applied role/permission state and is inconsistent with current members/invitations multi-step patterns.

### Return deleted role representation

Use `200 OK` with the deleted role representation for `DELETE /roles/:roleId`, matching the existing organization endpoints that return resource data for delete-like operations instead of `204`.

Alternative considered: `204 No Content`. This is valid REST style but less consistent with current `DELETE /members/:membershipId` and `DELETE /invitations/:invitationId` behavior.

### Document new endpoints and affected tests

Swagger documentation will be affected only for the new organization RBAC endpoints: `GET /api/organizations/current/roles`, `GET /api/organizations/current/permissions`, `POST /api/organizations/current/roles`, `PATCH /api/organizations/current/roles/:roleId`, `DELETE /api/organizations/current/roles/:roleId`, and `PUT /api/organizations/current/members/:membershipId/roles`. The implementation should document the new request and response DTOs, relevant success responses, functional error codes, and bearer auth using the existing Swagger pattern.

Tests affected by this design are the `OrganizationsController` metadata/delegation tests, unit tests for the new organization role-management service, E2E coverage for RBAC and organization memberships, `/auth/me` DB-driven permission behavior, immediate authorization, and tenant isolation.

## Risks / Trade-offs

- Race between role deletion and role assignment -> mitigate with a transaction around lookup, in-use check, and deletion; do not rely on cascade behavior as business logic.
- Schema permits `MembershipRole` to reference `PROJECT` roles -> mitigate in the new API by validating requested role IDs and deleting/replacing only the custom `ORGANIZATION` subset managed by this API.
- Stable slug key collisions -> mitigate with deterministic incremental suffix generation, local bounded retry on `Role` key `P2002`, and `ROLE_ALREADY_EXISTS` if a unique key cannot fit within the schema limit or bounded attempts are exhausted.
- System role safety -> mitigate by treating any `isSystem = true` role as immutable and not assignable through custom role replacement.
- Immediate authorization expectations -> rely on existing DB-driven `PermissionGuard` and `/auth/me` behavior; add tests proving custom role changes affect the next request with the same JWT.
- Existing `/auth/me` Swagger mismatch -> leave unchanged because this issue does not require changing `/auth/me` contracts or Swagger documentation.

## Migration Plan

No database migration, seed change, environment change, dependency change, or deployment sequencing is required. Rollback consists of reverting the application-code changes for the new endpoints, DTOs, service and tests; existing persisted roles and assignments use existing tables and remain valid data.
