## Exploration: 15-project-management

### Current State
Issue [#15](https://github.com/Proyecto-Software-I/backend/issues/15) is a new domain feature on `feat/15-project-management`; no Projects NestJS module or runtime `ProjectAccess` usage exists. The branch already contains prior SDD initialization changes in `.gitignore` and `openspec/config.yaml`; this exploration does not alter them.

The database already has the required `Project`, `ProjectStatus`, and `ProjectAccess` structures. `Project` is unique by `(organizationId, key)`, has indexes for `(organizationId, status)` and `deletedAt`, and supports `archivedAt` independently from `status`. `ProjectAccess` allows one role per membership/project pair. Its three foreign keys ensure referential integrity, but neither Prisma nor the initial migration enforces that Project, Membership, and Role share an organization or that the Role has `scope = PROJECT`; application transactions must validate all four tenant IDs and role scope. There is no PostgreSQL RLS, by documented design.

Authentication is ready to reuse. `JwtAuthGuard` verifies JWT/session agreement, reloads an `ACTIVE` membership for the session organization, and places `{ userId, sessionId, organizationId }` on the request. `CurrentTenant` derives the organization from that context. `PermissionGuard` then reloads only `ORGANIZATION` role permissions into a request-local cache and requires every declared permission. Organization switching updates `UserSession.organizationId` and issues a matching JWT, so Projects must use this request-derived tenant on every call.

The important authorization gap is intentional: the current `PermissionGuard` cannot evaluate `ProjectAccess`. Applying `@RequirePermissions('projects.read')` to list/detail would reject a member whose read permission exists only through a PROJECT role. Existing organization authorization and the required project union therefore need one shared resolver, not a second unrelated authorization system.

The global permission catalog already contains `projects.read`, `projects.create`, `projects.manage`, and `projects.delete`. New organizations receive an ORGANIZATION `OWNER` role with all catalog permissions and a `MEMBER` role with only `organization.read` and `members.read`. No PROJECT roles are provisioned. Issue #11 deliberately lists/manages only ORGANIZATION roles and rejects PROJECT roles from `MembershipRole`. Existing conventions use feature modules, thin Swagger controllers, validated DTOs, Prisma services, serializable transactions for multi-row mutations, DB-driven permissions, tenant-qualified `findFirst`, stable `{ statusCode, code, message }` errors through `AuthError`, unit tests with Prisma mocks, and real PostgreSQL E2E tests with Supertest and negative cross-tenant cases.

### Affected Areas
- `src/projects/projects.module.ts` — new domain module registered by `AppModule`.
- `src/projects/projects.controller.ts` — create/list/detail/metadata/status/archive and minimal access-management HTTP contracts.
- `src/projects/dto/*.ts` — whitelist project inputs, UUID/status/query validation, response DTOs, and Swagger metadata.
- `src/projects/services/projects.service.ts` — tenant-qualified persistence, key normalization, archive consistency, and transition rules.
- `src/projects/services/project-authorization.service.ts` — effective permission union and list visibility rules.
- `src/projects/services/project-access.service.ts` — atomic same-tenant/scope validation and ProjectAccess administration.
- `src/access-control/guards/permission.guard.ts` — likely extraction/reuse of its organization permission resolver; project-only access cannot pass its current route-level model.
- `src/access-control/access-control.module.ts` — export the shared organization access resolver used by both the guard and Projects.
- `src/organization-provisioning/services/organization-roles.service.ts` — idempotent PROJECT system-role provisioning if fixed roles are approved.
- `src/app.module.ts` — import `ProjectsModule`.
- `prisma/schema/projects-source.prisma` and `prisma/schema/auth-tenancy.prisma` — read-only model source for this change unless a later design proves an uncovered invariant requires a new migration.
- `prisma/seed.ts` — permission keys already exist; tenant-specific roles should not be placed in the global seed.
- `src/common/filters/http-exception.filter.ts` and `src/common/exceptions/auth-error.ts` — existing stable error mechanism to reuse despite the auth-specific class name.
- `src/projects/**/*.spec.ts` — strict-TDD unit coverage for transitions, normalization, authorization union, tenant filters, and invalid access combinations.
- `test/project-management.e2e-spec.ts` — real PostgreSQL contract, organization switch, permission union, and cross-tenant regression coverage.

### Approaches
1. **Project-domain services over a shared organization permission resolver** — keep `JwtAuthGuard`; extract the current DB-backed organization permission resolution for reuse, and let project services combine it with a tenant-qualified ProjectAccess role.
   - Pros: Preserves one authorization source, supports project-only users on list/detail, keeps resource authorization near resource loading, and avoids coupling a generic guard to route parameter names.
   - Cons: Requires a focused access-control refactor and discipline so controllers do not incorrectly add organization-only permission decorators to project-effective operations.
   - Effort: High

2. **Make PermissionGuard resource-aware and expose configurable PROJECT RBAC** — teach the guard to load project IDs and add create/update/delete APIs for PROJECT roles plus access assignment.
   - Pros: Declarative controller metadata and maximum future role flexibility.
   - Cons: Couples a generic guard to Projects, duplicates much of issue #11, expands the contract beyond the minimum, and increases privilege-escalation and review risk.
   - Effort: High

### Recommendation
Use approach 1. Keep `POST /api/projects` behind organization-level `@RequirePermissions('projects.create')`. For list/detail/metadata/status/archive, resolve an `ACTIVE` membership in the active tenant, collect valid ORGANIZATION permissions, load only a ProjectAccess where Project, Membership, Role, and active tenant match and `Role.scope = PROJECT`, and use their set union. Same-tenant resources without the required effective permission return `403 PROJECT_ACCESS_DENIED`; missing and cross-tenant resources both return `404 PROJECT_NOT_FOUND`.

List semantics should be consistent across all callers: an organization-level `projects.read` grant exposes every non-deleted project in the tenant; otherwise return only tenant projects whose matching ProjectAccess role grants `projects.read`; no matching grant returns `200 { projects: [] }`, not a route-level 403. Default `GET /api/projects` should exclude `ARCHIVED`; `?archived=true` should return archived projects only. Do not add an `all`, search, status, or pagination contract yet. Use deterministic ordering (`createdAt DESC`, then `id`) and exclude `settings`; expose `tags` as a validated string array and normalize absent persisted tags to `[]` in responses.

Normalize project keys by trim plus uppercase before validating/persisting, enforce the schema's 50-character limit, and reject empty/unsupported syntax. This makes tenant-local uniqueness stable instead of leaving PostgreSQL's case-sensitive `CORE`/`core` ambiguity. Exact allowed punctuation remains a contract decision; the issue examples support uppercase alphanumerics separated by hyphens.

Keep status changes separate from metadata (`PATCH /api/projects/:projectId/status`) and reserve `DELETE /api/projects/:projectId` exclusively for archive. Archive is allowed once from any non-archived state, atomically sets `status = ARCHIVED` and `archivedAt = now`, never touches `deletedAt`, and returns `409 PROJECT_ALREADY_ARCHIVED` on repetition. `ARCHIVED` is not accepted by the status endpoint. Two evidence-compatible transition policies remain:

1. **Strict forward workflow:** `DRAFT -> DISCOVERY -> PLANNING -> MIGRATING -> VALIDATING -> COMPLETED`; do not expose `ON_HOLD` until resume semantics are specified. This invents the least behavior and is recommended.
2. **Operational hold workflow:** allow each nonterminal workflow state to enter `ON_HOLD`, then allow an explicit caller-selected resume state. This uses the full enum but cannot guarantee return to the prior state because the schema stores no previous status.

For minimum ProjectAccess functionality, avoid configurable PROJECT-role CRUD. Provision a small fixed set of tenant-specific system PROJECT roles idempotently (recommended capabilities: viewer=`projects.read`; manager=`projects.read|projects.manage|projects.delete`; never include `projects.create`, which is organization-only), expose them read-only, and add Projects-owned access list/upsert/revoke endpoints. Guard access administration with organization-level `members.manage`, matching the existing authority that can already delegate organization roles, rather than with project-effective `projects.manage` (which would permit self-escalation). Validate target membership is `ACTIVE`, every ID belongs to the active tenant, role scope is PROJECT, and role permissions are limited to project-applicable keys before writing in one transaction. Provision during new-organization setup and lazily on the role-list/access path so pre-existing organizations also work.

Use existing stable error behavior and issue codes: `TENANT_REQUIRED` 403, `PROJECT_NOT_FOUND` 404, `PROJECT_ALREADY_EXISTS` 409, `PROJECT_ACCESS_DENIED` 403, `PROJECT_STATUS_INVALID` 400, `PROJECT_STATUS_TRANSITION_INVALID` 409, `PROJECT_ALREADY_ARCHIVED` 409, and `PROJECT_ROLE_INVALID`/`PROJECT_ACCESS_INVALID` 400 without exposing foreign resource details. Unit tests should assert exact Prisma tenant predicates and transition tables. E2E tests must cover the issue's read/PATCH/archive IDOR cases, invalid ProjectAccess tenant/scope combinations, union behavior for each permission, same key across tenants, and project visibility after `select-organization` with the newly issued token.

### Risks
- `ProjectAccess` tenant/scope invariants are not database-enforced; every write path must remain transactional and validated, and direct database writes can still create invalid combinations.
- The current PermissionGuard is organization-only; using it unchanged on project-effective endpoints would silently break the required union semantics.
- `ON_HOLD` has no recoverable prior state in the existing schema, so a resume policy cannot be inferred safely.
- Fixed PROJECT role names/capabilities and the exact access endpoints are not specified by issue #15 and require explicit approval before proposal/spec work.
- `projects.create` alone does not imply later read access and the issue does not say to auto-create ProjectAccess for the creator; changing that would add an unstated permission implication.
- The branch already has uncommitted SDD initialization changes, and the requested 800-line budget conflicts with the installed 400-line review guard; task planning must surface likely chaining before apply.

### Ready for Proposal
No. The codebase is ready, but the orchestrator should ask the user to confirm the strict-forward treatment of `ON_HOLD`, fixed PROJECT role capabilities/minimum access endpoints, and whether creation intentionally grants no implicit read access. The archived listing and list authorization policies above are evidence-based defaults suitable for the proposal once those security-sensitive ambiguities are resolved.
