## Why

Deliver [GitHub issue #15 — Implement project creation and administration](https://github.com/Proyecto-Software-I/backend/issues/15): authorized members need tenant-safe projects to organize modernization work and later domains.

## What Changes

### In Scope
- Add tenant-derived project creation, accessible list/detail, metadata update, active/archived filtering, and archive-without-delete APIs; normalize keys with organization-local uniqueness.
- Enforce `DRAFT -> DISCOVERY -> PLANNING -> MIGRATING -> VALIDATING -> COMPLETED`; archive separately by synchronizing `ARCHIVED` and `archivedAt`. Reserve `ON_HOLD` until resume semantics exist.
- Union applicable ORGANIZATION permissions with same-tenant `ProjectAccess` PROJECT-role permissions.
- Add Projects-owned configurable PROJECT-role CRUD and access assignment/revocation. Roles are tenant-bound, limited to `projects.read|manage|delete`, and protected against escalation; ORGANIZATION role administration remains unchanged.
- Atomically create the project and creator access. `projects.create` remains ORGANIZATION-level; a safely provisioned tenant system PROJECT role grants the creator `projects.read`, `projects.manage`, and `projects.delete`.
- Document Swagger contracts/errors and add strict-TDD unit and PostgreSQL E2E tenant-isolation coverage.

### Out of Scope
- Legacy Systems, System Environments, Source Connections, Repositories, Scan Sessions, Source Snapshots, Discovery, and project-count billing/entitlements.
- Project transfer, hard delete, cloning, templates, favorites, advanced search, and complex pagination.
- Auth changes, duplicate ORGANIZATION-role administration, or parallel authorization.

## Capabilities

### New Capabilities
- `project-management`: Tenant-scoped creation, visibility, detail, metadata, strict lifecycle, archive, errors, and Swagger contracts.
- `project-access-control`: Permission union, PROJECT-role CRUD, creator bootstrap access, ProjectAccess administration, escalation controls, and cross-tenant denial.

### Modified Capabilities
- None. `auth` and `organization-memberships` requirements remain unchanged.

## Approach

Add a Projects feature module over Prisma. Reuse authenticated tenant context and a shared organization-permission resolver; project services combine it with validated ProjectAccess near tenant-qualified resource loading. Keep role/access writes transactional.

## Contribution Gate

This change is planning-only until the following sequence is complete:

1. Validate this OpenSpec plan.
2. Commit and push only the planning artifacts.
3. Open a Draft PR for the plan.
4. Wait for an explicit `PLAN APPROVED` approval.

Implementation, testing, and OpenSpec archiving are prohibited until `PLAN APPROVED` is received.

## Impact

| Area | Impact |
|---|---|
| `src/projects/**`, `src/app.module.ts` | New project APIs |
| `src/access-control/**` | Shared permission resolution |
| `prisma/schema/*.prisma` | Existing models; no planned schema change |
| Frontend | New coordinated API; no frontend code here |

## Risks

| Risk | Mitigation |
|---|---|
| Security: tenant leaks/escalation | Tenant predicates, constrained permissions, atomic checks, negative tests |
| Database: application-enforced invariants | Validate Project, membership, role, scope, and tenant on every write |
| Compatibility/deployment | Preserve auth/organization contracts; no dependency or planned migration |

## Rollback Plan

Remove Projects routes/module and shared-resolver integration; clean up feature-created roles/accesses if required. Never hard-delete Project records.

## Dependencies

- Existing issue #5 tenant auth, issue #11 organization RBAC, Prisma models, and permission catalog; no new package.

## Success Criteria

- [ ] Issue #15 CRUD, transitions, archive, role/access administration, and creator access satisfy documented permissions and errors.
- [ ] Cross-tenant and invalid role/scope combinations are denied; Swagger, unit/E2E tests, and `npm run check` pass.
