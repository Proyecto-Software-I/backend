# Design: Project Management

## Technical Approach

Add a `ProjectsModule` with thin Swagger controllers, validated DTOs, and Prisma services. Extract `PermissionGuard`'s ORGANIZATION lookup into `OrganizationPermissionResolver`; project services reuse it and union valid PROJECT grants beside tenant-qualified resource loads. This covers all 11 requirements/19 scenarios without schema or dependency changes.

## Contribution Gate

Before any implementation, test execution, or OpenSpec archiving, contributors MUST validate the plan, commit and push only its planning artifacts, open a Draft PR, and receive an explicit `PLAN APPROVED` approval. This design describes the approved implementation target; it does not authorize work before that gate is satisfied.

## Architecture Decisions

| Decision | Alternative / tradeoff | Choice and rationale |
|---|---|---|
| Authorization | A resource-aware generic guard couples policy to params. | `ProjectAuthorizationService` owns effective authorization. Its organization-only check uses the shared resolver, never PROJECT permissions, and maps missing `projects.create`, `members.read`, or `members.manage` to `403 PROJECT_ACCESS_DENIED`; existing `PermissionGuard` retains `MEMBER_ACCESS_DENIED` for non-Projects routes. |
| Roles | Fixed roles violate configurable-role requirements. | PROJECT-role CRUD mirrors existing role patterns: NFD/lowercase slug plus bounded suffix, immutable key, allowlisted permissions. `PROJECT_CREATOR` is protected `isSystem` with exactly read/manage/delete. |
| Consistency | Separate writes allow TOCTOU and partial state. | Existing three-attempt serializable transactions re-resolve active membership and current ORGANIZATION permissions for every protected write. |

## Data Flow

```text
JWT -> organization resolver -> tenant Project -> valid ProjectAccess/Role
                            ORGANIZATION ∪ PROJECT permissions -> operation
```

ID operations first load `{ id, organizationId, deletedAt:null }` by `id + active organization`; missing/foreign returns `404 PROJECT_NOT_FOUND`, then same-tenant denial returns `403 PROJECT_ACCESS_DENIED`. Listing always uses `organizationId`, `deletedAt:null`, status `ARCHIVED` when `archived=true`, otherwise `{ not: ARCHIVED }`, and `orderBy: [{createdAt:'desc'},{id:'asc'}]`. Organization `projects.read` omits an access condition; otherwise `accesses.some` requires the active membership, same-tenant ACTIVE membership, same-tenant PROJECT role, and `projects.read`.

Creation transaction revalidates organization `projects.create`, normalizes/validates key, upserts and repairs `PROJECT_CREATOR`, creates `DRAFT`, then creator access. Project-key P2002 becomes `PROJECT_ALREADY_EXISTS`; rollback prevents partial bootstrap. Metadata/status transactions load tenant-qualified state and require `status !== ARCHIVED`; archived projects return `409 PROJECT_ALREADY_ARCHIVED`. Status uses only the strict next-state map; retry re-evaluates concurrent changes. Archive uses one `now` and one update for `status=ARCHIVED, archivedAt=now`, leaves `deletedAt=null`, and concurrent/repeated attempts return `PROJECT_ALREADY_ARCHIVED`.

Role/access transactions validate every ID before mutation. Foreign/missing IDs use specified `*_NOT_FOUND`; same-tenant inactive membership, wrong scope, duplicate/disallowed keys, or delegated permissions absent from the caller's ORGANIZATION set use `PROJECT_ACCESS_INVALID`/`PROJECT_ROLE_INVALID`. PUT upserts the unique project/membership pair and is idempotent; DELETE `deleteMany` is repeatable `204`. Role deletion checks ProjectAccess and defensive MembershipRole references (`ROLE_IN_USE`); system roles return `ROLE_IS_SYSTEM`.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/projects/projects.module.ts` | Create | Wire feature and static-before-parameter controllers. |
| `src/projects/{projects,project-roles,project-access}.controller.ts` | Create | Project, role, and access HTTP/Swagger contracts. |
| `src/projects/dto/{project,project-role,project-access}.dto.ts` | Create | Whitelisted inputs and safe responses. |
| `src/projects/services/{projects,project-authorization,project-roles,project-access}.service.ts` | Create | Persistence, policy, roles, grants, transactions. |
| `src/access-control/services/organization-permission-resolver.service.ts` | Create | Shared fresh ORGANIZATION resolution. |
| `src/access-control/guards/permission.guard.ts`, `src/access-control/access-control.module.ts` | Modify | Delegate to and export resolver without changing legacy errors. |
| `src/app.module.ts` | Modify | Import Projects module. |
| `src/access-control/{guards,services}/*.spec.ts`, `src/projects/**/*.spec.ts` | Create/Modify | RED-first resolver, policy, DTO/controller/service tests. |
| `test/project-management.e2e-spec.ts` | Create | PostgreSQL contract/security/concurrency suite. |

## Interfaces / Contracts

All Projects controllers use `JwtAuthGuard`; organization-only requirements call the project-domain check rather than `PermissionGuard`. DTOs reject ownership, key changes, settings, archive fields, unsupported statuses, and non-boolean filters. Responses omit settings and normalize tags to `[]`; `AuthError` preserves `{ statusCode, code, message }`.

## Testing Strategy

| Layer | RED-first coverage |
|---|---|
| Unit/controller | Exact predicates/order, union freshness, domain denial code, slug/delegation, immutable/system roles, transition/archive preconditions, P2002, rollback/idempotency, DTO and Swagger metadata. |
| E2E | All 19 scenarios, organization switch/IDOR, project-only authority rejection for administration, archived update rejection, concurrent create/archive, and OpenAPI. Run `npm test`, `npm run test:e2e`, `npm run check`. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED test |
|---|---|---|---|
| HTTP route matching | Applicable | Static `/projects/roles` and nested access routes reach their controllers; malformed UUID params fail validation and never become resource lookups. | E2E proves static-route precedence and malformed-ID `400 VALIDATION_ERROR`. |
| Documentation-like paths | N/A — no file classification/execution | No execution boundary. | None. |
| Git repository selection | N/A — no Git invocation | No repository authority. | None. |
| Commit state | N/A — no commit automation | No index mutation. | None. |
| Push state | N/A — no push automation | No remote resolution. | None. |
| PR commands | N/A — no PR automation | No command composition. | None. |

## Migration / Rollout

No migration required. Rollback removes module/routes and resolver integration; persisted projects remain retained.

## Open Questions

None.
