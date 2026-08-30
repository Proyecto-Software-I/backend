## 1. DTOs And Contracts

- [x] 1.1 Add DTOs for organization role responses with `id`, `key`, `name`, `description`, `scope`, `isSystem`, and `permissions` as permission key strings.
- [x] 1.2 Add DTOs for permission catalog responses with `key` and `description`.
- [x] 1.3 Add DTOs for custom role creation with required `name`, optional `description`, and required `permissionKeys` array.
- [x] 1.4 Add DTOs for custom role update with optional `name`, optional `description`, and optional `permissionKeys` array.
- [ ] 1.5 Add DTOs for membership custom role replacement with required `roleIds` array.
- [ ] 1.6 Add validation for duplicate `permissionKeys`, duplicate `roleIds`, required fields, UUID role IDs, and forbidden client-owned fields through whitelist behavior.

## 2. Role Management Service

- [x] 2.1 Add a focused organization role-management service under the organizations feature.
- [x] 2.2 Implement tenant-scoped role listing for `organizationId = active tenant` and `scope = ORGANIZATION` with stable ordering.
- [x] 2.3 Implement permission catalog listing ordered by permission key.
- [x] 2.4 Implement backend-generated stable custom role key creation from role name with collision suffix handling.
- [x] 2.5 Implement atomic custom role creation with `scope = ORGANIZATION`, `isSystem = false`, and validated permission assignments.
- [x] 2.6 Implement atomic custom role update that preserves `key`, `scope`, `organizationId`, and `isSystem`, and replaces permissions only when `permissionKeys` is provided.
- [x] 2.7 Implement custom role deletion with tenant-scoped lookup, system-role rejection, `ROLE_IN_USE` precheck, and no silent cascade of membership assignments.
- [ ] 2.8 Implement atomic replacement of only custom organization `MembershipRole` rows for a target tenant membership while preserving all system roles and ignoring no invalid input silently.
- [ ] 2.9 Ensure role replacement rejects `OWNER`, `MEMBER`, other system roles, `PROJECT` roles, cross-tenant roles, missing roles, removed memberships, and cross-tenant memberships using the specified functional errors.

## 3. Controller And Module Wiring

- [x] 3.1 Register the role-management service in `OrganizationsModule` without adding a new module or dependency.
- [x] 3.2 Add `GET /api/organizations/current/roles` to `OrganizationsController` with `members.read`.
- [x] 3.3 Add `GET /api/organizations/current/permissions` to `OrganizationsController` with `members.read`.
- [x] 3.4 Add `POST /api/organizations/current/roles` to `OrganizationsController` with `members.manage`.
- [x] 3.5 Add `PATCH /api/organizations/current/roles/:roleId` to `OrganizationsController` with `members.manage`.
- [x] 3.6 Add `DELETE /api/organizations/current/roles/:roleId` to `OrganizationsController` with `members.manage`.
- [ ] 3.7 Add `PUT /api/organizations/current/members/:membershipId/roles` to `OrganizationsController` with `members.manage`.
- [ ] 3.8 Keep using existing `JwtAuthGuard`, `CurrentTenant`, `RequirePermissions`, and `PermissionGuard` without creating a parallel guard.

## 4. Swagger And Error Contracts

- [ ] 4.1 Document all six new endpoints with Swagger tags, bearer auth, summaries, request DTOs, response DTOs, success status codes, and relevant errors.
- [ ] 4.2 Use the standard `{ statusCode, code, message }` error contract for role administration functional errors.
- [ ] 4.3 Add only necessary new functional codes in service behavior: `ROLE_NOT_FOUND`, `ROLE_ALREADY_EXISTS`, `ROLE_IS_SYSTEM`, `ROLE_IN_USE`, and `PERMISSION_NOT_FOUND`.
- [ ] 4.4 Reuse existing `MEMBER_ACCESS_DENIED`, `TENANT_REQUIRED`, `MEMBERSHIP_NOT_FOUND`, and `VALIDATION_ERROR` behavior where applicable.
- [ ] 4.5 Do not change the preexisting `/auth/me` Swagger discrepancy as part of this task.

## 5. Unit Tests

