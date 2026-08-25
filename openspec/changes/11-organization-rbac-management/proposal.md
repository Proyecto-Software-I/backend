## Why

GitHub Issue: Proyecto-Software-I/backend#11 (administracion de roles y permisos de organizacion). LegacyLift already has tenant-scoped auth, memberships, system roles and DB-driven permissions, but organization administrators cannot yet manage custom organization roles or assign them to memberships.

## What Changes

- Add tenant-scoped organization role administration endpoints under `/api/organizations/current`.
- Allow authorized users to list organization roles and the global permission catalog using `members.read`.
- Allow authorized users to create, update and delete custom `RoleScope.ORGANIZATION` roles using `members.manage`.
- Allow authorized users to replace the custom organization-role assignments for a membership using `members.manage`.
- Preserve existing system roles (`OWNER`, `MEMBER`) and reject attempts to edit, delete, assign or remove them through this change.
- Keep permissions resolved dynamically from the database through the existing `OrganizationMembership -> MembershipRole -> Role -> RolePermission -> Permission` relationship.
- Keep roles and permissions out of JWTs and reuse the existing `JwtAuthGuard`, `CurrentTenant`, `RequirePermissions` and `PermissionGuard`.
- Do not add `roles.read`, `roles.manage`, new guards, Prisma schema changes, migrations, seed changes, dependencies, `ProjectAccess`, project-role assignment, ownership transfer, custom permission creation, teams/groups, role templates or role billing.
- Do not fix the preexisting Swagger discrepancy for `GET /auth/me`, where Swagger declares `AuthResponseDto` while runtime returns `MeResponse`; no incidental `/auth/me` fixes are in scope for this issue.

## Capabilities

### New Capabilities

### Modified Capabilities

- `organization-memberships`: add organization-scoped role and permission administration behavior for current-tenant custom roles and membership role assignments.

## Impact

- API: adds `GET /api/organizations/current/roles`, `GET /api/organizations/current/permissions`, `POST /api/organizations/current/roles`, `PATCH /api/organizations/current/roles/:roleId`, `DELETE /api/organizations/current/roles/:roleId`, and `PUT /api/organizations/current/members/:membershipId/roles`.
- Backend code likely affected: `src/organizations/organizations.controller.ts`, `src/organizations/organizations.module.ts`, new organization DTOs and a focused organization role-management service.
- Security: all resource access must be scoped to the active tenant and must avoid cross-tenant resource enumeration.
- Database: uses existing Prisma models only; no schema, migration or seed changes.
- Compatibility: existing auth, memberships, invitations, `/auth/me`, system role provisioning and permission guard behavior must remain compatible.
- Frontend: affected because new role-management and permission-catalog contracts must be consumed by organization administration UI.