- [x] 5.1 Add service unit tests for role listing scoped to active tenant and `ORGANIZATION` scope only.
- [x] 5.2 Add service unit tests for permission catalog listing ordered by key.
- [x] 5.3 Add service unit tests for custom role creation, generated key stability, collision suffix behavior, empty permission arrays, and permission validation.
- [x] 5.4 Add service unit tests for duplicate `permissionKeys` and unknown permissions.
- [x] 5.5 Add service unit tests for custom role creation retrying a `P2002` collision on `(organizationId, scope, key)` with a recalculated key candidate and returning `ROLE_ALREADY_EXISTS` after bounded attempts.
- [x] 5.6 Add service unit tests for custom role update, description clearing, permission replacement, and key preservation.
- [ ] 5.7 Add service unit tests for system role protection on update, delete, and membership role replacement.
- [x] 5.8 Add service unit tests for role-in-use delete rejection.
- [ ] 5.9 Add service unit tests for tenant isolation in role update, role delete, and membership role replacement.
- [ ] 5.10 Add service unit tests for custom membership role replacement preserving system roles and removing custom roles when `roleIds` is empty.
- [ ] 5.11 Add service unit tests rejecting `PROJECT` roles in `MembershipRole` assignment through the new API.

## 6. Controller Tests

- [x] 6.1 Extend controller metadata tests to verify `JwtAuthGuard` and `PermissionGuard` remain the guards for organization endpoints.
- [x] 6.2 Verify `GET /roles` and `GET /permissions` require `members.read`.
- [ ] 6.3 Verify `POST /roles`, `PATCH /roles/:roleId`, `DELETE /roles/:roleId`, and `PUT /members/:membershipId/roles` require `members.manage`.
- [ ] 6.4 Verify controller methods pass `CurrentTenant`, route params, request bodies, and authenticated context only where needed to the role-management service.

## 7. E2E Tests

- [ ] 7.1 Add E2E coverage showing MEMBER can list roles and permissions with `members.read`.
- [ ] 7.2 Add E2E coverage showing MEMBER without `members.manage` receives `403 MEMBER_ACCESS_DENIED` for mutations.
- [ ] 7.3 Add E2E coverage for OWNER creating, editing, and deleting an unused custom organization role.
- [ ] 7.4 Add E2E happy-path coverage that creates a custom role, assigns it with `PUT /organizations/current/members/:membershipId/roles`, verifies `GET /organizations/current/members` shows the custom role, removes it with `PUT` using `roleIds: []`, verifies `GET /members` no longer shows it, and verifies a preexisting `MEMBER` role is preserved without creating a universal MEMBER invariant.
- [ ] 7.5 Add E2E coverage showing OWNER and MEMBER appear in role listing but cannot be edited or deleted.
- [ ] 7.6 Add E2E coverage for assigned custom role delete returning `409 ROLE_IN_USE`.
- [ ] 7.7 Add E2E coverage for cross-tenant role update, role delete, membership role replacement, and membership IDs returning non-enumerating errors.
- [ ] 7.8 Add E2E coverage showing a valid `PROJECT` role ID cannot be assigned through `MembershipRole` by the new API.
- [ ] 7.9 Add E2E coverage showing multiple roles produce union permissions without duplicates in `/auth/me`.
- [ ] 7.10 Add E2E coverage showing removing a custom role assignment or custom role permission affects the next protected request with the same JWT, without logout or refresh.
- [ ] 7.11 Add E2E coverage confirming JWT payloads continue to omit roles and permissions.
- [ ] 7.12 Add concurrent E2E coverage showing two custom role creations with the same name do not return `500` and produce controlled unique-key behavior through successful suffixed keys or bounded `409 ROLE_ALREADY_EXISTS`.

## 8. Verification

- [ ] 8.1 Run unit tests for auth, access-control, organizations, and role-management changes.
- [ ] 8.2 Run relevant E2E tests including organization memberships and role administration flows.
- [ ] 8.3 Run `npm run test:e2e` because `npm run check` does not include E2E tests.
- [ ] 8.4 Run `npm run check`.
- [ ] 8.5 Run `openspec validate "11-organization-rbac-management" --strict --no-interactive`.
